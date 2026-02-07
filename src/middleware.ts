import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // ログイン済みならそのまま通過
  if (token) {
    return NextResponse.next();
  }

  // 未ログインならログインページへリダイレクト
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", request.url);
  return NextResponse.redirect(loginUrl);
}

// 認証が必要なパスを指定（記事制作関連は認証不要）
export const config = {
  matcher: [
    "/admin/:path*",
  ],
};
