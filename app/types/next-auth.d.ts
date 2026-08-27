import { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Extended User type (DB + OAuth)
   */
  interface User {
    id: string;
    email?: string | null;
    name?: string | null;

    // 🔐 security
    sessionVersion?: number;

    // 🔑 session tracking
    sessionId?: string;
    signature?: string;

    // 🖼️ profile
    avatar?: string;
    image?: string | null;
    role?: "USER" | "ADMIN";
  }

  /**
   * Extended Session type (client-side)
   */
  interface Session {
    user: {
      id: string;
      sessionVersion: number;

      sessionId?: string;
      signature?: string;

      avatar?: string;
      image?: string | null;
      role?: "USER" | "ADMIN";
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  /**
   * Extended JWT token
   */
  interface JWT {
    id: string;
    sessionVersion: number;

    sessionId?: string;
    signature?: string;

    avatar?: string;
    role?: "USER" | "ADMIN";
  }
}
