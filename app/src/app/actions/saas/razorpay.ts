"use server"

import { razorpay } from "../../../lib/razorpay"
import { getTenantAdminId, getTenantId } from "../../../lib/get-tenant-id"
import type { BillingCycle, PlanTier } from "../../../lib/saas-subscription-engine"
import { quotePlanChange } from "../../../lib/plan-change"
import { PLAN_CHANGE_KIND, applyPaidRazorpayOrder } from "../../../lib/razorpay-plan"
import { toSmallestCurrencyUnit } from "../../../lib/payment-gateway-engine"
import type { PaidPlan } from "../../../lib/stripe-plans"
import { createCheckoutSession } from "./stripe"
import { revalidatePath } from "next/cache"
import crypto from "crypto"

const PAID_PLANS: PlanTier[] = ["BASIC", "PRO", "ENTERPRISE"]

export type PlanCheckout =
  | { gateway: "RAZORPAY"; keyId: string; orderId: string; amount: number; currency: string; plan: PlanTier; cycle: BillingCycle }
  | { gateway: "STRIPE"; url: string }

/**
 * Starts paying for an upgrade. The amount is the server's prorated quote at
 * the live price (Admin → Pricing). INR-style regions pay through Razorpay
 * (order pinned to this tenant, plan and cycle); Stripe regions go to Stripe
 * Checkout. The plan only changes once the gateway confirms payment.
 */
export async function createPlanCheckout(plan: PlanTier, cycle: BillingCycle = "MONTHLY"): Promise<PlanCheckout> {
  const tenantId = await getTenantAdminId()
  if (!PAID_PLANS.includes(plan)) throw new Error("Invalid plan")

  const { quote, pricing } = await quotePlanChange(tenantId, plan, cycle)
  if (!(quote.netPayableToday > 0)) {
    throw new Error("Nothing to pay for this change. Use the plan change button instead.")
  }

  if (pricing.gateway === "STRIPE") {
    const { url } = await createCheckoutSession(plan as PaidPlan, cycle)
    if (!url) throw new Error("Stripe checkout is not available")
    return { gateway: "STRIPE", url }
  }

  const keyId = process.env.RAZORPAY_KEY_ID
  if (!keyId || !process.env.RAZORPAY_KEY_SECRET) throw new Error("Razorpay is not configured")

  try {
    const order = await razorpay.orders.create({
      amount: toSmallestCurrencyUnit(quote.netPayableToday, pricing.currency),
      currency: pricing.currency,
      receipt: `plan_${tenantId.slice(0, 8)}_${Date.now()}`,
      notes: { kind: PLAN_CHANGE_KIND, tenantId, plan, cycle },
    })
    return {
      gateway: "RAZORPAY",
      keyId,
      orderId: order.id,
      amount: Number(order.amount),
      currency: order.currency,
      plan,
      cycle,
    }
  } catch (error) {
    console.error("Razorpay Order Error:", error)
    throw new Error("Failed to create Razorpay order")
  }
}

/**
 * Verifies a checkout signature and applies the plan recorded on the order itself.
 * Never trusts a client-supplied tenant or plan.
 */
export async function verifyRazorpayPayment(orderId: string, paymentId: string, signature: string) {
  const tenantId = await getTenantId()

  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!secret) throw new Error("Razorpay is not configured")

  const expected = crypto
    .createHmac("sha256", secret)
    .update(orderId + "|" + paymentId)
    .digest("hex")

  const a = Buffer.from(expected)
  const b = Buffer.from(String(signature || ""))
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error("Invalid payment signature")
  }

  const order = await razorpay.orders.fetch(orderId)
  const notes = (order.notes || {}) as Record<string, string>
  if (notes.tenantId !== tenantId) throw new Error("Order does not belong to this account")

  const result = await applyPaidRazorpayOrder(order as never)
  if (!result) throw new Error("This order is not a plan payment")

  revalidatePath("/settings")
  return { success: true, plan: notes.plan, invoice: result.invoice ?? null }
}
