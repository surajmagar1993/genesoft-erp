import { applyPlanChange } from "@/lib/plan-change"
import { fromSmallestCurrencyUnit } from "@/lib/payment-gateway-engine"
import type { BillingCycle, PlanTier } from "@/lib/saas-subscription-engine"

// Server-only (not a "use server" module): applying a paid order must never be
// callable from the browser. Callers verify the payment first.

/** Marks Razorpay orders created for Genesoft plan changes (the account also takes other payments). */
export const PLAN_CHANGE_KIND = "genesoft_plan_change"

const PAID_PLANS: PlanTier[] = ["BASIC", "PRO", "ENTERPRISE"]

/**
 * Applies a paid Razorpay plan-change order (from checkout verification or
 * the order.paid webhook). Idempotent per order id.
 */
export async function applyPaidRazorpayOrder(order: {
  id: string
  amount: number | string
  amount_paid: number | string
  currency: string
  status: string
  notes?: Record<string, string> | unknown
}) {
  const notes = (order.notes || {}) as Record<string, string>
  const plan = notes.plan as PlanTier
  const cycle: BillingCycle = notes.cycle === "ANNUAL" ? "ANNUAL" : "MONTHLY"
  if (notes.kind !== PLAN_CHANGE_KIND || !notes.tenantId) return null
  if (!PAID_PLANS.includes(plan)) throw new Error("Order has no valid plan")
  if (order.status !== "paid" && Number(order.amount_paid) < Number(order.amount)) {
    throw new Error("Order is not paid")
  }
  return applyPlanChange(notes.tenantId, {
    targetPlan: plan,
    billingCycle: cycle,
    paymentRef: order.id,
    amountPaid: fromSmallestCurrencyUnit(Number(order.amount_paid || order.amount), order.currency),
    paymentMethod: "Razorpay",
  })
}

