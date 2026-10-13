import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Number format that matches a currency (Indian lakh grouping only for INR). */
export function localeForCurrency(currencyCode: string = "INR"): string {
  const map: Record<string, string> = {
    INR: "en-IN", AED: "en-AE", SAR: "en-SA", GBP: "en-GB", AUD: "en-AU",
    USD: "en-US", EUR: "en-IE", SGD: "en-SG", CAD: "en-CA", NZD: "en-NZ",
  }
  return map[(currencyCode || "INR").toUpperCase()] || "en-US"
}

export function formatCurrency(amount: number | string, currencyCode: string = "INR") {
  return new Intl.NumberFormat(localeForCurrency(currencyCode), {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(Number(amount))
}

export function getCurrencySymbol(currencyCode: string = "INR") {
  return (0).toLocaleString(localeForCurrency(currencyCode), {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).replace(/\d/g, "").trim()
}
