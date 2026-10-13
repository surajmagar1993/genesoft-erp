"use server"

import { prisma } from "../../../lib/prisma"
import { razorpay } from "../../../lib/razorpay"
import { getTenantAdminId, getTenantId } from "../../../lib/get-tenant-id"
import { getPlanPrice, type BillingCycle, type PlanTier } from "../../../lib/saas-subscription-engine"
import crypto from "crypto"

const PAID_PLANS: PlanTier[] = ["BASIC", "PRO", "ENTERPRISE"]

/**
 * Creates a Razorpay order for the caller's own tenant.
 * Amount is priced server-side from the plan catalog; tenant and plan are pinned in the order notes.
 */
export async function createRazorpayOrder(plan: PlanTier, cycle: BillingCycle = "MONTHLY", currency: string = "INR") {
  const tenantId = await getTenantAdminId()

  if (!PAID_PLANS.includes(plan)) throw new Error("Invalid plan")
  const amount = getPlanPrice(plan, cycle, currency)
  if (!amount || amount <= 0) throw new Error("Plan is not available in this currency")

  const options = {
    amount: Math.round(amount * 100), // Razorpay expects amount in paisa
    currency,
    receipt: `rcpt_${tenantId.slice(0, 8)}_${Date.now()}`,
    notes: {
      tenantId,
      plan,
      cycle,
    }
  }

  try {
    const order = await razorpay.orders.create(options)
    return {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
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
  const plan = notes.plan as PlanTier

  if (notes.tenantId !== tenantId) throw new Error("Order does not belong to this account")
  if (!PAID_PLANS.includes(plan)) throw new Error("Order has no valid plan")
  if (order.status !== "paid" && Number(order.amount_paid) < Number(order.amount)) {
    throw new Error("Order is not paid")
  }

  return await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      plan,
      isTrial: false,
      trialEndsAt: null, // Subscribed users don't have trial ends
    },
  })
}
