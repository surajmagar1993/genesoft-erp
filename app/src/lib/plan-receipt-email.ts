import { Resend } from "resend"
import { prisma } from "@/lib/prisma"
import { appUrl } from "@/lib/app-url"
import { PLATFORM } from "@/lib/constants/platform"
import { reportCaught } from "@/lib/error-reporting"
import { emailDetailsTable, wrapEmailHtml } from "@/lib/email-template-engine"
import { formatCurrency } from "@/lib/utils"
import { PLAN_TIERS, type SaaSPlatformInvoice } from "@/lib/saas-subscription-engine"

/**
 * Emails the plan invoice/receipt to the business's active admins after a payment.
 * The printable invoice stays in Settings → Billing (no HTML attachment: spam filters
 * distrust them). Never throws: the payment is already applied.
 */
export async function sendPlanReceiptEmail(tenantId: string, invoice: SaaSPlatformInvoice): Promise<void> {
    try {
        const apiKey = process.env.RESEND_API_KEY
        const domain = process.env.RESEND_DOMAIN
        if (!apiKey || !domain) return
        const admins = await prisma.user.findMany({
            where: { tenantId, role: "ADMIN", isActive: true },
            select: { email: true },
            orderBy: { createdAt: "asc" },
            take: 5,
        })
        const to = [...new Set(admins.map((a) => a.email).filter((e): e is string => !!e))]
        if (to.length === 0) return

        const day = (d: string) => new Date(d).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" })
        const plan = PLAN_TIERS[invoice.tier].name
        const total = formatCurrency(invoice.totalAmount, invoice.currency)
        const title = `Payment received: ${plan} plan`
        const html = wrapEmailHtml({
            title,
            previewText: `${total} for ${invoice.tenantName}, invoice ${invoice.invoiceNumber}`,
            bodyContent: `<p style="margin:0 0 12px">Thank you. We've received your payment and your plan is active. You can view and print the invoice any time in Settings &rarr; Billing.</p>
${emailDetailsTable([
                ["Invoice", invoice.invoiceNumber],
                ["Business", invoice.tenantName],
                ["Plan", `${plan} (${invoice.billingCycle === "ANNUAL" ? "yearly" : "monthly"})`],
                ["Period", `${day(invoice.periodStart)} – ${day(invoice.periodEnd)}`],
                ["Payment reference", invoice.transactionRef || "—"],
                ["Total paid", total],
            ], true)}`,
            actionButton: { label: "Open Billing", url: `${appUrl()}/settings?tab=billing` },
        })
        const { error } = await new Resend(apiKey).emails.send({
            from: `${PLATFORM.productName} Billing <billing@${domain}>`,
            replyTo: PLATFORM.email,
            to,
            subject: `Your ${PLATFORM.productName} invoice ${invoice.invoiceNumber}`,
            html,
            text: `${title}\n\nInvoice: ${invoice.invoiceNumber}\nBusiness: ${invoice.tenantName}\nTotal paid: ${total}\n\nPrint it from Settings → Billing: ${appUrl()}/settings?tab=billing`,
        })
        if (error) throw new Error(error.message)
    } catch (err) {
        await reportCaught(err, "sendPlanReceiptEmail", { tenantId, invoice: invoice.invoiceNumber })
    }
}
