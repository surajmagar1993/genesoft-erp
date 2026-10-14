import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { runWorkflowEvent } from "@/lib/workflow-engine"
import { syncImapMailbox } from "@/lib/imap-sync"
import { generateInvoiceFromProfile } from "@/lib/recurring-runner"
import { pruneSystemLogs, reportError } from "@/lib/error-reporting"
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

/**
 * Daily job for the time-based workflow triggers: INVOICE_OVERDUE (unpaid
 * past its due date) and BILL_DUE (unpaid, due within 7 days or overdue).
 * Each rule runs once per invoice/bill. Also generates due recurring
 * invoices and pulls new mail into every active IMAP mailbox.
 */
export async function GET(req: Request) {
    if (!isAuthorized(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()
    const rules: { tenantId: string; triggerEvent: string }[] = await prisma.workflowRule.findMany({
        where: { isActive: true, triggerEvent: { in: ["INVOICE_OVERDUE", "BILL_DUE"] } },
        select: { tenantId: true, triggerEvent: true },
    })
    const tenantsFor = (event: string): string[] => [...new Set(rules.filter((r) => r.triggerEvent === event).map((r) => r.tenantId))]

    let fired = 0

    for (const tenantId of tenantsFor("INVOICE_OVERDUE")) {
        const invoices = await prisma.invoice.findMany({
            where: { tenantId, dueDate: { lt: now }, status: { in: ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"] } },
            select: {
                id: true, invoiceNumber: true, total: true, status: true, dueDate: true,
                contact: { select: { displayName: true } },
                payments: { select: { amount: true } },
            },
        })
        for (const inv of invoices) {
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
    }

    for (const tenantId of tenantsFor("BILL_DUE")) {
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
    }

    // Recurring invoices whose next run date has come (catches up one cycle per day)
    const dueProfiles: { id: string; tenantId: string }[] = await prisma.recurringProfile.findMany({
        where: { status: "ACTIVE", nextRunDate: { lte: now } },
        select: { id: true, tenantId: true },
    })
    let recurringGenerated = 0
    let recurringFailed = 0
    for (const profile of dueProfiles) {
        try {
            const result = await generateInvoiceFromProfile(profile.tenantId, profile.id)
            if ("error" in result) recurringFailed++
            else recurringGenerated++
        } catch (err) {
            recurringFailed++
            console.error(`Recurring profile ${profile.id} failed:`, err instanceof Error ? err.message : err)
            await reportError({
                source: "server",
                kind: "cron",
                path: "/api/cron/workflows (recurring invoice)",
                message: `Recurring invoice failed for profile ${profile.id}: ${err instanceof Error ? err.message : String(err)}`,
                stack: err instanceof Error ? err.stack : undefined,
            })
        }
    }

    // Inbox sync for mailboxes with IMAP configured; one failing mailbox doesn't stop the rest
    const mailboxes = await prisma.emailAccount.findMany({
        where: { isActive: true, imapHost: { not: null }, imapUser: { not: null }, imapPassword: { not: null } },
    })
    let mailSynced = 0
    let mailFailed = 0
    for (const mailbox of mailboxes) {
        try {
            mailSynced += (await syncImapMailbox(mailbox)).syncedCount
        } catch (err) {
            mailFailed++
            console.error(`IMAP sync failed for mailbox ${mailbox.id}:`, err instanceof Error ? err.message : err)
        }
    }

    // Rentals past their end date
    let rentalsOverdue = 0
    try {
        rentalsOverdue = await markOverdueRentals(now)
    } catch (err) {
        console.error("Marking overdue rentals failed:", err)
    }

    // Keep System Logs to the retention period (SYSTEM_LOG_RETENTION_DAYS, default 30)
    let logsPruned = 0
    try {
        logsPruned = await pruneSystemLogs()
    } catch (err) {
        console.error("System log pruning failed:", err)
    }

    return NextResponse.json({ ok: true, checked: fired, recurringGenerated, recurringFailed, mailSynced, mailFailed, logsPruned, rentalsOverdue })
}
