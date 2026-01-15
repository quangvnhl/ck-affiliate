import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { authConfig } from "@/auth.config";
import { db } from "@/db";
import { users } from "@/db/schema";
import { loginSchema } from "@/lib/z-schema";

// Export các handlers và utilities từ NextAuth
// Thêm Credentials provider với logic authorize (chỉ chạy ở Node.js runtime)
export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Validate input với Zod
        const validatedFields = loginSchema.safeParse(credentials);

        if (!validatedFields.success) {
          return null;
        }

        const { email, password } = validatedFields.data;

        try {
          // Tìm user theo email
          const user = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          if (user.length === 0) {
            // User không tồn tại
            return null;
          }

          const foundUser = user[0];

          // Kiểm tra user có bị banned không
          if (foundUser.status === "banned") {
            // Tài khoản bị khóa
            return null;
          }

          // Kiểm tra password
          if (!foundUser.passwordHash) {
            return null;
          }

          const passwordMatch = await bcrypt.compare(
            password,
            foundUser.passwordHash
          );

          if (!passwordMatch) {
            return null;
          }

          // Trả về user object (sẽ được truyền vào jwt callback)
          return {
            id: foundUser.id,
            email: foundUser.email,
            role: foundUser.role as "admin" | "user",
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
});
