import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";

import User from "@/app/models/User";
import { dbConnect } from "@/app/lib/mongodb";

const googleClientId =
  process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID;
const googleClientSecret =
  process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET;

const providers: NextAuthOptions["providers"] = [];

if (googleClientId && googleClientSecret) {
  providers.push(
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    })
  );
}

providers.push(
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

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error("Invalid password");
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.avatar || user.image || "",
          sessionVersion: user.sessionVersion ?? 0,
        };
      } catch (err) {
        console.error("AUTH ERROR:", err);
        return null;
      }
    },
  })
);

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  debug: process.env.NODE_ENV === "development",

  providers,

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        await dbConnect();

        if (!user.email) return false;

        let dbUser = await User.findOne({ email: user.email });

        if (!dbUser) {
          dbUser = await User.create({
            name: user.name,
            email: user.email,
            image: user.image,
            avatar: user.image,
            provider: "google",
            sessionVersion: 0,
          });
        } else {
          const updates: Record<string, unknown> = {};

          if (user.name && user.name !== dbUser.name) {
            updates.name = user.name;
          }

          if (user.image) {
            if (!dbUser.image) updates.image = user.image;
            if (!dbUser.avatar) updates.avatar = user.image;
          }

          if (dbUser.provider !== "google") {
            updates.provider = "google";
          }

          if (Object.keys(updates).length > 0) {
            await User.updateOne({ _id: dbUser._id }, { $set: updates });
            dbUser = await User.findById(dbUser._id);
          }
        }

        if (!dbUser) return false;

        user.id = dbUser._id.toString();
        user.name = dbUser.name;
        user.email = dbUser.email;
        user.image = dbUser.avatar || dbUser.image || user.image;
        (user as any).sessionVersion = dbUser.sessionVersion ?? 0;
      }

      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.picture = (user as any).image || token.picture;
        token.sessionVersion = (user as any).sessionVersion ?? 0;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = (token.name as string) || session.user.name;
        session.user.email = (token.email as string) || session.user.email;
        (session.user as any).avatar =
          (token.picture as string) || (session.user as any).avatar || "";
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
