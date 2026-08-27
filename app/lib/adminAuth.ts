import bcrypt from "bcryptjs";
import crypto from "crypto";

import User from "@/app/models/User";

type AdminDebugContext = {
  adminEmailConfigured: boolean;
  adminPasswordConfigured: boolean;
  receivedAdminEmail?: string;
  normalizedAdminEmail?: string;
  emailMatchesAdminEmail?: boolean;
  adminAccountExists?: boolean;
  adminRole?: string;
};

function adminConfig() {
  return {
    email: process.env.ADMIN_EMAIL?.trim().toLowerCase() || "",
    password: process.env.ADMIN_PASSWORD || "",
  };
}

function logAdminDebug(context: AdminDebugContext) {
  console.log("[ADMIN AUTH DEBUG]", {
    adminEmailConfigured: context.adminEmailConfigured,
    adminPasswordConfigured: context.adminPasswordConfigured,
    receivedAdminEmail: context.receivedAdminEmail,
    normalizedAdminEmail: context.normalizedAdminEmail,
    emailMatchesAdminEmail: context.emailMatchesAdminEmail,
    adminAccountExists: context.adminAccountExists,
    adminRole: context.adminRole,
  });
}

function secureCompare(value: string, expected: string) {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);

  if (valueBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(valueBuffer, expectedBuffer);
}

export async function ensureConfiguredAdminAccount() {
  const { email, password } = adminConfig();

  if (!email || !password) {
    logAdminDebug({
      adminEmailConfigured: Boolean(email),
      adminPasswordConfigured: Boolean(password),
    });
    throw new Error("Admin authentication is not configured");
  }

  const existingAdmin = await User.findOne({ email });

  if (existingAdmin) {
    logAdminDebug({
      adminEmailConfigured: true,
      adminPasswordConfigured: true,
      adminAccountExists: true,
      adminRole: existingAdmin.role || "USER",
    });

    if (existingAdmin.role !== "ADMIN") {
      existingAdmin.role = "ADMIN";
      await existingAdmin.save();
    }

    return existingAdmin;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const createdAdmin = await User.create({
    name: "OrbitByte Admin",
    email,
    password: hashedPassword,
    provider: "credentials",
    role: "ADMIN",
    sessionVersion: 0,
  });

  logAdminDebug({
    adminEmailConfigured: true,
    adminPasswordConfigured: true,
    adminAccountExists: true,
    adminRole: createdAdmin.role,
  });

  return createdAdmin;
}

export async function authorizeConfiguredAdmin(credentials?: {
  email?: string;
  password?: string;
}) {
  const { email, password } = adminConfig();
  const receivedAdminEmail = credentials?.email || "";
  const requestedEmail = receivedAdminEmail.trim().toLowerCase();
  const requestedPassword = credentials?.password || "";
  const emailMatchesAdminEmail = Boolean(requestedEmail && requestedEmail === email);

  if (!email || !password) {
    logAdminDebug({
      adminEmailConfigured: Boolean(email),
      adminPasswordConfigured: Boolean(password),
      receivedAdminEmail,
      normalizedAdminEmail: requestedEmail,
      emailMatchesAdminEmail: false,
    });
    throw new Error("Admin authentication is not configured");
  }

  const existingAdmin = await User.findOne({ email }).select(
    "_id name email password avatar image sessionVersion role"
  );

  logAdminDebug({
    adminEmailConfigured: true,
    adminPasswordConfigured: true,
    receivedAdminEmail,
    normalizedAdminEmail: requestedEmail,
    emailMatchesAdminEmail,
    adminAccountExists: Boolean(existingAdmin),
    adminRole: existingAdmin?.role || "NOT_FOUND",
  });

  if (!requestedEmail || !requestedPassword) {
    throw new Error("Invalid admin credentials");
  }

  if (!emailMatchesAdminEmail) {
    const attemptedUser = requestedEmail
      ? await User.findOne({ email: requestedEmail }).select("role")
      : null;

    if (attemptedUser && attemptedUser.role !== "ADMIN") {
      throw new Error("Admin access required");
    }

    throw new Error("Invalid admin credentials");
  }

  const storedPasswordMatches = existingAdmin?.password
    ? await bcrypt.compare(requestedPassword, existingAdmin.password)
    : false;
  const configuredPasswordMatches = secureCompare(requestedPassword, password);
  const passwordMatches = storedPasswordMatches || configuredPasswordMatches;

  if (!passwordMatches) {
    throw new Error("Invalid admin credentials");
  }

  const admin = await ensureConfiguredAdminAccount();
  if (!storedPasswordMatches) {
    admin.password = await bcrypt.hash(password, 10);
    await admin.save();
  }
  if (admin.role !== "ADMIN") {
    throw new Error("Admin access required");
  }

  return {
    id: admin._id.toString(),
    name: admin.name,
    email: admin.email,
    image: admin.avatar || admin.image || "",
    sessionVersion: admin.sessionVersion ?? 0,
    role: "ADMIN" as const,
  };
}
