"use server";

import { eq, isNull, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";

import { db } from "@/db";
import { users, affiliateLinks, transactions } from "@/db/schema";
import { signIn } from "@/auth";
import { registerSchema, loginSchema } from "@/lib/z-schema";
import type { Result } from "@/types";

// ============================================
// REGISTER ACTION
// ============================================

interface RegisterResult {
  userId: string;
  email: string;
  mergedLinksCount: number;
}

export async function registerAction(
  formData: FormData
): Promise<Result<RegisterResult>> {
  try {
    // 1. Parse và validate input
    const rawData = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      confirmPassword: formData.get("confirmPassword") as string,
      guestSessionId: formData.get("guestSessionId") as string | undefined,
    };

    const validatedFields = registerSchema.safeParse(rawData);

    if (!validatedFields.success) {
      const errors = validatedFields.error.flatten().fieldErrors;
      const firstError = Object.values(errors)[0]?.[0] || "Dữ liệu không hợp lệ";
      return { success: false, error: firstError };
    }

    const { email, password, guestSessionId } = validatedFields.data;

    // 2. Kiểm tra email đã tồn tại chưa
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return { success: false, error: "Email này đã được sử dụng" };
    }

    // 3. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Insert user mới
    const newUser = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        role: "user",
        status: "active",
      })
      .returning({ id: users.id, email: users.email });

    if (newUser.length === 0) {
      return { success: false, error: "Không thể tạo tài khoản" };
    }

    const createdUser = newUser[0];
    let mergedLinksCount = 0;

    // 5. Guest Conversion Logic - Merge dữ liệu từ guest sang user
    if (guestSessionId) {
      // Cập nhật affiliate_links: gán user_id cho các link của guest
      const updatedLinks = await db
        .update(affiliateLinks)
        .set({ userId: createdUser.id })
        .where(
          and(
            eq(affiliateLinks.guestSessionId, guestSessionId),
            isNull(affiliateLinks.userId)
          )
        )
        .returning({ id: affiliateLinks.id });

      mergedLinksCount = updatedLinks.length;

      // Cập nhật transactions (nếu có) - thông thường guest chưa có transaction
      // nhưng để đề phòng trường hợp webhook trả về trước khi guest đăng ký
      await db
        .update(transactions)
        .set({ userId: createdUser.id })
        .where(
          and(
            // Giả sử có trường guestSessionId trong transactions (cần thêm nếu cần)
            // Hiện tại schema chưa có, nên comment lại
            // eq(transactions.guestSessionId, guestSessionId),
            isNull(transactions.userId)
          )
        );

      console.log(
        `[Guest Conversion] User ${createdUser.email} - Merged ${mergedLinksCount} links from guest ${guestSessionId}`
      );
    }

    // 6. Tự động đăng nhập sau khi đăng ký thành công
    try {
      await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
    } catch (error) {
      // Bỏ qua lỗi đăng nhập tự động, user vẫn đăng ký thành công
      console.error("Auto login after register failed:", error);
    }

    return {
      success: true,
      data: {
        userId: createdUser.id,
        email: createdUser.email!,
        mergedLinksCount,
      },
    };
  } catch (error) {
    console.error("Register error:", error);
    return { success: false, error: "Đã xảy ra lỗi, vui lòng thử lại" };
  }
}

// ============================================
// LOGIN ACTION
// ============================================

export async function loginAction(
  formData: FormData
): Promise<Result<{ success: boolean }>> {
  try {
    // 1. Parse và validate input
    const rawData = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    };

    const validatedFields = loginSchema.safeParse(rawData);

    if (!validatedFields.success) {
      const errors = validatedFields.error.flatten().fieldErrors;
      const firstError = Object.values(errors)[0]?.[0] || "Dữ liệu không hợp lệ";
      return { success: false, error: firstError };
    }

    const { email, password } = validatedFields.data;

    // 2. Kiểm tra user có bị banned không (trước khi authenticate)
    const existingUser = await db
      .select({ status: users.status })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0 && existingUser[0].status === "banned") {
      return { 
        success: false, 
        error: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin." 
      };
    }

    // 3. Thực hiện đăng nhập với NextAuth
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    return { success: true, data: { success: true } };
  } catch (error) {
    // Xử lý các loại lỗi từ NextAuth
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { success: false, error: "Email hoặc mật khẩu không đúng" };
        default:
          return { success: false, error: "Đã xảy ra lỗi xác thực" };
      }
    }

    // Lỗi NEXT_REDIRECT không phải là lỗi thực sự
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
      return { success: true, data: { success: true } };
    }

    console.error("Login error:", error);
    return { success: false, error: "Đã xảy ra lỗi, vui lòng thử lại" };
  }
}

// ============================================
// LOGOUT ACTION
// ============================================

export async function logoutAction(): Promise<void> {
  const { signOut } = await import("@/auth");
  await signOut({ redirect: false });
}

// ============================================
// GET CURRENT USER ACTION
// ============================================

export async function getCurrentUser() {
  const { auth } = await import("@/auth");
  const session = await auth();
  
  if (!session?.user) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role,
  };
}
