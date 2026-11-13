import { prisma } from "./prisma"
import { Prisma } from "@prisma/client"

type Db = Prisma.TransactionClient | typeof prisma

const CACHE_DURATION_HOURS = 6

/**
 * Fetches the latest exchange rate from Frankfurter API (Free, no API key).
 * Standardizes everything through a cache to avoid hitting rate limits.
 */
/** `db`: the caller's transaction, when it has one (the rate cache is read and written through it). */
export async function getExchangeRate(fromCurrency: string, toCurrency: string, db: Db = prisma): Promise<number> {
  if (fromCurrency === toCurrency) return 1

  const now = new Date()
  const cacheThreshold = new Date(now.getTime() - CACHE_DURATION_HOURS * 60 * 60 * 1000)

  // 1. Check Cache
  const cached = await db.exchangeRateCache.findUnique({
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
    if (!/^[A-Z]{3}$/.test(fromCurrency) || !/^[A-Z]{3}$/.test(toCurrency)) throw new Error(`Not a currency pair: ${fromCurrency} -> ${toCurrency}`)
    const response = await fetch(
      `https://api.frankfurter.app/latest?from=${fromCurrency}&to=${toCurrency}`,
      { signal: AbortSignal.timeout(5000), cache: "no-store" }
    )
    if (!response.ok) throw new Error(`Rate service answered ${response.status}`)
    const data = await response.json()

    const rate = Number(data.rates?.[toCurrency])
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error(`Rate not found for ${fromCurrency} -> ${toCurrency}`)
    }

    // 3. Update Cache
    await db.exchangeRateCache.upsert({
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
    // The last real rate we saw is better than none. With no rate at all there is nothing
    // honest to convert with: the caller is told, and money isn't posted at a made-up rate.
    if (cached) {
      console.error(`Exchange rate ${fromCurrency} -> ${toCurrency}: using the rate saved on ${cached.updatedAt.toISOString()}`, error)
      return Number(cached.rate)
    }
    throw new Error(`No exchange rate available for ${fromCurrency} to ${toCurrency} right now. Try again in a few minutes.`)
  }
}

/**
 * Converts an amount between two currencies using live/cached rates.
 */
export async function convertAmount(
  amount: number | Prisma.Decimal,
  fromCurrency: string,
  toCurrency: string,
  db: Db = prisma
): Promise<Prisma.Decimal> {
  const rate = await getExchangeRate(fromCurrency, toCurrency, db)
  const decimalAmount = new Prisma.Decimal(amount)
  return decimalAmount.mul(new Prisma.Decimal(rate))
}
