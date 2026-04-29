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

// Parse tiền từ CSV - loại bỏ phần thập phân (floor)
// Input: "1597.765", "1,597.765", 4053.5, ...
// Output: 1597, 1597, 4053, ...
export function parseMoney(value: string | number): number {
  if (typeof value === "number") {
    return Math.floor(value);
  }

  const cleaned = value.toString().trim().replace(/\s/g, "").replace(/,/g, ".");
  const parsed = parseFloat(cleaned);

  if (isNaN(parsed) || parsed < 0) return 0;

  return Math.floor(parsed);
}

// Validate số tiền - không quá 10 ký tự
export function validateMoneyInput(value: string): { valid: boolean; value: number } {
  const cleaned = value.toString().trim().replace(/\s/g, "").replace(/,/g, ".");
  
  if (cleaned.length > 10) {
    return { valid: false, value: 0 };
  }

  const parsed = parseFloat(cleaned);

  if (isNaN(parsed) || parsed < 0) {
    return { valid: false, value: 0 };
  }

  return { valid: true, value: Math.floor(parsed) };
}