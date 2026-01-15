import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "./src/auth.config";

// Constants
const GUEST_SESSION_COOKIE = "guest_session_id";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 ngày (seconds)

// NextAuth middleware
const { auth } = NextAuth(authConfig);

/**
 * Sinh UUID v4 đơn giản (Edge-compatible, không dùng crypto.randomUUID)
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
function generateGuestId(): string {
  const hex = "0123456789abcdef";
  let id = "";

  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      id += "-";
    } else if (i === 14) {
      id += "4"; // Version 4
    } else if (i === 19) {
      id += hex[(Math.random() * 4) | 8]; // Variant
    } else {
      id += hex[(Math.random() * 16) | 0];
    }
  }

  return id;
}

/**
 * Middleware chính - Xử lý:
 * 1. Auth (NextAuth) - Kiểm tra quyền truy cập routes
 * 2. Guest Tracking - Sinh và lưu guest_session_id cho khách vãng lai
 */
export default auth(async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // === GUEST TRACKING LOGIC ===
  // Chỉ xử lý khi user chưa đăng nhập
  // @ts-expect-error - auth property được inject bởi NextAuth
  const session = request.auth;
  const isLoggedIn = !!session?.user;

  // Kiểm tra đã có guest_session_id chưa
  const existingGuestId = request.cookies.get(GUEST_SESSION_COOKIE)?.value;

  if (!isLoggedIn && !existingGuestId) {
    // User chưa login và chưa có guest ID -> Tạo mới
    const newGuestId = generateGuestId();

    // Set cookie guest_session_id với thời hạn 30 ngày
    response.cookies.set(GUEST_SESSION_COOKIE, newGuestId, {
      httpOnly: false, // Cho phép client-side access (để gửi lên Server Actions)
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    console.log(`[Middleware] Created new guest session: ${newGuestId}`);
  }

  return response;
});

// Cấu hình routes mà middleware sẽ chạy
export const config = {
  // Match tất cả routes trừ static files, images, và api routes không cần auth
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes không cần auth (webhooks, cron...)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
