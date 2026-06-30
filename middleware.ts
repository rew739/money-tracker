import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

// เส้นทางที่ไม่ต้องล็อกอิน
const publicPaths = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  // ถ้าเข้าหน้าสาธารณะแล้วล็อกอินอยู่ → ไปหน้าแรก
  if (publicPaths.includes(pathname) && token) {
    const payload = verifyToken(token);
    if (payload) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // ถ้าเข้าหน้าที่ต้องล็อกอินแต่ยังไม่ล็อกอิน → ไปหน้า login
  if (!publicPaths.includes(pathname) && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
