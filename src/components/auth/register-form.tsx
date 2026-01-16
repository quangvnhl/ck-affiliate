"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Mail, Lock, UserPlus, Check, X, Home } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { registerSchema, type RegisterInput } from "@/lib/z-schema";
import { registerAction } from "@/actions/auth-actions";

// Lấy guest session ID từ localStorage (nếu có)
function getGuestSessionId(): string | undefined {
    if (typeof window === "undefined") return undefined;
    return localStorage.getItem("guestSessionId") || undefined;
}

// Xóa guest session ID sau khi đăng ký thành công
function clearGuestSessionId(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem("guestSessionId");
}

export function RegisterForm() {
    const router = useRouter();
    const [serverError, setServerError] = useState<string | null>(null);
    const [guestSessionId, setGuestSessionId] = useState<string | undefined>();

    // Lấy guest session ID khi component mount (client-side)
    useEffect(() => {
        setGuestSessionId(getGuestSessionId());
    }, []);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<RegisterInput>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            email: "",
            password: "",
            confirmPassword: "",
        },
    });

    // Theo dõi password để hiển thị password strength
    const password = watch("password", "");

    // Kiểm tra các điều kiện của password
    const passwordChecks = {
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasNumber: /[0-9]/.test(password),
    };

    const onSubmit = async (data: RegisterInput) => {
        setServerError(null);

        // Tạo FormData để gửi lên Server Action
        const formData = new FormData();
        formData.append("email", data.email);
        formData.append("password", data.password);
        formData.append("confirmPassword", data.confirmPassword);

        // Gửi kèm guest session ID để merge dữ liệu
        if (guestSessionId) {
            formData.append("guestSessionId", guestSessionId);
        }

        const result = await registerAction(formData);

        if (!result.success) {
            setServerError(result.error || "Đã xảy ra lỗi");
            return;
        }

        // Đăng ký thành công -> xóa guest session và redirect
        clearGuestSessionId();
        router.push("/dashboard");
        router.refresh();
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-lg">
            {/* Header */}
            <div className="mb-8 text-center">
                <div className="flex">
                    <Link href="/" className="flex items-center gap-2 hover:bg-amber-100 rounded-full pr-3">
                        <div className="rounded-full p-2 bg-amber-100">
                            <Home className="h-5 w-5 text-amber-600" />
                        </div>
                        <span className="text-amber-600 text-sm font-medium">Trang chủ</span>
                    </Link>
                </div>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
                    <UserPlus className="h-7 w-7 text-amber-600" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Tạo tài khoản</h1>
                <p className="mt-2 text-sm text-slate-600">
                    Đăng ký để theo dõi hoa hồng và rút tiền về ví.
                </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Server Error */}
                {serverError && (
                    <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
                        {serverError}
                    </div>
                )}

                {/* Email Field */}
                <div className="space-y-2">
                    <label
                        htmlFor="email"
                        className="text-sm font-medium text-slate-700"
                    >
                        Email
                    </label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            className="pl-10"
                            {...register("email")}
                        />
                    </div>
                    {errors.email && (
                        <p className="text-sm text-red-500">{errors.email.message}</p>
                    )}
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                    <label
                        htmlFor="password"
                        className="text-sm font-medium text-slate-700"
                    >
                        Mật khẩu
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            className="pl-10"
                            {...register("password")}
                        />
                    </div>
                    {errors.password && (
                        <p className="text-sm text-red-500">{errors.password.message}</p>
                    )}

                    {/* Password Strength Indicator */}
                    {password && (
                        <div className="mt-2 space-y-1 rounded-lg bg-slate-50 p-3 text-xs">
                            <p className="font-medium text-slate-600 mb-2">Yêu cầu mật khẩu:</p>
                            <div className="flex items-center gap-2">
                                {passwordChecks.minLength ? (
                                    <Check className="h-3.5 w-3.5 text-green-500" />
                                ) : (
                                    <X className="h-3.5 w-3.5 text-slate-400" />
                                )}
                                <span className={passwordChecks.minLength ? "text-green-600" : "text-slate-500"}>
                                    Ít nhất 8 ký tự
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                {passwordChecks.hasUppercase ? (
                                    <Check className="h-3.5 w-3.5 text-green-500" />
                                ) : (
                                    <X className="h-3.5 w-3.5 text-slate-400" />
                                )}
                                <span className={passwordChecks.hasUppercase ? "text-green-600" : "text-slate-500"}>
                                    Ít nhất 1 chữ hoa
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                {passwordChecks.hasNumber ? (
                                    <Check className="h-3.5 w-3.5 text-green-500" />
                                ) : (
                                    <X className="h-3.5 w-3.5 text-slate-400" />
                                )}
                                <span className={passwordChecks.hasNumber ? "text-green-600" : "text-slate-500"}>
                                    Ít nhất 1 số
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-2">
                    <label
                        htmlFor="confirmPassword"
                        className="text-sm font-medium text-slate-700"
                    >
                        Xác nhận mật khẩu
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="••••••••"
                            className="pl-10"
                            {...register("confirmPassword")}
                        />
                    </div>
                    {errors.confirmPassword && (
                        <p className="text-sm text-red-500">
                            {errors.confirmPassword.message}
                        </p>
                    )}
                </div>

                {/* Submit Button */}
                <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Đang tạo tài khoản...
                        </>
                    ) : (
                        "Đăng ký"
                    )}
                </Button>
            </form>

            {/* Footer */}
            <div className="mt-6 text-center text-sm text-slate-600">
                Đã có tài khoản?{" "}
                <Link
                    href="/login"
                    className="font-medium text-amber-600 hover:text-amber-700 hover:underline"
                >
                    Đăng nhập ngay
                </Link>
            </div>
        </div>
    );
}
