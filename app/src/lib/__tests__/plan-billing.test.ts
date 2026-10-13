import { beforeEach, describe, expect, it, vi } from "vitest"

const db = vi.hoisted(() => ({
    pricingPlan: { findMany: vi.fn() },
    tenant: { findUnique: vi.fn(), update: vi.fn() },
    adminAuditLog: { create: vi.fn() },
}))
vi.mock("@/lib/prisma", () => ({ prisma: db }))

import { annualFromMonthly, getEffectivePricing } from "@/lib/plan-pricing"
import { applyPlanChange } from "@/lib/plan-change"
import { PLAN_CHANGE_KIND, applyPaidRazorpayOrder } from "@/lib/razorpay-plan"

const tenant = (overrides: Record<string, unknown> = {}) => ({
    id: "t1",
    name: "Acme",
    plan: "FREE",
    currencyCode: "INR",
    settings: {},
    ...overrides,
})

beforeEach(() => {
    vi.clearAllMocks()
    db.pricingPlan.findMany.mockResolvedValue([])
    db.tenant.findUnique.mockResolvedValue(tenant())
})

describe("getEffectivePricing", () => {
    it("uses Admin → Pricing prices over the catalog and derives the yearly price", async () => {
        db.pricingPlan.findMany.mockResolvedValue([{ tier: "PRO", amount: "2999.00", gateway: "RAZORPAY" }])
        const pricing = await getEffectivePricing("INR")
        expect(pricing.monthly.PRO).toBe(2999)
        expect(pricing.annual.PRO).toBe(annualFromMonthly(2999))
        expect(pricing.monthly.BASIC).toBe(999) // no row: catalog price
        expect(pricing.gateway).toBe("RAZORPAY")
    })

    it("falls back to the catalog and default gateway when the database fails", async () => {
        db.pricingPlan.findMany.mockRejectedValue(new Error("db down"))
        vi.spyOn(console, "error").mockImplementation(() => {})
        const pricing = await getEffectivePricing("USD")
        expect(pricing.monthly.PRO).toBe(49)
        expect(pricing.gateway).toBe("STRIPE")
    })

    it("ignores zero or negative prices", async () => {
        db.pricingPlan.findMany.mockResolvedValue([{ tier: "BASIC", amount: "0", gateway: "RAZORPAY" }])
        expect((await getEffectivePricing("INR")).monthly.BASIC).toBe(999)
    })
})

describe("applyPlanChange", () => {
    it("switches the plan, ends the trial and adds a receipt for the amount paid", async () => {
        const result = await applyPlanChange("t1", { targetPlan: "PRO", billingCycle: "MONTHLY", paymentRef: "order_1", amountPaid: 2499 })
        expect(result.alreadyApplied).toBe(false)
        expect(result.invoice?.totalAmount).toBe(2499)
        const data = db.tenant.update.mock.calls[0][0].data
        expect(data.plan).toBe("PRO")
        expect(data.isTrial).toBe(false)
        expect(data.settings.subscription.invoices[0].transactionRef).toBe("order_1")
    })

    it("applies a payment only once", async () => {
        db.tenant.findUnique.mockResolvedValue(tenant({ settings: { subscription: { invoices: [{ transactionRef: "order_1" }] } } }))
        const result = await applyPlanChange("t1", { targetPlan: "PRO", billingCycle: "MONTHLY", paymentRef: "order_1" })
        expect(result.alreadyApplied).toBe(true)
        expect(db.tenant.update).not.toHaveBeenCalled()
    })
})

describe("applyPaidRazorpayOrder", () => {
    const order = (overrides: Record<string, unknown> = {}) => ({
        id: "order_1",
        amount: 249900,
        amount_paid: 249900,
        currency: "INR",
        status: "paid",
        notes: { kind: PLAN_CHANGE_KIND, tenantId: "t1", plan: "PRO", cycle: "MONTHLY" },
        ...overrides,
    })

    it("applies a paid plan order with the amount actually paid", async () => {
        const result = await applyPaidRazorpayOrder(order())
        expect(result?.invoice?.totalAmount).toBe(2499)
        expect(db.tenant.update).toHaveBeenCalled()
    })

    it("ignores orders that aren't Genesoft plan payments", async () => {
        expect(await applyPaidRazorpayOrder(order({ notes: { tenantId: "t1", plan: "PRO" } }))).toBeNull()
        expect(db.tenant.update).not.toHaveBeenCalled()
    })

    it("refuses unpaid orders and invalid plans", async () => {
        await expect(applyPaidRazorpayOrder(order({ status: "created", amount_paid: 0 }))).rejects.toThrow(/not paid/)
        await expect(applyPaidRazorpayOrder(order({ notes: { kind: PLAN_CHANGE_KIND, tenantId: "t1", plan: "SUPER_ADMIN" } }))).rejects.toThrow(/plan/)
    })
})
