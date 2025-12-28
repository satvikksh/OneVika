import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import User from "../models/User";
import { dbConnect } from "../lib/mongodb";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },

  providers: [
    CredentialsProvider({
      name: "credentials",

      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        await dbConnect();

        const user = await User.findOne({ email: credentials.email });
        if (!user) {
          // ❌ Returning null → clean 401
          return null;
        }

        const dbPassword = user.password;

        let isValid = false;

        // ✅ bcrypt password
        if (dbPassword.startsWith("$2")) {
          isValid = await bcrypt.compare(credentials.password, dbPassword);
        }
        // ✅ plaintext password (auto-migrate)
        else {
          isValid = credentials.password === dbPassword;

          if (isValid) {
            user.password = await bcrypt.hash(credentials.password, 10);
            await user.save();
            console.log("🔁 Password migrated:", user.email);
          }
        }

        if (!isValid) {
          return null;
        }

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
      if (user) {
        token.id = user.id;
      }
      return token;
    },

    async session({ session, token }) {
      if (token?.id) {
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