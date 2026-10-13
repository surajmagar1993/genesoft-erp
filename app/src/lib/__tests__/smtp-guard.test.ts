import { describe, expect, it } from "vitest"
import { checkImapTarget, checkSmtpTarget, checkWebhookTarget, isPrivateAddress } from "@/lib/smtp-guard"

describe("isPrivateAddress", () => {
    it.each(["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "::ffff:10.0.0.1"])(
        "treats %s as private",
        (ip) => expect(isPrivateAddress(ip)).toBe(true)
    )
    it.each(["8.8.8.8", "1.1.1.1", "172.32.0.1", "2606:4700::1111"])("treats %s as public", (ip) =>
        expect(isPrivateAddress(ip)).toBe(false)
    )
})

describe("network targets", () => {
    it("rejects webhooks that are not https", async () => {
        expect(await checkWebhookTarget("http://example.com/hook")).toMatch(/https/)
        expect(await checkWebhookTarget("not a url")).toMatch(/not valid/)
    })

    it("rejects webhooks and mail servers on private addresses", async () => {
        expect(await checkWebhookTarget("https://127.0.0.1/hook")).toMatch(/public/)
        expect(await checkWebhookTarget("https://169.254.169.254/latest/meta-data")).toMatch(/public/)
        expect(await checkSmtpTarget("10.0.0.5", 587)).toMatch(/public/)
        expect(await checkImapTarget("192.168.1.10", 993)).toMatch(/public/)
    })

    it("rejects unexpected mail ports", async () => {
        expect(await checkSmtpTarget("8.8.8.8", 22)).toMatch(/port/)
        expect(await checkImapTarget("8.8.8.8", 6379)).toMatch(/port/)
    })

    it("allows a public IP", async () => {
        expect(await checkWebhookTarget("https://1.1.1.1/hook")).toBeNull()
        expect(await checkImapTarget("8.8.8.8", 993)).toBeNull()
    })
})
