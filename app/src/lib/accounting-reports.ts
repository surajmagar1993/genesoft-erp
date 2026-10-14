import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { replaceSourceJournal, type DraftLine } from "@/lib/ledger"

/**
 * Ledger reports computed from POSTED journal lines (the source of truth;
 * accounts.balance is only a running cache). Server-only.
 */

type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE"

export interface AccountTotal {
    accountId: string
    code: string
    name: string
    type: AccountType
    debit: number
    credit: number
    /** In the account's normal direction: debit − credit for assets/expenses, credit − debit otherwise */
    balance: number
}

const round2 = (n: number) => Math.round(n * 100) / 100
const debitNormal = (t: string) => t === "ASSET" || t === "EXPENSE"

/** End of the given day (UTC) so "as of 31 Mar" includes entries on 31 Mar. */
export function endOfDay(date: string): Date {
    return new Date(`${date}T23:59:59.999Z`)
}

async function totalsBetween(tenantId: string, from: Date | null, to: Date): Promise<AccountTotal[]> {
    const rows: { account_id: string; d: number; c: number }[] = await prisma.$queryRaw`
        select l.account_id::text as account_id, coalesce(sum(l.debit), 0)::float8 as d, coalesce(sum(l.credit), 0)::float8 as c
        from journal_entry_lines l
        join journal_entries j on j.id = l.journal_entry_id
        where l.tenant_id = ${tenantId}::uuid and j.status = 'POSTED' and j.date <= ${to}
          and (${from}::timestamp is null or j.date >= ${from}::timestamp)
        group by l.account_id`
    if (rows.length === 0) return []
    const accounts: { id: string; code: string; name: string; type: string }[] = await prisma.account.findMany({
        where: { tenantId, id: { in: rows.map((r) => r.account_id) } },
        select: { id: true, code: true, name: true, type: true },
    })
    const byId = new Map(accounts.map((a) => [a.id, a]))
    return rows
        .map((r) => {
            const a = byId.get(r.account_id)
            if (!a) return null
            const debit = round2(r.d)
            const credit = round2(r.c)
            return {
                accountId: a.id, code: a.code, name: a.name, type: a.type as AccountType, debit, credit,
                balance: round2(debitNormal(a.type) ? debit - credit : credit - debit),
            }
        })
        .filter((x): x is AccountTotal => x !== null)
        .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
}

/* ───────────── Trial balance ───────────── */

export interface TrialBalance {
    asOf: string
    rows: { accountId: string; code: string; name: string; type: AccountType; debit: number; credit: number }[]
    totalDebit: number
    totalCredit: number
    balanced: boolean
}

/** Each account's net balance as a debit or credit, as of a date. Debits must equal credits. */
export async function trialBalance(tenantId: string, asOf: string): Promise<TrialBalance> {
    const totals = await totalsBetween(tenantId, null, endOfDay(asOf))
    const rows = totals
        .map((t) => {
            const net = round2(t.debit - t.credit)
            return { accountId: t.accountId, code: t.code, name: t.name, type: t.type, debit: net > 0 ? net : 0, credit: net < 0 ? -net : 0 }
        })
        .filter((r) => r.debit !== 0 || r.credit !== 0)
    const totalDebit = round2(rows.reduce((s, r) => s + r.debit, 0))
    const totalCredit = round2(rows.reduce((s, r) => s + r.credit, 0))
    return { asOf, rows, totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.005 }
}

/* ───────────── Balance sheet ───────────── */

export interface BalanceSheet {
    asOf: string
    assets: AccountTotal[]
    liabilities: AccountTotal[]
    equity: AccountTotal[]
    /** Profit before this financial year (not yet moved to an equity account) */
    retainedEarnings: number
    /** Profit from the start of this financial year to asOf */
    currentYearProfit: number
    totalAssets: number
    totalLiabilities: number
    totalEquity: number
    balanced: boolean
    fiscalYearStart: string
}

/** Start of the financial year containing the date (fiscalYearStart = month 1–12). */
export function fiscalYearStartFor(date: Date, startMonth: number): Date {
    const m = Math.min(12, Math.max(1, startMonth || 1)) - 1
    const y = date.getUTCMonth() >= m ? date.getUTCFullYear() : date.getUTCFullYear() - 1
    return new Date(Date.UTC(y, m, 1))
}

export async function balanceSheet(tenantId: string, asOf: string): Promise<BalanceSheet> {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { fiscalYearStart: true } })
    const end = endOfDay(asOf)
    const fyStart = fiscalYearStartFor(end, tenant?.fiscalYearStart ?? 1)
    const all = await totalsBetween(tenantId, null, end)
    const thisYear = await totalsBetween(tenantId, fyStart, end)

    const profit = (rows: AccountTotal[]) =>
        round2(rows.filter((r) => r.type === "REVENUE").reduce((s, r) => s + r.balance, 0) - rows.filter((r) => r.type === "EXPENSE").reduce((s, r) => s + r.balance, 0))
    const profitAllTime = profit(all)
    const currentYearProfit = profit(thisYear)
    const retainedEarnings = round2(profitAllTime - currentYearProfit)

    const nonZero = (rows: AccountTotal[]) => rows.filter((r) => r.balance !== 0)
    const assets = nonZero(all.filter((r) => r.type === "ASSET"))
    const liabilities = nonZero(all.filter((r) => r.type === "LIABILITY"))
    const equity = nonZero(all.filter((r) => r.type === "EQUITY"))
    const totalAssets = round2(assets.reduce((s, r) => s + r.balance, 0))
    const totalLiabilities = round2(liabilities.reduce((s, r) => s + r.balance, 0))
    const totalEquity = round2(equity.reduce((s, r) => s + r.balance, 0) + retainedEarnings + currentYearProfit)
    return {
        asOf, assets, liabilities, equity, retainedEarnings, currentYearProfit, totalAssets, totalLiabilities, totalEquity,
        balanced: Math.abs(totalAssets - totalLiabilities - totalEquity) < 0.005,
        fiscalYearStart: fyStart.toISOString().slice(0, 10),
    }
}

/* ───────────── Account ledger ───────────── */

export interface AccountLedger {
    account: { id: string; code: string; name: string; type: AccountType }
    from: string
    to: string
    openingBalance: number
    closingBalance: number
    lines: { date: string; entryNumber: string; reference: string | null; narration: string; contact: string | null; debit: number; credit: number; balance: number }[]
}

/** Every posted line on one account in a period, with a running balance. */
export async function accountLedger(tenantId: string, accountId: string, from: string, to: string): Promise<AccountLedger> {
    const account = await prisma.account.findFirst({ where: { id: accountId, tenantId }, select: { id: true, code: true, name: true, type: true } })
    if (!account) throw new Error("Account not found")
    const sign = debitNormal(account.type) ? 1 : -1
    const start = new Date(`${from}T00:00:00.000Z`)
    const before: { d: number; c: number }[] = await prisma.$queryRaw`
        select coalesce(sum(l.debit), 0)::float8 as d, coalesce(sum(l.credit), 0)::float8 as c
        from journal_entry_lines l join journal_entries j on j.id = l.journal_entry_id
        where l.tenant_id = ${tenantId}::uuid and l.account_id = ${accountId}::uuid and j.status = 'POSTED' and j.date < ${start}`
    const openingBalance = round2(sign * (before[0].d - before[0].c))
    type Line = { debit: unknown; credit: unknown; description: string | null; contact: { displayName: string } | null; journalEntry: { date: Date; entryNumber: string; reference: string | null; narration: string } }
    const rows: Line[] = await prisma.journalEntryLine.findMany({
        where: { tenantId, accountId, journalEntry: { status: "POSTED", date: { gte: start, lte: endOfDay(to) } } },
        select: {
            debit: true, credit: true, description: true,
            contact: { select: { displayName: true } },
            journalEntry: { select: { date: true, entryNumber: true, reference: true, narration: true } },
        },
        orderBy: [{ journalEntry: { date: "asc" } }, { createdAt: "asc" }],
    })
    let running = openingBalance
    const lines = rows.map((r) => {
        const debit = Number(r.debit)
        const credit = Number(r.credit)
        running = round2(running + sign * (debit - credit))
        return {
            date: r.journalEntry.date.toISOString().slice(0, 10),
            entryNumber: r.journalEntry.entryNumber,
            reference: r.journalEntry.reference,
            narration: r.description || r.journalEntry.narration,
            contact: r.contact?.displayName ?? null,
            debit,
            credit,
            balance: running,
        }
    })
    return { account: { ...account, type: account.type as AccountType }, from, to, openingBalance, closingBalance: running, lines }
}

/* ───────────── Opening balances ───────────── */

export interface OpeningBalanceInput {
    date: string
    lines: { accountId: string; debit: number; credit: number }[]
}

/**
 * Sets the business's opening balances (one journal, replaced on each save).
 * Any difference goes to Opening Balance Equity so the books balance.
 */
export async function saveOpeningBalances(tenantId: string, input: OpeningBalanceInput): Promise<{ journalId: string | null; equityAdjustment: number }> {
    const date = new Date(`${input.date}T00:00:00.000Z`)
    if (Number.isNaN(date.getTime())) throw new Error("Choose a valid date")
    const clean = input.lines
        .map((l) => ({ accountId: l.accountId, debit: round2(Math.max(0, Number(l.debit) || 0)), credit: round2(Math.max(0, Number(l.credit) || 0)) }))
        .filter((l) => l.debit > 0 || l.credit > 0)
    if (clean.some((l) => l.debit > 0 && l.credit > 0)) throw new Error("Enter either a debit or a credit on each account, not both")

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const owned: { id: string; isGroup: boolean }[] = await tx.account.findMany({ where: { tenantId, id: { in: clean.map((l) => l.accountId) } }, select: { id: true, isGroup: true } })
        if (owned.length !== new Set(clean.map((l) => l.accountId)).size) throw new Error("Unknown account")
        if (owned.some((a) => a.isGroup)) throw new Error("Opening balances go on individual accounts, not group headings")
        const diff = round2(clean.reduce((s, l) => s + l.debit - l.credit, 0))
        // Lines name their accounts directly; the balancing line goes to Opening Balance Equity
        const lines: DraftLine[] = clean.map((l) => ({ role: "OPENING_EQUITY", debit: l.debit, credit: l.credit, accountId: l.accountId }))
        if (diff !== 0) lines.push({ role: "OPENING_EQUITY", debit: diff < 0 ? -diff : 0, credit: diff > 0 ? diff : 0 })
        const journalId = await replaceSourceJournal(tx, tenantId, "OPENING_BALANCE", "opening", clean.length === 0 ? null : {
            date,
            reference: "Opening balances",
            narration: `Opening balances as of ${input.date}`,
            currencyCode: "",
            lines,
        })
        return { journalId, equityAdjustment: diff }
    }, { timeout: 30_000 })
}

/** The saved opening balances (for editing). */
export async function getOpeningBalances(tenantId: string): Promise<{ date: string | null; lines: { accountId: string; debit: number; credit: number }[] }> {
    const je: { date: Date; lines: { accountId: string; debit: unknown; credit: unknown; account: { code: string } }[] } | null = await prisma.journalEntry.findFirst({
        where: { tenantId, sourceType: "OPENING_BALANCE", sourceId: "opening", status: "POSTED" },
        select: { date: true, lines: { select: { accountId: true, debit: true, credit: true, account: { select: { code: true } } } } },
    })
    if (!je) return { date: null, lines: [] }
    return {
        date: je.date.toISOString().slice(0, 10),
        // The Opening Balance Equity line is worked out on save, so it isn't shown for editing
        lines: je.lines.filter((l) => l.account.code !== "3900").map((l) => ({ accountId: l.accountId, debit: Number(l.debit), credit: Number(l.credit) })),
    }
}
