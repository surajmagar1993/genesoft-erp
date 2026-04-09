import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { prisma } from "../../../../lib/prisma"
import crypto from "crypto"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const body = await req.json()
  const payload = JSON.stringify(body)
  const headerList = await headers()
  const signature = headerList.get("x-razorpay-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(payload)
    .digest("hex")

  if (signature !== expectedSignature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const event = body.event

  // Handle successful payments
  if (event === "order.paid") {
    const { notes } = body.payload.order.entity
    const { tenantId, plan } = notes

    if (tenantId && plan) {
      try {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            plan: plan as any, // Cast to any to match Prisma enum
            isTrial: false,
            trialEndsAt: null,
          }
        })
        
        // Log the successful subscription upgrade
        await prisma.systemLog.create({
          data: {
            tenantId,
            level: "INFO",
            message: `SUBSCRIPTION_UPGRADED: Tenant ${tenantId} upgraded to ${plan} via Razorpay. Order: ${body.payload.order.entity.id}`,
          }
        })
      } catch (error) {
        console.error("Webhook Update Error:", error)
        return NextResponse.json({ error: "Database update failed" }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ status: "ok" })
}
