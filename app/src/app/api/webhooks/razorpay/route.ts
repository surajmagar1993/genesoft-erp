import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { prisma } from "../../../../lib/prisma"
import crypto from "crypto"
import { PLAN_CHANGE_KIND, applyPaidRazorpayOrder } from "../../../../lib/razorpay-plan"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  // Razorpay signs the exact raw bytes it sent, so verify before parsing
  const payload = await req.text()
  const headerList = await headers()
  const signature = headerList.get("x-razorpay-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret || secret === "your_razorpay_webhook_secret_here") {
    console.error("Razorpay webhook received but RAZORPAY_WEBHOOK_SECRET is not configured")
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex")

  const a = Buffer.from(expectedSignature)
  const b = Buffer.from(signature)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const body = JSON.parse(payload)
  const event = body.event

  // Plan payments. The Razorpay account also takes other payments, so only
  // orders created by createPlanCheckout (kind = PLAN_CHANGE_KIND) apply.
  if (event === "order.paid") {
    const order = body.payload?.order?.entity
    if (order?.notes?.kind === PLAN_CHANGE_KIND) {
      try {
        const result = await applyPaidRazorpayOrder(order)
        if (result && !result.alreadyApplied) {
          await prisma.systemLog.create({
            data: {
              tenantId: order.notes.tenantId,
              level: "INFO",
              message: `SUBSCRIPTION_UPGRADED: Tenant ${order.notes.tenantId} moved to ${order.notes.plan} (${order.notes.cycle}) via Razorpay. Order: ${order.id}`,
            },
          })
        }
      } catch (error) {
        console.error("Webhook Update Error:", error)
        return NextResponse.json({ error: "Plan update failed" }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ status: "ok" })
}
