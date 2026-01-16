import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Hàm cn() để merge Tailwind classes một cách thông minh
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format số tiền theo định dạng Việt Nam
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

// Format ngày tháng theo định dạng Việt Nam
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}