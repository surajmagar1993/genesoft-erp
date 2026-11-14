import { expect, it } from "vitest"
import { trialActive } from "./trial"

it("a trial is active only before its end date", () => {
    const now = Date.parse("2026-11-14T00:00:00Z")
    expect(trialActive(true, "2026-11-20", now)).toBe(true)
    expect(trialActive(true, new Date("2026-05-06"), now)).toBe(false)
    expect(trialActive(true, null, now)).toBe(false)
    expect(trialActive(false, "2026-11-20", now)).toBe(false)
})
