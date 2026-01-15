import type { NextAuthConfig } from "next-auth";

// Cấu hình NextAuth base - Dùng được trong Edge Runtime (middleware)
// KHÔNG import database hay Node.js modules ở đây
export const authConfig: NextAuthConfig = {
  // Sử dụng JWT strategy (stateless, phù hợp serverless)
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 ngày
  },

  // Trang custom cho auth
  pages: {
    signIn: "/login",
    // signOut: "/logout",
    // error: "/auth/error",
  },

  // Callbacks để inject thêm data vào token và session
  callbacks: {
    // Callback JWT: Thêm id và role vào token khi đăng nhập
    async jwt({ token, user }) {
      // user chỉ có khi đăng nhập lần đầu
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },

    // Callback Session: Expose id và role ra session object
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "admin" | "user";
      }
      return session;
    },

    // Callback Authorized: Kiểm tra quyền truy cập routes (chạy trong middleware - Edge)
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isOnWallet = nextUrl.pathname.startsWith("/wallet");
      const isOnLinks = nextUrl.pathname.startsWith("/links");
      const isOnAdmin = nextUrl.pathname.startsWith("/admin");
      const isOnAuthPages =
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/register");

      // Các route cần đăng nhập
      const isProtectedRoute = isOnDashboard || isOnWallet || isOnLinks;

      // Nếu đang ở trang admin
      if (isOnAdmin) {
        if (!isLoggedIn) return false; // Redirect to login
        // Kiểm tra role admin
        if (auth?.user?.role !== "admin") {
          // Redirect về dashboard nếu không phải admin
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
        return true;
      }

      // Nếu đang ở trang protected (dashboard, wallet, links)
      if (isProtectedRoute) {
        if (isLoggedIn) return true;
        return false; // Redirect to login
      }

      // Nếu đã đăng nhập mà vào trang login/register -> redirect về dashboard
      if (isOnAuthPages && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      // Các trang public khác -> cho phép truy cập
      return true;
    },
  },

  // Providers sẽ được thêm trong auth.ts (không thể dùng ở Edge)
  providers: [],
};
