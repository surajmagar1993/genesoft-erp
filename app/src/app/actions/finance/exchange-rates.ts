"use server"

import { createClient } from "@/lib/supabase/server"
import { getTenantId } from "@/lib/get-tenant-id"

/**
 * Exchange Rate Engine for Multi-Currency Consolidation
 * Standardized for Phase 1 (MVP) with static base rates
 * Can be extended to fetch from external APIs (Fixer, OpenExchange) in P2
 */

export interface ExchangeRate {
  from: string
  to: string
  rate: number
  updatedAt: string
}

// ── Static rates relative to 1 USD ──
const USD_BASE_RATES: Record<string, number> = {
  USD: 1.0,
  INR: 83.50,
  AED: 3.67,
  SAR: 3.75,
  GBP: 0.79,
  EUR: 0.92,
}

/**
 * Get conversion rate from one currency to another
 */
export async function getRate(from: string, to: string): Promise<number> {
  const fromRate = USD_BASE_RATES[from.toUpperCase()]
  const toRate = USD_BASE_RATES[to.toUpperCase()]

  if (!fromRate || !toRate) {
    console.warn(`Unsupported currency conversion: ${from} to ${to}. Using 1.0.`)
    return 1.0
  }

  // Cross rate calculation via USD
  // If 1 USD = 83.5 INR and 1 USD = 3.67 AED
  // Then 1 INR = (3.67 / 83.5) AED
  return toRate / fromRate
}

/**
 * Convert an amount from one currency to another
 */
export async function convertAmount(amount: number, from: string, to: string): Promise<number> {
  if (from === to) return amount
  const rate = await getRate(from, to)
  return amount * rate
}

/**
 * Consolidate an array of amounts into a target currency
 * Each item must have { amount: number, currency: string }
 */
export async function consolidateTotals(
  items: { amount: number; currency: string }[],
  targetCurrency: string = "INR"
): Promise<number> {
  let total = 0
  for (const item of items) {
    total += await convertAmount(item.amount, item.currency, targetCurrency)
  }
  return total
}
