"use server"

import { prisma } from "../../../lib/prisma"
import { razorpay } from "../../../lib/razorpay"
import { createClient } from "../../../lib/supabase/server"
import crypto from "crypto"

export async function createRazorpayOrder(amount: number, tenantId: string, planName: string, currency: string = "INR") {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Unauthorized")

  const options = {
    amount: Math.round(amount * 100), // Razorpay expects amount in paisa
    currency,
    receipt: `receipt_tenant_${tenantId}_${Date.now()}`,
    notes: {
      tenantId,
      plan: planName,
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

export async function verifyRazorpayPayment(
  orderId: string,
  paymentId: string,
  signature: string,
  tenantId: string,
  plan: any
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Unauthorized")

  const generated_signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(orderId + "|" + paymentId)
    .digest("hex")

  if (generated_signature !== signature) {
    throw new Error("Invalid payment signature")
  }

  // Update tenant plan and mark trial as false
  return await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      plan,
      isTrial: false,
      trialEndsAt: null, // Subscribed users don't have trial ends
    },
  })
}
