import { WalletDashboard } from "@/components/features/wallet-dashboard";

// Trang Ví tiền của User
export default function WalletPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Ví của tôi</h1>
        <p className="mt-1 text-slate-600">
          Quản lý số dư và yêu cầu rút tiền về tài khoản ngân hàng
        </p>
      </div>

      <WalletDashboard />
    </div>
  );
}
