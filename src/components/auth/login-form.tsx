"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Mail, Lock, LogIn, Home } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginSchema, type LoginInput } from "@/lib/z-schema";
import { loginAction } from "@/actions/auth-actions";

export function LoginForm() {
    const router = useRouter();
    const [serverError, setServerError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginInput>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const onSubmit = async (data: LoginInput) => {
        setServerError(null);

        // Tạo FormData để gửi lên Server Action
        const formData = new FormData();
        formData.append("email", data.email);
        formData.append("password", data.password);

        const result = await loginAction(formData);

        if (!result.success) {
            setServerError(result.error || "Đã xảy ra lỗi");
            return;
        }

        // Đăng nhập thành công -> redirect về dashboard
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
                    <LogIn className="h-7 w-7 text-amber-600" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Đăng nhập</h1>
                <p className="mt-2 text-sm text-slate-600">
                    Chào mừng bạn quay lại! Hãy đăng nhập để tiếp tục.
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
                            Đang đăng nhập...
                        </>
                    ) : (
                        "Đăng nhập"
                    )}
                </Button>
            </form>

            {/* Footer */}
            <div className="mt-6 text-center text-sm text-slate-600">
                Chưa có tài khoản?{" "}
                <Link
                    href="/register"
                    className="font-medium text-amber-600 hover:text-amber-700 hover:underline"
                >
                    Đăng ký ngay
                </Link>
            </div>
        </div>
    );
}
