import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { runWorkflowEvent } from "@/lib/workflow-engine"
import { PARKED_MODULES_ENABLED } from "@/lib/features"
import { generateInvoiceFromProfile } from "@/lib/recurring-runner"
import { pruneSystemLogs, reportCaught } from "@/lib/error-reporting"
import { expireLapsedPlans } from "@/lib/plan-expiry"
import { markOverdueRentals } from "@/lib/rental-overdue"

export const dynamic = "force-dynamic"
export const maxDuration = 300 // seconds; Vercel caps this per plan

const DAY_MS = 24 * 60 * 60 * 1000
const BILL_DUE_WINDOW_DAYS = 7

/** Vercel Cron sends "Authorization: Bearer <CRON_SECRET>". Fails closed without the secret. */
function isAuthorized(req: Request): boolean {
    const secret = process.env.CRON_SECRET
    if (!secret) return false
    const given = Buffer.from(req.headers.get("authorization") || "")
    const expected = Buffer.from(`Bearer ${secret}`)
    return given.length === expected.length && timingSafeEqual(given, expected)
}

function paidSoFar(payments: { amount: unknown }[]): number {
    return payments.reduce((sum, p) => sum + Number(p.amount), 0)
}

/** Leave time to answer before Vercel stops the function */
const TIME_BUDGET_MS = (maxDuration - 45) * 1000

/**
 * The daily job. Money first, so a slow later step can't stop it:
 *  1. recurring invoices whose run date has come;
 *  2. paid plans that weren't renewed, and scheduled downgrades;
 *  3. time-based workflow triggers: INVOICE_OVERDUE (unpaid past its due date)
 *     and BILL_DUE (unpaid, due within 7 days or overdue), once per document;
 *  4. inbox sync (while the Emails module is on), overdue rentals, log pruning.
 * One business's failure is reported and the rest carry on.
 */
export async function GET(req: Request) {
    if (!isAuthorized(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const started = Date.now()
    const outOfTime = () => Date.now() - started > TIME_BUDGET_MS
    const now = new Date()
    let failures = 0
    const failed = async (err: unknown, where: string, ids: Record<string, string> = {}) => {
        failures++
        await reportCaught(err, `daily job: ${where}`, ids)
    }

    // 1. Recurring invoices whose next run date has come (catches up one cycle per day)
    let recurringGenerated = 0
    let recurringFailed = 0
    try {
        const dueProfiles: { id: string; tenantId: string }[] = await prisma.recurringProfile.findMany({
            where: { status: "ACTIVE", nextRunDate: { lte: now } },
            select: { id: true, tenantId: true },
        })
        for (const profile of dueProfiles) {
            if (outOfTime()) break
            try {
                const result = await generateInvoiceFromProfile(profile.tenantId, profile.id)
                if ("error" in result) {
                    // e.g. the plan's monthly invoice limit: the business needs to know, so it's reported
                    recurringFailed++
                    await failed(new Error(result.error), "recurring invoice not created", { tenantId: profile.tenantId, profileId: profile.id })
                } else recurringGenerated++
            } catch (err) {
                recurringFailed++
                await failed(err, "recurring invoice", { tenantId: profile.tenantId, profileId: profile.id })
            }
        }
    } catch (err) {
        await failed(err, "recurring invoices")
    }

    // 2. Plans that weren't renewed, and downgrades that were scheduled
    let plans = { downgraded: 0, expired: 0, failed: 0 }
    try {
        plans = await expireLapsedPlans(now)
        failures += plans.failed
    } catch (err) {
        await failed(err, "plan expiry")
    }

    // 3. Time-based workflow triggers
    let fired = 0
    try {
        const rules: { tenantId: string; triggerEvent: string }[] = await prisma.workflowRule.findMany({
            where: { isActive: true, triggerEvent: { in: ["INVOICE_OVERDUE", "BILL_DUE"] } },
            select: { tenantId: true, triggerEvent: true },
        })
        const tenantsFor = (event: string): string[] => [...new Set(rules.filter((r) => r.triggerEvent === event).map((r) => r.tenantId))]

        for (const tenantId of tenantsFor("INVOICE_OVERDUE")) {
            if (outOfTime()) break
            try {
                const invoices = await prisma.invoice.findMany({
                    where: { tenantId, type: { not: "PROFORMA" }, dueDate: { lt: now }, status: { in: ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"] } },
                    select: {
                        id: true, invoiceNumber: true, total: true, status: true, dueDate: true,
                        contact: { select: { displayName: true } },
                        payments: { select: { amount: true } },
                    },
                })
                for (const inv of invoices) {
                    if (outOfTime()) break
                    const balanceDue = Number(inv.total) - paidSoFar(inv.payments)
                    if (balanceDue <= 0) continue
                    await runWorkflowEvent(tenantId, "INVOICE_OVERDUE", {
                        total: Number(inv.total),
                        balanceDue,
                        daysOverdue: Math.floor((now.getTime() - inv.dueDate!.getTime()) / DAY_MS),
                        customerName: inv.contact?.displayName ?? null,
                        status: inv.status,
                        invoiceNumber: inv.invoiceNumber,
                    }, inv.id, { oncePerEntity: true })
                    fired++
                }
            } catch (err) {
                await failed(err, "overdue invoice workflows", { tenantId })
            }
        }

        for (const tenantId of tenantsFor("BILL_DUE")) {
            if (outOfTime()) break
            try {
                const bills = await prisma.bill.findMany({
                    where: {
                        tenantId,
                        dueDate: { lte: new Date(now.getTime() + BILL_DUE_WINDOW_DAYS * DAY_MS) },
                        status: { in: ["OPEN", "PARTIALLY_PAID"] },
                    },
                    select: {
                        id: true, billNumber: true, total: true, dueDate: true,
                        contact: { select: { displayName: true } },
                        payments: { select: { amount: true } },
                    },
                })
                for (const bill of bills) {
                    if (outOfTime()) break
                    const balanceDue = Number(bill.total) - paidSoFar(bill.payments)
                    if (balanceDue <= 0) continue
                    await runWorkflowEvent(tenantId, "BILL_DUE", {
                        balanceDue,
                        vendorName: bill.contact?.displayName ?? null,
                        daysUntilDue: Math.ceil((bill.dueDate!.getTime() - now.getTime()) / DAY_MS),
                        billNumber: bill.billNumber,
                    }, bill.id, { oncePerEntity: true })
                    fired++
                }
            } catch (err) {
                await failed(err, "bill due workflows", { tenantId })
            }
        }
    } catch (err) {
        await failed(err, "workflow triggers")
    }

    // 4a. Inbox sync for mailboxes with IMAP configured (only while the Emails module is on;
    // its code is loaded only then)
    let mailSynced = 0
    let mailFailed = 0
    if (PARKED_MODULES_ENABLED && !outOfTime()) {
        try {
            const { syncImapMailbox } = await import("@/lib/imap-sync")
            const mailboxes = await prisma.emailAccount.findMany({
                where: { isActive: true, imapHost: { not: null }, imapUser: { not: null }, imapPassword: { not: null } },
            })
            for (const mailbox of mailboxes) {
                if (outOfTime()) break
                try {
                    mailSynced += (await syncImapMailbox(mailbox)).syncedCount
                } catch (err) {
                    mailFailed++
                    await failed(err, "inbox sync", { mailboxId: mailbox.id })
                }
            }
        } catch (err) {
            await failed(err, "inbox sync")
        }
    }

    // 4b. Rentals past their end date
    let rentalsOverdue = 0
    try {
        rentalsOverdue = await markOverdueRentals(now)
    } catch (err) {
        await failed(err, "overdue rentals")
    }

    // 4c. Keep System Logs to the retention period (SYSTEM_LOG_RETENTION_DAYS, default 30)
    let logsPruned = 0
    try {
        logsPruned = await pruneSystemLogs()
    } catch (err) {
        await failed(err, "log pruning")
    }

    const ranOutOfTime = outOfTime()
    if (ranOutOfTime) await reportCaught(new Error("The daily job ran out of time before finishing every step"), "daily job", {})
    return NextResponse.json({
        ok: failures === 0 && !ranOutOfTime,
        failures,
        ranOutOfTime,
        checked: fired,
        recurringGenerated,
        recurringFailed,
        plansDowngraded: plans.downgraded,
        plansExpired: plans.expired,
        mailSynced,
        mailFailed,
        logsPruned,
        rentalsOverdue,
    })
}
