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

/** True for a UUID (record ids from the URL are checked before any database query). */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

/**
 * True for a UUID or a cuid ("cmu1sq24v000004kzulz8skbn"). Invoices, payments,
 * support tickets and a few other tables use cuid ids (see schema.prisma), so
 * pages for those records must use this, not isUuid.
 */
export function isRecordId(value: unknown): value is string {
  return isUuid(value) || (typeof value === "string" && /^c[a-z0-9]{20,31}$/.test(value))
}
