import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      const allowedEmails = process.env.ALLOWED_EMAILS?.split(",").map(e => e.trim()) || [];
      if (allowedEmails.length === 0) {
        return true;
      }
      return allowedEmails.includes(user.email || "");
    },
  },
};
