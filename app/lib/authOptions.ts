import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";

import clientPromise from "@/app/lib/mongodb-adapter";

import User from "@/app/models/User";
import { dbConnect } from "@/app/lib/mongodb";

export const authOptions: NextAuthOptions = {
    adapter: MongoDBAdapter(clientPromise),
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24, // 1 day
  },

  jwt: {
    maxAge: 60 * 60 * 24,
  },

  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },

  providers: [
    // ✅ GOOGLE
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // ✅ CREDENTIALS
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        await dbConnect();

        const user = await User.findOne({ email: credentials.email });
        if (!user || !user.password) return null;

        const isValid = user.password.startsWith("$2")
          ? await bcrypt.compare(credentials.password, user.password)
          : credentials.password === user.password;

        if (!isValid) return null;

        // ✅ ensure defaults exist
        if (user.sessionVersion === undefined) {
          user.sessionVersion = 0;
          user.provider = "credentials";
          await user.save();
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],

  // 🔐 GOOGLE USER CREATION
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        await dbConnect();

        let dbUser = await User.findOne({ email: user.email });

        if (!dbUser) {
          dbUser = await User.create({
            name: user.name || "Google User",
            email: user.email,
            image: user.image,
            provider: "google",
            sessionVersion: 0, // 🔐 IMPORTANT
          });
        }

        user.id = dbUser._id.toString();
        user.sessionVersion = dbUser.sessionVersion;
      }

      return true;
    },

    // 🔑 JWT — ALWAYS TRUST DATABASE VERSION
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.sessionVersion = user.sessionVersion ?? 0;
      } else if (token.id) {
        // 🔥 re-check DB every request (prevents hijacking)
        await dbConnect();
        const dbUser = await User.findById(token.id).select("sessionVersion");
        token.sessionVersion = dbUser?.sessionVersion ?? 0;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.sessionVersion = token.sessionVersion as number;
      }
      return session;
    },
  },

  // 🔥 SESSION INVALIDATION ON LOGOUT
  events: {
    async signOut({ token }) {
      if (!token?.id) return;

      await dbConnect();
      await User.updateOne(
        { _id: token.id },
        { $inc: { sessionVersion: 1 } }
      );
    },
  },

  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};
