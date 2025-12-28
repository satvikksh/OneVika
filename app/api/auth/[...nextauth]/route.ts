export const runtime = "nodejs";

import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import User from "../../../models/User";
import { dbConnect} from "../../../lib/mongodb";

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
  try {
    console.log("🔐 AUTHORIZE CALLED", credentials?.email);

    if (!credentials?.email || !credentials.password) {
      console.log("❌ Missing credentials");
      return null;
    }

    await dbConnect();
    console.log("✅ DB connected");

    const user = await User.findOne({ email: credentials.email }).lean();
    console.log("👤 USER FOUND:", !!user);

    if (!user) return null;
    if (!user.password) {
      console.log("❌ USER HAS NO PASSWORD FIELD");
      return null;
    }

    console.log("🔑 DB PASSWORD:", user.password);

    let isValid = false;

    if (user.password.startsWith("$2")) {
      isValid = await bcrypt.compare(
        credentials.password,
        user.password
      );
      console.log("🔐 BCRYPT MATCH:", isValid);
    } else {
      isValid = credentials.password === user.password;
      console.log("🔐 PLAINTEXT MATCH:", isValid);

      if (isValid) {
        const hashed = await bcrypt.hash(credentials.password, 10);
        await User.updateOne(
          { _id: user._id },
          { password: hashed }
        );
        console.log("🔁 PASSWORD MIGRATED");
      }
    }

    if (!isValid) return null;

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    };
  } catch (err) {
    console.error("🔥 AUTHORIZE ERROR:", err);
    return null;
  }
}

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

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
