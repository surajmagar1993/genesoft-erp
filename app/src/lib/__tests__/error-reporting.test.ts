import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/prisma", () => ({ prisma: {} }))

import { errorFingerprint, firstMeaningfulLine, isDisconnectNoise, scrubSecrets } from "@/lib/error-reporting"

describe("scrubSecrets", () => {
    it("hides credentials that can end up in error messages", () => {
        const text = [
            "connect failed postgresql://postgres.abc:SuperSecret123@aws-1.pooler.supabase.com:6543/postgres",
            "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload",
            "stripe sk_live_51HxYzAbCdEfGhIj and rzp_test_AbCdEfGh1234 and re_AbCdEfGhIjKlMnOpQr",
            "value enc:v1:abc:def:ghi",
        ].join("\n")
        const out = scrubSecrets(text)
        expect(out).not.toContain("SuperSecret123")
        expect(out).not.toContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9")
        expect(out).not.toContain("51HxYzAbCdEfGhIj")
        expect(out).not.toContain("AbCdEfGh1234")
        expect(out).not.toContain("AbCdEfGhIjKlMnOpQr")
        expect(out).not.toContain("abc:def:ghi")
        expect(out).toContain("postgresql://***:***@aws-1.pooler.supabase.com")
    })
})

describe("errorFingerprint", () => {
    it("groups the same error across different records and ids", () => {
        const a = errorFingerprint('Invoice "INV-001" not found for 3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e', "/sales/invoices/3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e")
        const b = errorFingerprint('Invoice "INV-778" not found for 00000000-0000-4000-8000-000000000000', "/sales/invoices/00000000-0000-4000-8000-000000000000")
        expect(a).toBe(b)
    })

    it("keeps different errors and different pages apart", () => {
        expect(errorFingerprint("Cannot read properties of undefined", "/crm")).not.toBe(errorFingerprint("Payment failed", "/crm"))
        expect(errorFingerprint("Payment failed", "/crm")).not.toBe(errorFingerprint("Payment failed", "/finance"))
    })
})

describe("firstMeaningfulLine", () => {
    it("skips Prisma's blank lines and invocation header", () => {
        const msg = "\nInvalid `prisma.webForm.findFirst()` invocation:\n\n\nThe table `public.web_forms` does not exist in the current database."
        expect(firstMeaningfulLine(msg)).toBe("The table `public.web_forms` does not exist in the current database.")
    })

    it("tells different Prisma errors on the same page apart", () => {
        const a = "\nInvalid `prisma.webForm.findFirst()` invocation:\n\nThe table `public.web_forms` does not exist"
        const b = "\nInvalid `prisma.contact.create()` invocation:\n\nUnique constraint failed on the fields: (`email`)"
        expect(errorFingerprint(a, "/forms/x")).not.toBe(errorFingerprint(b, "/forms/x"))
    })
})


describe("isDisconnectNoise", () => {
    it("treats a visitor leaving mid-page as noise, not a fault", () => {
        expect(isDisconnectNoise("The destination stream errored while writing data.")).toBe(true)
        expect(isDisconnectNoise("aborted")).toBe(true)
        expect(isDisconnectNoise("read ECONNRESET")).toBe(true)
        expect(isDisconnectNoise("Set a monthly salary for Aarav Sharma before running payroll.")).toBe(false)
        expect(isDisconnectNoise("Cannot read properties of undefined (reading 'id')")).toBe(false)
    })
})
