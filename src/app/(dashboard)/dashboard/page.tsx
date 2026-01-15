import Link from "next/link";
import { Link2, Wallet, TrendingUp, ArrowRight } from "lucide-react";

import { auth } from "@/auth";
import { formatCurrency } from "@/lib/utils";

// Trang Dashboard chính của User
export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold">
          Chào mừng trở lại! 👋
        </h1>
        <p className="mt-2 text-amber-100">
          Bắt đầu tạo link affiliate và kiếm tiền từ Shopee & TikTok ngay hôm nay.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-amber-600 hover:bg-amber-50 transition-colors"
        >
          Tạo link ngay
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Số dư ví"
          value={formatCurrency(0)}
          icon={Wallet}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          href="/wallet"
        />
        <StatCard
          title="Link đã tạo"
          value="0"
          subtitle="link"
          icon={Link2}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          href="/links"
        />
        <StatCard
          title="Tổng click"
          value="0"
          subtitle="click"
          icon={TrendingUp}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
          href="/links"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <QuickActionCard
          title="Tạo link Shopee"
          description="Dán link sản phẩm Shopee và nhận link affiliate ngay"
          href="/"
          color="orange"
        />
        <QuickActionCard
          title="Tạo link TikTok"
          description="Dán link sản phẩm TikTok Shop và bắt đầu kiếm tiền"
          href="/"
          color="slate"
        />
      </div>

      {/* Getting Started Guide */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Hướng dẫn bắt đầu
        </h2>
        <div className="mt-4 space-y-4">
          <Step
            number={1}
            title="Tạo link affiliate"
            description="Dán link sản phẩm từ Shopee hoặc TikTok Shop vào ô tạo link"
            done={false}
          />
          <Step
            number={2}
            title="Chia sẻ link"
            description="Chia sẻ link affiliate của bạn cho bạn bè, mạng xã hội"
            done={false}
          />
          <Step
            number={3}
            title="Nhận hoa hồng"
            description="Khi có người mua qua link, bạn sẽ nhận được tiền hoa hồng"
            done={false}
          />
          <Step
            number={4}
            title="Rút tiền"
            description="Cập nhật thông tin ngân hàng và rút tiền về tài khoản"
            done={false}
          />
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
  href,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
        <div>
          <p className="text-sm text-slate-600">{title}</p>
          <p className="text-2xl font-bold text-slate-900">
            {value}
            {subtitle && (
              <span className="ml-1 text-sm font-normal text-slate-500">
                {subtitle}
              </span>
            )}
          </p>
        </div>
      </div>
    </Link>
  );
}

// Quick Action Card Component
function QuickActionCard({
  title,
  description,
  href,
  color,
}: {
  title: string;
  description: string;
  href: string;
  color: "orange" | "slate";
}) {
  const colors = {
    orange: "bg-gradient-to-br from-orange-500 to-red-500",
    slate: "bg-gradient-to-br from-slate-700 to-slate-900",
  };

  return (
    <Link
      href={href}
      className={`rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow ${colors[color]}`}
    >
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm opacity-90">{description}</p>
      <div className="mt-4 flex items-center gap-1 text-sm font-medium">
        Bắt đầu ngay
        <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  );
}

// Step Component
function Step({
  number,
  title,
  description,
  done,
}: {
  number: number;
  title: string;
  description: string;
  done: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold ${done
            ? "bg-green-100 text-green-600"
            : "bg-amber-100 text-amber-600"
          }`}
      >
        {number}
      </div>
      <div>
        <h4 className="font-medium text-slate-900">{title}</h4>
        <p className="text-sm text-slate-600">{description}</p>
      </div>
    </div>
  );
}
