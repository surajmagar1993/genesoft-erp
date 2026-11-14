import { trialActive } from "@/lib/trial"

/**
 * Kinds of marketing email a user can pick (Settings → Email preferences,
 * the unsubscribe page) and who a campaign goes to (Admin → Marketing).
 * Client-safe: no server imports.
 */
export const MARKETING_TOPICS = [
    { key: "news", label: "Product news", description: "New features and updates to Genesoft ERP." },
    { key: "tips", label: "Tips and guides", description: "How-tos for getting more out of the app." },
    { key: "offers", label: "Offers", description: "Discounts and special offers on plans." },
] as const

export type MarketingTopic = (typeof MARKETING_TOPICS)[number]["key"]

export const isMarketingTopic = (v: unknown): v is MarketingTopic =>
    MARKETING_TOPICS.some((t) => t.key === v)

export const topicLabel = (t: MarketingTopic) => MARKETING_TOPICS.find((x) => x.key === t)!.label

/** Stored as the topics a user switched off, so people who opted in before topics existed keep getting all of them. */
export const cleanTopicsOff = (v: unknown): MarketingTopic[] =>
    Array.isArray(v) ? [...new Set(v.filter(isMarketingTopic))] : []

export type BusinessStatus = "any" | "trial" | "paid" | "free"

export interface MarketingAudience {
    topic: MarketingTopic
    status: BusinessStatus
    /** Empty = every plan */
    plans: string[]
    /** Empty = every country */
    countries: string[]
    /** Empty = every business */
    tenantIds: string[]
}

/** What the audience filter needs about one subscriber (no email address, so it can go to the browser). */
export interface SubscriberFacts {
    topicsOff: MarketingTopic[]
    tenantId: string | null
    plan: string | null
    countryCode: string | null
    isTrial: boolean | null
    trialEndsAt: string | Date | null
}

export function businessStatus(s: Pick<SubscriberFacts, "plan" | "isTrial" | "trialEndsAt">, now = Date.now()): Exclude<BusinessStatus, "any"> {
    if (trialActive(s.isTrial, s.trialEndsAt, now)) return "trial"
    return s.plan && s.plan !== "FREE" ? "paid" : "free"
}

export function matchesAudience(s: SubscriberFacts, a: MarketingAudience, now = Date.now()): boolean {
    if (s.topicsOff.includes(a.topic)) return false
    if (a.status !== "any" && businessStatus(s, now) !== a.status) return false
    if (a.plans.length && !(s.plan && a.plans.includes(s.plan))) return false
    if (a.countries.length && !(s.countryCode && a.countries.includes(s.countryCode))) return false
    if (a.tenantIds.length && !(s.tenantId && a.tenantIds.includes(s.tenantId))) return false
    return true
}

const strings = (v: unknown, max = 500) =>
    Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && x.length <= 64))].slice(0, max) : []

/** Audience from the browser, checked. */
export function cleanAudience(input: unknown): MarketingAudience {
    const a = (input || {}) as Record<string, unknown>
    if (!isMarketingTopic(a.topic)) throw new Error("Choose what kind of email this is.")
    const status = (["any", "trial", "paid", "free"] as const).find((s) => s === a.status) ?? "any"
    return { topic: a.topic, status, plans: strings(a.plans), countries: strings(a.countries), tenantIds: strings(a.tenantIds) }
}
