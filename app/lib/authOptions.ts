import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import User from "@/app/models/User";
import { dbConnect } from "@/app/lib/mongodb";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },

  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        await dbConnect(); // ✅ runtime only

        const user = await User.findOne({ email: credentials.email }).lean();
        if (!user || !user.password) return null;

        let isValid = false;

        if (user.password.startsWith("$2")) {
          isValid = await bcrypt.compare(
            credentials.password,
            user.password
          );
        } else {
          isValid = credentials.password === user.password;

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
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },

    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};
