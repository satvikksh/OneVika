import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import User from "../models/User";
import bcrypt from "bcryptjs";
import { connectDB } from "../lib/mongodb";
import crypto from "crypto";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },

  providers: [
    CredentialsProvider({
      name: "Credentials",

      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        await connectDB();

        const user = await User.findOne({ email: credentials.email });
        if (!user) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;

        // create sessionId + signature
        const sessionId = crypto.randomBytes(16).toString("hex");
        const signature = crypto
          .createHmac("sha256", process.env.SESSION_SECRET!)
          .update(sessionId)
          .digest("hex");

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          sessionId,
          signature
        };
      }
    })
  ],

 callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.userId = user.id;
      token.sessionId = user.sessionId;
      token.signature = user.signature;
      token.avatar = user.avatar;
    }
    return token;
  },

  async session({ session, token }) {
    session.user.id = token.userId as string;
    session.user.sessionId = token.sessionId as string;
    session.user.signature = token.signature as string;
    session.user.avatar = token.avatar as string;

    return session;
  }
}
};
