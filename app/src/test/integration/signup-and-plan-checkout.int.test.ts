import crypto from "node:crypto"
import { describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { register } from "@/app/(auth)/actions"
import { createPlanCheckout, verifyRazorpayPayment } from "@/app/actions/saas/razorpay"
import { executePlanChange } from "@/app/actions/saas/subscription"
import { markOrderPaid } from "./fake-razorpay"
import { signUps } from "./fake-supabase"
import { actAs, addUser, createTestTenant } from "./helpers"

/** Runs a server action that ends in redirect() and returns where it redirected to. */
async function redirectOf(fn: () => Promise<unknown>): Promise<string> {
    try {
        await fn()
    } catch (err) {
        const digest = String((err as { digest?: string }).digest || "")
        if (digest.startsWith("NEXT_REDIRECT")) return decodeURIComponent((digest.split(";")[2] || "").replace(/\+/g, " "))
        throw err
    }
    throw new Error("expected a redirect")
}

function signupForm(fields: Record<string, string>) {
    const fd = new FormData()
    const defaults = {
        fullName: "Priya Sharma",
        email: `owner-${crypto.randomUUID().slice(0, 8)}@example.test`,
        company: "Sharma Traders",
        slug: `sharma-${crypto.randomUUID().slice(0, 8)}`,
        password: "a-long-password",
        confirmPassword: "a-long-password",
        country: "IN",
    }
    for (const [k, v] of Object.entries({ ...defaults, ...fields })) fd.set(k, v)
    return fd
}

const sign = (orderId: string, paymentId: string) =>
    crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!).update(`${orderId}|${paymentId}`).digest("hex")

describe("sign-up", () => {
    it("creates the business in its country's currency with the owner as ADMIN on a 15-day trial", async () => {
        const form = signupForm({ country: "AE", marketingOptIn: "yes", plan: "pro" })
        const to = await redirectOf(() => register(form))
        expect(to).toMatch(/^\/login\?message=/)

        const tenant = await prisma.tenant.findUniqueOrThrow({ where: { domain: String(form.get("slug")) }, include: { users: true } })
        expect(tenant.countryCode).toBe("AE")
        expect(tenant.currencyCode).toBe("AED")
        expect(tenant.plan).toBe("FREE")
        expect(tenant.isTrial).toBe(true)
        const trialDays = (tenant.trialEndsAt!.getTime() - Date.now()) / 86_400_000
        expect(trialDays).toBeGreaterThan(14.9)
        expect(trialDays).toBeLessThan(15.1)
        expect((tenant.settings as { subscription?: { intendedPlan?: string } }).subscription?.intendedPlan).toBe("PRO")
        expect(tenant.users).toHaveLength(1)
        expect(tenant.users[0].role).toBe("ADMIN")

        // Marketing consent is recorded with the sign-up, opt-in only when ticked
        const signUp = signUps.find((s) => s.email === form.get("email"))
        expect((signUp?.options as { data: Record<string, unknown> }).data.marketing_opt_in).toBe(true)
    })

    it("rejects a taken workspace URL and mismatched passwords", async () => {
        const first = signupForm({})
        await redirectOf(() => register(first))
        expect(await redirectOf(() => register(signupForm({ slug: String(first.get("slug")) })))).toMatch(/already taken/)
        expect(await redirectOf(() => register(signupForm({ confirmPassword: "different" })))).toMatch(/do not match/)
    })
})

describe("plan checkout (Razorpay, test mode)", () => {
    it("charges the live price, applies the plan only after a verified payment, once", async () => {
        const { tenant, user } = await createTestTenant({ plan: "FREE" })
        await prisma.pricingPlan.create({
            data: { regionCode: "IN", tier: "PRO", amount: 999, currency: "INR", gateway: "RAZORPAY", isActive: true } as never,
        })
        actAs(user)

        const checkout = await createPlanCheckout("PRO", "MONTHLY")
        expect(checkout.gateway).toBe("RAZORPAY")
        if (checkout.gateway !== "RAZORPAY") return
        expect(checkout.currency).toBe("INR")
        expect(checkout.amount).toBe(99900) // ₹999 from Admin → Pricing, in paise (not the code catalog price)

        // Nothing changes before the gateway confirms
        expect((await prisma.tenant.findUniqueOrThrow({ where: { id: tenant.id } })).plan).toBe("FREE")

        const paymentId = "pay_test_1"
        await expect(verifyRazorpayPayment(checkout.orderId, paymentId, "forged")).rejects.toThrow(/signature/)
        await expect(verifyRazorpayPayment(checkout.orderId, paymentId, sign(checkout.orderId, paymentId))).rejects.toThrow(/not paid/)

        markOrderPaid(checkout.orderId)
        const ok = await verifyRazorpayPayment(checkout.orderId, paymentId, sign(checkout.orderId, paymentId))
        expect(ok.plan).toBe("PRO")

        const after = await prisma.tenant.findUniqueOrThrow({ where: { id: tenant.id } })
        expect(after.plan).toBe("PRO")
        expect(after.isTrial).toBe(false)
        const invoices = (after.settings as { subscription: { invoices: { transactionRef: string }[] } }).subscription.invoices
        expect(invoices.filter((i) => i.transactionRef === checkout.orderId)).toHaveLength(1)

        // The webhook (or a retry) for the same order doesn't add a second receipt
        await verifyRazorpayPayment(checkout.orderId, paymentId, sign(checkout.orderId, paymentId))
        const again = await prisma.tenant.findUniqueOrThrow({ where: { id: tenant.id } })
        expect((again.settings as { subscription: { invoices: unknown[] } }).subscription.invoices).toHaveLength(invoices.length)
    })

    it("another business can't claim the order; non-admins can't start checkout; no free upgrades", async () => {
        const a = await createTestTenant({ plan: "FREE" })
        actAs(a.user)
        const checkout = await createPlanCheckout("BASIC", "MONTHLY")
        if (checkout.gateway !== "RAZORPAY") throw new Error("expected Razorpay")
        markOrderPaid(checkout.orderId)

        const b = await createTestTenant({ plan: "FREE" })
        actAs(b.user)
        await expect(verifyRazorpayPayment(checkout.orderId, "pay_x", sign(checkout.orderId, "pay_x"))).rejects.toThrow(/does not belong/)
        expect((await prisma.tenant.findUniqueOrThrow({ where: { id: b.tenant.id } })).plan).toBe("FREE")

        actAs(await addUser(b.tenant.id, "MANAGER"))
        await expect(createPlanCheckout("PRO", "MONTHLY")).rejects.toThrow()

        actAs(b.user)
        const res = await executePlanChange({ targetPlan: "PRO", billingCycle: "MONTHLY" } as never).catch((e: Error) => e)
        const failed = res instanceof Error || (res as { success?: boolean }).success === false
        expect(failed).toBe(true)
        expect((await prisma.tenant.findUniqueOrThrow({ where: { id: b.tenant.id } })).plan).toBe("FREE")
    })
})
