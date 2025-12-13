import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import User from "../models/User";
import { connectDB } from "../lib/mongodb";

export const authOptions = {
  session: {
    strategy: "jwt",
  },

  providers: [
    CredentialsProvider({
      name: "Credentials",

      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        await connectDB();

        const user = await User.findOne({ email: credentials!.email });
        if (!user) throw new Error("User not found");

        const valid = await compare(credentials!.password, user.password);
        if (!valid) throw new Error("Incorrect password");

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          avatar: user.avatar || null,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }: { token: any; user?: any }) {
      if (user) {
        token.id = user.id;
        token.avatar = user.avatar;
      }
      return token;
    },

    async session({ session, token }: { session: any; token: any }) {
      session.user.id = token.id;
      session.user.avatar = token.avatar;
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};
