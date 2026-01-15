import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToasterProvider } from "@/components/providers/toaster-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "CK Affiliate - Cashback Shopee & TikTok",
  description: "Hệ thống Affiliate Cashback cho Shopee và TikTok. Tạo link tiếp thị, nhận hoa hồng ngay lập tức.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${inter.variable} font-sans antialiased bg-slate-50`}>
        {children}
        <ToasterProvider />
      </body>
    </html>
  );
}
