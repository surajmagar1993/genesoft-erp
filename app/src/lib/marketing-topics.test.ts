import { describe, expect, it } from "vitest"
import { businessStatus, cleanAudience, cleanTopicsOff, matchesAudience, type SubscriberFacts } from "./marketing-topics"

const NOW = Date.parse("2026-11-14T00:00:00Z")
const sub = (over: Partial<SubscriberFacts> = {}): SubscriberFacts => ({
    topicsOff: [], tenantId: "t1", plan: "PRO", countryCode: "AE", isTrial: false, trialEndsAt: null, ...over,
})
const all = { topic: "news" as const, status: "any" as const, plans: [], countries: [], tenantIds: [] }

describe("marketing audience", () => {
    it("skips people who switched the topic off", () => {
        expect(matchesAudience(sub(), all, NOW)).toBe(true)
        expect(matchesAudience(sub({ topicsOff: ["news"] }), all, NOW)).toBe(false)
        expect(matchesAudience(sub({ topicsOff: ["offers"] }), all, NOW)).toBe(true)
    })

    it("treats an ended trial as its plan, not a trial", () => {
        expect(businessStatus(sub({ isTrial: true, trialEndsAt: "2026-12-01T00:00:00Z", plan: "FREE" }), NOW)).toBe("trial")
        expect(businessStatus(sub({ isTrial: true, trialEndsAt: "2026-11-01T00:00:00Z", plan: "FREE" }), NOW)).toBe("free")
        expect(businessStatus(sub({ plan: "BASIC" }), NOW)).toBe("paid")
    })

    it("ANDs plan, country and business filters; empty means everyone", () => {
        const a = { ...all, plans: ["PRO"], countries: ["AE", "GB"], tenantIds: ["t1"] }
        expect(matchesAudience(sub(), a, NOW)).toBe(true)
        expect(matchesAudience(sub({ countryCode: "IN" }), a, NOW)).toBe(false)
        expect(matchesAudience(sub({ tenantId: null }), a, NOW)).toBe(false)
        expect(matchesAudience(sub({ plan: "FREE" }), { ...all, status: "paid" }, NOW)).toBe(false)
    })

    it("rejects an unknown topic and cleans the rest", () => {
        expect(() => cleanAudience({ topic: "spam" })).toThrow()
        expect(cleanAudience({ topic: "tips", status: "weird", plans: ["PRO", "PRO", 5] })).toEqual({ ...all, topic: "tips", plans: ["PRO"] })
        expect(cleanTopicsOff(["news", "x", "news"])).toEqual(["news"])
    })
})
