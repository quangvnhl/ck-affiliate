import { BankSettingsForm } from "@/components/features/bank-settings-form";

// Trang Cài đặt - Thông tin ngân hàng
export default function SettingsPage() {
    return (
        <div className="max-w-2xl">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Cài đặt</h1>
                <p className="mt-1 text-slate-600">
                    Quản lý thông tin tài khoản và thanh toán
                </p>
            </div>

            <BankSettingsForm />
        </div>
    );
}
