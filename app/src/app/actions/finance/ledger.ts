"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getTenantId, getTenantManagerId } from "@/lib/get-tenant-id"
import { getTenantTaxContext } from "@/lib/tenant-tax"
import { toActionResult, type ActionResult } from "@/lib/action-result"
import { rebuildLedger } from "@/lib/ledger"
import { logTenantAudit } from "@/lib/tenant-audit"
import {
    accountLedger,
    balanceSheet,
    getOpeningBalances,
    saveOpeningBalances,
    trialBalance,
    type AccountLedger,
    type BalanceSheet,
    type OpeningBalanceInput,
    type TrialBalance,
} from "@/lib/accounting-reports"

/** Module access checked by the tenant helpers (src/lib/access.ts) */
const MODULE = "finance" as const

const DATE = /^\d{4}-\d{2}-\d{2}$/
function checkDate(d: string) {
    if (!DATE.test(d)) throw new Error("Choose a valid date")
    return d
}

export interface LedgerPageData {
    currency: string
    locale: string
    accounts: { id: string; code: string; name: string; type: string }[]
    opening: { date: string | null; lines: { accountId: string; debit: number; credit: number }[] }
}

export async function getLedgerPageData(): Promise<LedgerPageData> {
    const tenantId = await getTenantId(MODULE)
    const [ctx, accounts, opening] = await Promise.all([
        getTenantTaxContext(tenantId),
        prisma.account.findMany({ where: { tenantId, isGroup: false, isActive: true }, select: { id: true, code: true, name: true, type: true }, orderBy: { code: "asc" } }),
        getOpeningBalances(tenantId),
    ])
    return { currency: ctx.currency, locale: ctx.regime.locale, accounts, opening }
}

export async function getTrialBalance(asOf: string): Promise<TrialBalance> {
    return trialBalance(await getTenantId(MODULE), checkDate(asOf))
}

export async function getBalanceSheet(asOf: string): Promise<BalanceSheet> {
    return balanceSheet(await getTenantId(MODULE), checkDate(asOf))
}

export async function getAccountLedger(accountId: string, from: string, to: string): Promise<ActionResult<AccountLedger>> {
    return toActionResult(async () => accountLedger(await getTenantId(MODULE), String(accountId), checkDate(from), checkDate(to)))
}

/** Opening balances when moving from another system (managers and admins). */
export async function saveOpeningBalancesAction(input: OpeningBalanceInput): Promise<ActionResult<{ equityAdjustment: number }>> {
    return toActionResult(async () => {
        const tenantId = await getTenantManagerId(MODULE)
        const { equityAdjustment } = await saveOpeningBalances(tenantId, { date: checkDate(input.date), lines: Array.isArray(input.lines) ? input.lines.slice(0, 500) : [] })
        revalidatePath("/finance/ledger")
        revalidatePath("/finance/accounts")
        return { equityAdjustment }
    })
}

/** Re-posts every invoice, bill, payment, credit note and payroll run (managers and admins). */
export async function rebuildLedgerAction(): Promise<ActionResult<{ documents: number; failed: number; firstError: string | null }>> {
    return toActionResult(async () => {
        const tenantId = await getTenantManagerId(MODULE)
        const res = await rebuildLedger(tenantId)
        await logTenantAudit(tenantId, "LEDGER_REBUILT", { metadata: { documents: res.documents, failed: res.failed.length } })
        revalidatePath("/finance/ledger")
        revalidatePath("/finance/accounts")
        return { documents: res.documents, failed: res.failed.length, firstError: res.failed[0]?.error ?? null }
    })
}
