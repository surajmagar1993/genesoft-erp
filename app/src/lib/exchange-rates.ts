import { prisma } from "./prisma"
import { Prisma } from "@prisma/client"

const CACHE_DURATION_HOURS = 6

/**
 * Fetches the latest exchange rate from Frankfurter API (Free, no API key).
 * Standardizes everything through a cache to avoid hitting rate limits.
 */
export async function getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
  if (fromCurrency === toCurrency) return 1

  const now = new Date()
  const cacheThreshold = new Date(now.getTime() - CACHE_DURATION_HOURS * 60 * 60 * 1000)

  // 1. Check Cache
  const cached = await (prisma as any).exchangeRateCache.findUnique({
    where: {
      fromCurrency_toCurrency: {
        fromCurrency,
        toCurrency,
      },
    },
  })

  if (cached && cached.updatedAt > cacheThreshold) {
    return Number(cached.rate)
  }

  // 2. Fetch Fresh Rates
  try {
    const response = await fetch(
      `https://api.frankfurter.app/latest?from=${fromCurrency}&to=${toCurrency}`
    )
    const data = await response.json()

    if (!data.rates || !data.rates[toCurrency]) {
      throw new Error(`Rate not found for ${fromCurrency} -> ${toCurrency}`)
    }

    const rate = data.rates[toCurrency]

    // 3. Update Cache
    await (prisma as any).exchangeRateCache.upsert({
      where: {
        fromCurrency_toCurrency: {
          fromCurrency,
          toCurrency,
        },
      },
      update: {
        rate: new Prisma.Decimal(rate),
        updatedAt: now,
      },
      create: {
        fromCurrency,
        toCurrency,
        rate: new Prisma.Decimal(rate),
        updatedAt: now,
      },
    })

    return rate
  } catch (error) {
    console.error("Exchange Rate Fetch Error:", error)
    // If fetch fails, fallback to old cache if available, or a hardcoded fallback
    if (cached) return Number(cached.rate)
    
    // Hardcoded Fallbacks for P1
    const fallbacks: Record<string, number> = {
      "USD_INR": 83.00,
      "AED_INR": 22.60,
      "SAR_INR": 22.10,
      "INR_USD": 0.012,
    }
    return fallbacks[`${fromCurrency}_${toCurrency}`] || 1
  }
}

/**
 * Converts an amount between two currencies using live/cached rates.
 */
export async function convertAmount(
  amount: number | Prisma.Decimal,
  fromCurrency: string,
  toCurrency: string
): Promise<Prisma.Decimal> {
  const rate = await getExchangeRate(fromCurrency, toCurrency)
  const decimalAmount = new Prisma.Decimal(amount)
  return decimalAmount.mul(new Prisma.Decimal(rate))
}
