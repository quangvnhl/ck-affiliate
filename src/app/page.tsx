import Link from "next/link";
import { HeroLinkGenerator } from "@/components/features/hero-link-generator";
import { auth } from "@/auth";
import { LayoutDashboard, LogOut } from "lucide-react";

export default async function HomePage() {
  const session = await auth();
  const isLoggedIn = !!session?.user;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="font-bold text-xl text-slate-900">
            CK <span className="text-amber-600">Affiliate</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="#how-it-works"
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              Cách hoạt động
            </Link>
            <Link
              href="#faq"
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              FAQ
            </Link>
          </nav>

          {/* Auth buttons / User info */}
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <>
                {/* User info */}
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-600 text-xs font-medium text-white">
                    {session.user.email?.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden md:inline font-medium">
                    {session.user.email?.split("@")[0]}
                  </span>
                </Link>
                {/* Dashboard */}
                <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
                {/* Logout button */}
                <Link
                  href="/api/auth/signout"
                  className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-slate-700 hover:text-slate-900"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-medium px-4 py-2 rounded-full bg-amber-600 text-white hover:bg-amber-700 transition-colors"
                >
                  Đăng ký
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-16 md:py-24">
          <HeroLinkGenerator />
        </section>

        {/* How it works */}
        <section id="how-it-works" className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-slate-900 mb-12">
              Cách hoạt động
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  1
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">
                  Dán link sản phẩm
                </h3>
                <p className="text-sm text-slate-600">
                  Copy link sản phẩm từ Shopee hoặc TikTok Shop mà bạn muốn chia sẻ
                </p>
              </div>

              {/* Step 2 */}
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  2
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">
                  Nhận link tiếp thị
                </h3>
                <p className="text-sm text-slate-600">
                  Hệ thống tự động tạo link rút gọn kèm mã theo dõi của bạn
                </p>
              </div>

              {/* Step 3 */}
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  3
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">
                  Nhận hoa hồng
                </h3>
                <p className="text-sm text-slate-600">
                  Khi có người mua qua link của bạn, nhận ngay 70% hoa hồng từ sàn
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-16 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
          <div className="max-w-4xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl md:text-4xl font-bold">70%</div>
                <div className="text-sm opacity-80 mt-1">Hoa hồng chia sẻ</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold">2</div>
                <div className="text-sm opacity-80 mt-1">Sàn hỗ trợ</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold">24h</div>
                <div className="text-sm opacity-80 mt-1">Rút tiền nhanh</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold">0đ</div>
                <div className="text-sm opacity-80 mt-1">Phí sử dụng</div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-16 bg-white">
          <div className="max-w-2xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-slate-900 mb-12">
              Câu hỏi thường gặp
            </h2>

            <div className="space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <h3 className="font-semibold text-slate-900 mb-2">
                  Tôi có cần đăng ký để tạo link không?
                </h3>
                <p className="text-sm text-slate-600">
                  Không cần! Bạn có thể tạo link ngay mà không cần đăng ký. Tuy nhiên, để theo dõi hoa hồng và rút tiền, bạn cần tạo tài khoản.
                </p>
              </div>

              <div className="border-b border-slate-200 pb-4">
                <h3 className="font-semibold text-slate-900 mb-2">
                  Hoa hồng được tính như thế nào?
                </h3>
                <p className="text-sm text-slate-600">
                  Bạn nhận 70% hoa hồng mà sàn (Shopee/TikTok) trả cho đơn hàng thành công qua link của bạn. Hoa hồng mỗi sản phẩm khác nhau, thường từ 1-10% giá trị đơn hàng.
                </p>
              </div>

              <div className="border-b border-slate-200 pb-4">
                <h3 className="font-semibold text-slate-900 mb-2">
                  Khi nào tôi nhận được tiền?
                </h3>
                <p className="text-sm text-slate-600">
                  Hoa hồng sẽ được cộng vào ví sau khi đơn hàng hoàn thành và sàn xác nhận (thường 7-14 ngày). Bạn có thể rút tiền khi số dư đạt tối thiểu 50,000đ.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-2">
                  Dữ liệu của tôi khi chưa đăng ký có bị mất không?
                </h3>
                <p className="text-sm text-slate-600">
                  Không! Khi bạn đăng ký tài khoản, tất cả link đã tạo và hoa hồng (nếu có) sẽ được tự động gộp vào tài khoản của bạn.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="font-bold text-white">
              CK <span className="text-amber-500">Affiliate</span>
            </div>
            <div className="text-sm">
              &copy; {new Date().getFullYear()} CK Affiliate. All rights reserved.
            </div>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/terms" className="hover:text-white">
                Điều khoản
              </Link>
              <Link href="/privacy" className="hover:text-white">
                Chính sách
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
