import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/prisma", () => ({ prisma: {} }))

import { zonedDateTime } from "@/lib/timezone"

describe("zonedDateTime", () => {
    it("reads a wall-clock time in the business's time zone", () => {
        expect(zonedDateTime("2026-10-14", "09:30", "Asia/Kolkata").toISOString()).toBe("2026-10-14T04:00:00.000Z")
        expect(zonedDateTime("2026-10-14", "09:30", "Asia/Dubai").toISOString()).toBe("2026-10-14T05:30:00.000Z")
        expect(zonedDateTime("2026-07-01", "09:00", "Europe/London").toISOString()).toBe("2026-07-01T08:00:00.000Z") // BST
        expect(zonedDateTime("2026-01-15", "09:00", "Europe/London").toISOString()).toBe("2026-01-15T09:00:00.000Z")
        expect(zonedDateTime("2026-10-14", "09:30", "UTC").toISOString()).toBe("2026-10-14T09:30:00.000Z")
    })
})
