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
    // 🔐 EMAIL / PASSWORD LOGIN (UNCHANGED)
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        await dbConnect();

        const user = await User.findOne({ email: credentials.email }).lean();
        if (!user || !user.password) return null;

        let isValid = false;

        // bcrypt password
        if (user.password.startsWith("$2")) {
          isValid = await bcrypt.compare(
            credentials.password,
            user.password
          );
        } else {
          // legacy plain-text password
          isValid = credentials.password === user.password;

          // 🔁 auto-migrate to bcrypt
          if (isValid) {
            const hashed = await bcrypt.hash(credentials.password, 10);
            await User.updateOne(
              { _id: user._id },
              { password: hashed }
            );
          }
        }

        if (!isValid) return null;

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
        };
      },
    }),

    // 🔑 GOOGLE LOGIN (ADDED)
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    // 🔹 GOOGLE USER SAVE (NO DATA LOSS)
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        await dbConnect();

        const existingUser = await User.findOne({
          email: user.email,
        });

        if (!existingUser) {
          await User.create({
            name: user.name,
            email: user.email,
            image: user.image,
            provider: "google",
          });
        }
      }
      return true;
    },

    // 🔹 JWT (UNCHANGED + SAFE)
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },

    // 🔹 SESSION (UNCHANGED + SAFE)
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};
