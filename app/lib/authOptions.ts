import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";

import User from "@/app/models/User";
import { dbConnect } from "@/app/lib/mongodb";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    CredentialsProvider({
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

          const user = await User.findOne({ email: credentials.email }).lean();

          if (!user) {
            throw new Error("User not found");
          }

          if (!user.password) {
            throw new Error("Password not set (Google user?)");
          }

          const isValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isValid) {
            throw new Error("Invalid password");
          }

          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            sessionVersion: user.sessionVersion ?? 0,
          };
        } catch (err) {
          console.error("❌ AUTH ERROR:", err);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        await dbConnect();

        let dbUser = await User.findOne({ email: user.email });

        if (!dbUser) {
          dbUser = await User.create({
            name: user.name,
            email: user.email,
            image: user.image,
            provider: "google",
            sessionVersion: 0,
          });
        }

        user.id = dbUser._id.toString();
        (user as any).sessionVersion = dbUser.sessionVersion;
      }

      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.sessionVersion = (user as any).sessionVersion ?? 0;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).sessionVersion = token.sessionVersion as number;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};
