"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Building2, CreditCard, User, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { bankInfoSchema, type BankInfoInput } from "@/lib/z-schema";
import { updateBankInfoAction, getCurrentUserProfile } from "@/actions/user-actions";

// Danh sách ngân hàng phổ biến
const POPULAR_BANKS = [
    "Vietcombank",
    "BIDV",
    "Agribank",
    "Techcombank",
    "TPBank",
    "MBBank",
    "VPBank",
    "ACB",
    "Sacombank",
    "VietinBank",
    "HDBank",
    "OCB",
    "MSB",
    "SHB",
    "Eximbank",
];

export function BankSettingsForm() {
    const [serverError, setServerError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<BankInfoInput>({
        resolver: zodResolver(bankInfoSchema),
        defaultValues: {
            bankName: "",
            bankAccountNumber: "",
            bankAccountHolder: "",
        },
    });

    // Load thông tin ngân hàng hiện tại
    useEffect(() => {
        async function loadUserProfile() {
            const result = await getCurrentUserProfile();
            if (result.success && result.data) {
                const { bankName, bankAccountNumber, bankAccountHolder } = result.data;
                if (bankName) setValue("bankName", bankName);
                if (bankAccountNumber) setValue("bankAccountNumber", bankAccountNumber);
                if (bankAccountHolder) setValue("bankAccountHolder", bankAccountHolder);
            }
            setIsLoading(false);
        }
        loadUserProfile();
    }, [setValue]);

    const onSubmit = async (data: BankInfoInput) => {
        setServerError(null);
        setSuccessMessage(null);

        const formData = new FormData();
        formData.append("bankName", data.bankName);
        formData.append("bankAccountNumber", data.bankAccountNumber);
        formData.append("bankAccountHolder", data.bankAccountHolder);

        const result = await updateBankInfoAction(formData);

        if (!result.success) {
            setServerError(result.error || "Đã xảy ra lỗi");
            return;
        }

        setSuccessMessage("Cập nhật thông tin ngân hàng thành công!");
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900">
                    Thông tin thanh toán
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                    Cập nhật thông tin ngân hàng để nhận tiền cashback
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Server Messages */}
                {serverError && (
                    <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
                        {serverError}
                    </div>
                )}
                {successMessage && (
                    <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-600 border border-green-200">
                        <Check className="h-4 w-4" />
                        {successMessage}
                    </div>
                )}

                {/* Bank Name Select */}
                <div className="space-y-2">
                    <label
                        htmlFor="bankName"
                        className="text-sm font-medium text-slate-700"
                    >
                        Ngân hàng
                    </label>
                    <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <select
                            id="bankName"
                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white pl-10 pr-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                            {...register("bankName")}
                        >
                            <option value="">Chọn ngân hàng</option>
                            {POPULAR_BANKS.map((bank) => (
                                <option key={bank} value={bank}>
                                    {bank}
                                </option>
                            ))}
                        </select>
                    </div>
                    {errors.bankName && (
                        <p className="text-sm text-red-500">{errors.bankName.message}</p>
                    )}
                </div>

                {/* Account Number */}
                <div className="space-y-2">
                    <label
                        htmlFor="bankAccountNumber"
                        className="text-sm font-medium text-slate-700"
                    >
                        Số tài khoản
                    </label>
                    <div className="relative">
                        <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            id="bankAccountNumber"
                            type="text"
                            inputMode="numeric"
                            placeholder="Nhập số tài khoản"
                            className="pl-10"
                            {...register("bankAccountNumber")}
                        />
                    </div>
                    {errors.bankAccountNumber && (
                        <p className="text-sm text-red-500">
                            {errors.bankAccountNumber.message}
                        </p>
                    )}
                </div>

                {/* Account Holder */}
                <div className="space-y-2">
                    <label
                        htmlFor="bankAccountHolder"
                        className="text-sm font-medium text-slate-700"
                    >
                        Tên chủ tài khoản
                    </label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            id="bankAccountHolder"
                            type="text"
                            placeholder="NGUYEN VAN A"
                            className="pl-10 uppercase"
                            {...register("bankAccountHolder")}
                        />
                    </div>
                    <p className="text-xs text-slate-500">
                        Viết in hoa không dấu, đúng với tên trên tài khoản ngân hàng
                    </p>
                    {errors.bankAccountHolder && (
                        <p className="text-sm text-red-500">
                            {errors.bankAccountHolder.message}
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
                            Đang lưu...
                        </>
                    ) : (
                        "Lưu thông tin"
                    )}
                </Button>
            </form>
        </div>
    );
}
