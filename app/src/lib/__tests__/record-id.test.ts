import { describe, expect, it } from "vitest"
import { isRecordId, isUuid } from "@/lib/utils"

describe("record ids from the URL", () => {
    it("accepts UUIDs and cuids, rejects anything else", () => {
        expect(isRecordId("905cc4eb-4b4e-4261-8598-1bd1c9b0487f")).toBe(true)
        expect(isRecordId("cmu1sq24v000004kzulz8skbn")).toBe(true) // invoice ids are cuids
        expect(isUuid("cmu1sq24v000004kzulz8skbn")).toBe(false)
        for (const bad of ["recurring", "new", "not-a-uuid", "c123", "'; drop table invoices;--", ""]) expect(isRecordId(bad)).toBe(false)
    })
})
