import NextAuth, { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {

  interface User extends DefaultUser {
    sessionId?: string;
    signature?: string;
    avatar?: string;
  }

  interface Session {
    user: {
      id: string;
      sessionId?: string;
      signature?: string;
      avatar?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    sessionId?: string;
    signature?: string;
    avatar?: string;
  }
}
