import { describe, expect, it } from "vitest"
import { getStateCodeFromName } from "@/lib/gst-returns-engine"
import { requireTaxId } from "@/lib/tax-identity"
import { calculateUsSalesTax } from "@/lib/us-tax-engine"

describe("no invented tax data", () => {
    it("resolves known Indian states and returns empty for unknown ones (no Maharashtra default)", () => {
        expect(getStateCodeFromName("Karnataka")).toBe("29")
        expect(getStateCodeFromName("27")).toBe("27")
        expect(getStateCodeFromName("")).toBe("")
        expect(getStateCodeFromName("Atlantis")).toBe("")
    })

    it("refuses exports without the business's tax ID", () => {
        expect(() => requireTaxId("", "GSTIN")).toThrow(/Add your GSTIN/)
        expect(() => requireTaxId("   ", "ABN")).toThrow(/Add your ABN/)
        expect(requireTaxId(" 29ABCDE1234F1Z5 ", "GSTIN")).toBe("29ABCDE1234F1Z5")
    })

    it("charges no US sales tax when the destination state is unknown", () => {
        const result = calculateUsSalesTax({ originState: "CA", destinationState: "", amount: 100 })
        expect(result.totalTax).toBe(0)
        expect(result.statutoryReason).toMatch(/unknown/i)
    })
})
