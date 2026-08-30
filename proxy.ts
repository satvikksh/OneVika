import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { MongoClient, ObjectId } from "mongodb";
import {
  ACCOUNT_SUSPENDED_MESSAGE,
  isAccountLocked,
  REVIEW_EMAIL,
} from "@/app/lib/account-policy";

const mongoUri = process.env.MONGODB_URI;
const secret = process.env.NEXTAUTH_SECRET;

const PUBLIC_PATHS = new Set([
  "/",
  "/about",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-otp",
  "/admin/login",
  "/account-suspended",
]);

let cachedClient: MongoClient | null = null;
function getClient() {
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not defined");
  }
  if (!cachedClient) {
    cachedClient = new MongoClient(mongoUri, {
      serverSelectionTimeoutMS: 3000,
    });
  }
  return cachedClient;
}

async function getAccountStatus(userId: string): Promise<string> {
  const client = getClient();
  await client.connect();
  const doc = (await client
    .db()
    .collection("users")
    .findOne(
      { _id: new ObjectId(userId) },
      { projection: { accountStatus: 1 } }
    )) as { accountStatus?: string } | null;
  return doc?.accountStatus ?? "active";
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // The auth flow (login, OTP, logout, /session reads) must always work, even
  // for suspended/banned accounts so they can sign out and request a review.
  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  const token = await getToken({ req, secret }).catch(() => null);
  const role = token?.role;

  // Suspended/banned accounts are locked out of every page and protected API.
  // This runs server-side on every request so direct URLs and direct API calls
  // cannot bypass the suspension.
  if (token?.id && role !== "ADMIN") {
    let accountStatus: string | null = null;
    try {
      accountStatus = await getAccountStatus(String(token.id));
    } catch (error) {
      // A failed security check must never take the whole app down.
      console.error("PROXY ACCOUNT STATUS CHECK FAILED:", error);
    }

    if (accountStatus && isAccountLocked(accountStatus)) {
      const errorMessage = `${ACCOUNT_SUSPENDED_MESSAGE} To request a review, contact ${REVIEW_EMAIL}.`;

      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: errorMessage }, { status: 403 });
      }

      if (pathname === "/account-suspended") {
        return NextResponse.next();
      }

      const lockedUrl = req.nextUrl.clone();
      lockedUrl.pathname = "/account-suspended";
      lockedUrl.search = "";
      lockedUrl.hash = "";
      return NextResponse.redirect(lockedUrl);
    }
  }

  // API routes authenticate on their own — only the suspension check above
  // applies here. Auth + admin endpoints and public webhooks pass through.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Public pages are visible to everyone (guests and members alike).
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  // Admin pages require the ADMIN role.
  if (pathname.startsWith("/admin")) {
    if (role !== "ADMIN") {
      const adminUrl = new URL("/admin/login", req.url);
      return NextResponse.redirect(adminUrl);
    }
    return NextResponse.next();
  }

  // Everything else requires a logged-in user.
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|firebase-messaging-sw.js|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|css|js|map|txt|xml|json|woff|woff2)$).*)",
  ],
};