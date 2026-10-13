import { afterEach, describe, expect, it, vi } from "vitest"
import { isSealed, maskSecret, openSecret, sealSecret } from "@/lib/secret-box"

describe("secret-box", () => {
    afterEach(() => {
        vi.unstubAllEnvs()
    })

    it("stores plaintext when ENCRYPTION_KEY is not set", () => {
        vi.stubEnv("ENCRYPTION_KEY", "")
        expect(sealSecret("smtp-password")).toBe("smtp-password")
        expect(openSecret("smtp-password")).toBe("smtp-password")
    })

    it("round-trips a secret with ENCRYPTION_KEY set", () => {
        vi.stubEnv("ENCRYPTION_KEY", "test-key-with-enough-entropy")
        const sealed = sealSecret("smtp-password")
        expect(isSealed(sealed)).toBe(true)
        expect(sealed).not.toContain("smtp-password")
        expect(openSecret(sealed)).toBe("smtp-password")
    })

    it("does not seal twice and leaves empty values alone", () => {
        vi.stubEnv("ENCRYPTION_KEY", "test-key-with-enough-entropy")
        const sealed = sealSecret("value")
        expect(sealSecret(sealed)).toBe(sealed)
        expect(sealSecret("")).toBe("")
        expect(sealSecret(null)).toBe(null)
    })

    it("returns empty for a tampered or wrong-key value instead of throwing", () => {
        vi.stubEnv("ENCRYPTION_KEY", "key-one")
        const sealed = sealSecret("value")
        vi.spyOn(console, "error").mockImplementation(() => {})
        vi.stubEnv("ENCRYPTION_KEY", "key-two")
        expect(openSecret(sealed)).toBe("")
    })

    it("masks secrets for display", () => {
        expect(maskSecret("")).toBe("")
        expect(maskSecret("short")).toBe("••••••••")
        expect(maskSecret("sk_live_1234567890")).toBe("sk_l••••••••7890")
    })
})
