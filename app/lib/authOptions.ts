import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";

import User from "@/app/models/User";
import { dbConnect } from "@/app/lib/mongodb";
import { authorizeConfiguredAdmin } from "@/app/lib/adminAuth";

const canonicalAuthUrl =
  process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL;

// NextAuth uses NEXTAUTH_URL to build OAuth callback URLs outside Vercel.
// This app already carries NEXT_PUBLIC_BASE_URL, so use it as a safe fallback
// while still allowing an explicit NEXTAUTH_URL to take precedence.
if (!process.env.NEXTAUTH_URL && canonicalAuthUrl) {
  process.env.NEXTAUTH_URL = canonicalAuthUrl;
}

const googleClientId =
  process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID;
const googleClientSecret =
  process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET;

const providers: NextAuthOptions["providers"] = [];

if (googleClientId && googleClientSecret) {
  providers.push(
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    })
  );
}

providers.push(
  CredentialsProvider({
    id: "admin-credentials",
    name: "admin-credentials",
    credentials: {
      email: { label: "Admin email", type: "email" },
      password: { label: "Password", type: "password" },
    },

    async authorize(credentials) {
      try {
        await dbConnect();
        return await authorizeConfiguredAdmin({
          email: credentials?.email,
          password: credentials?.password,
        });
      } catch (err) {
        console.error("ADMIN AUTH ERROR:", err instanceof Error ? err.message : err);
        throw err;
      }
    },
  })
);

providers.push(
  CredentialsProvider({
    id: "credentials",
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },

    async authorize(credentials) {
      try {
        if (!credentials?.email || !credentials.password) {
          throw new Error("Missing credentials");
        }

        await dbConnect();

        const normalizedEmail = credentials.email.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail }).lean();

        if (!user) {
          throw new Error("User not found");
        }

        if (!user.password) {
          throw new Error("Password not set (Google user?)");
        }

        if (user.accountStatus === "banned") {
          throw new Error("Account is banned");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error("Invalid password");
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.avatar || user.image || "",
          sessionVersion: user.sessionVersion ?? 0,
          role: user.role || "USER",
        };
      } catch (err) {
        console.error("AUTH ERROR:", err);
        return null;
      }
    },
  })
);

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  debug: process.env.NODE_ENV === "development",

  providers,

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        await dbConnect();

        if (!user.email) return false;

        const normalizedEmail = user.email.trim().toLowerCase();

        if (
          (profile as { email_verified?: boolean } | undefined)
            ?.email_verified === false
        ) {
          return false;
        }

        let dbUser = await User.findOne({ email: normalizedEmail });

        if (!dbUser) {
          try {
            dbUser = await User.create({
              name: user.name || normalizedEmail.split("@")[0],
              email: normalizedEmail,
              image: user.image,
              avatar: user.image,
              provider: "google",
              sessionVersion: 0,
            });
          } catch (error: unknown) {
            // If two callbacks arrive together, the unique email index may win
            // the race for one request. Reuse that user instead of surfacing a
            // false "duplicate account" failure.
            if (
              typeof error === "object" &&
              error !== null &&
              "code" in error &&
              error.code === 11000
            ) {
              dbUser = await User.findOne({ email: normalizedEmail });
            } else {
              throw error;
            }
          }
        } else {
          const updates: Record<string, unknown> = {};

          if (user.name && user.name !== dbUser.name) {
            updates.name = user.name;
          }

          if (user.image) {
            if (!dbUser.image) updates.image = user.image;
            if (!dbUser.avatar) updates.avatar = user.image;
          }

          if (Object.keys(updates).length > 0) {
            await User.updateOne({ _id: dbUser._id }, { $set: updates });
            dbUser = await User.findById(dbUser._id);
          }
        }

        if (!dbUser) return false;

        if (dbUser.accountStatus === "banned") {
          return false;
        }

        user.id = dbUser._id.toString();
        user.name = dbUser.name;
        user.email = normalizedEmail;
        user.image = dbUser.avatar || dbUser.image || user.image;
        user.sessionVersion = dbUser.sessionVersion ?? 0;
        user.role = dbUser.role || "USER";
      }

      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image || token.picture;
        token.sessionVersion = user.sessionVersion ?? 0;
        token.role = user.role ?? "USER";
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = (token.name as string) || session.user.name;
        session.user.email = (token.email as string) || session.user.email;
        const image = (token.picture as string) || "";
        session.user.avatar = image || session.user.avatar || "";
        session.user.image = image || session.user.image || null;
        session.user.sessionVersion = token.sessionVersion as number;
        session.user.role = (token.role as "USER" | "ADMIN") || "USER";
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};
