import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
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
      // 許可するメールアドレスを環境変数で指定（カンマ区切り）
      const allowedEmails = process.env.ALLOWED_EMAILS?.split(",").map(e => e.trim()) || [];

      // 許可リストが空の場合は全員許可
      if (allowedEmails.length === 0) {
        return true;
      }

      // メールアドレスが許可リストにあるか確認
      return allowedEmails.includes(user.email || "");
    },
  },
});

export { handler as GET, handler as POST };
