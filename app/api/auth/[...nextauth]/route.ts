import NextAuth, { type AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import User from "../../../models/User";
import { connectDB } from "../../../lib/mongodb";

export const authOptions: AuthOptions = {
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",

      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        await connectDB();

        if (!credentials?.email || !credentials?.password) return null;

        const user = await User.findOne({ email: credentials.email }).lean();

        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.password);

        if (!valid) return null;

        // return a SAFE user object
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          avatar: user.avatar || null,
          sessionId: crypto.randomUUID(),
          signature: crypto.randomUUID(),
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
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
