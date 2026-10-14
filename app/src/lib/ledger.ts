import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { convertAmount } from "@/lib/exchange-rates"
import { resolveTaxRegime } from "@/lib/tax-jurisdiction"

/**
 * General ledger posting. Every business document keeps exactly one live
 * (POSTED) journal that mirrors its current state:
 *
 *   invoice        Dr Accounts Receivable  / Cr Sales, Cr output tax (CGST/SGST/IGST or VAT…)
 *   credit note    Dr Sales Returns, Dr output tax / Cr Accounts Receivable
 *   refund         Dr Accounts Receivable  / Cr Bank or Cash
 *   payment in     Dr Bank or Cash         / Cr Accounts Receivable
 *   payment out    Dr Accounts Payable     / Cr Bank or Cash
 *   bill           Dr COGS (stock lines), Dr Purchases (other), Dr input tax / Cr Accounts Payable
 *   payroll run    Dr Salaries / Cr Salary Payable (net), Cr Payroll Deductions Payable
 *   payroll paid   Dr Salary Payable       / Cr Bank
 *
 * syncLedger() rebuilds a document's journal from the document: when the
 * document changes, the old journal is voided (kept for the audit trail) and
 * a new one posted; when it is deleted, cancelled or back to draft, its
 * journal is voided. It is idempotent, so "Rebuild ledger" can run it for
 * every document. Amounts are in the business's base currency (other
 * currencies are converted at the current cached rate). Expenses post their
 * own journals (Finance → Expenses). Server-only.
 */

/* ───────────────────────── Accounts by role ───────────────────────── */

type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE"

export type LedgerRole =
    | "CASH" | "BANK" | "AR" | "INPUT_TAX"
    | "AP" | "OUTPUT_TAX" | "CGST" | "SGST" | "IGST" | "SALARY_PAYABLE" | "PAYROLL_DEDUCTIONS"
    | "OPENING_EQUITY" | "RETAINED_EARNINGS"
    | "SALES" | "SALES_RETURNS"
    | "COGS" | "PURCHASES" | "SALARIES"

interface RoleSpec {
    type: AccountType
    /** Existing accounts that may play this role, in order of preference */
    codes: string[]
    /** Extra check on an existing account's name (codes differ between older seeders) */
    nameMatch?: RegExp
    /** Code and name used when no suitable account exists */
    create: { code: string; name: (taxLabel: string) => string; description: string }
}

const ROLES: Record<LedgerRole, RoleSpec> = {
    CASH: { type: "ASSET", codes: ["1110"], create: { code: "1110", name: () => "Cash", description: "Cash in hand" } },
    BANK: { type: "ASSET", codes: ["1120"], create: { code: "1120", name: () => "Bank Account", description: "Operating bank account" } },
    AR: { type: "ASSET", codes: ["1200"], create: { code: "1200", name: () => "Accounts Receivable", description: "Amounts customers owe" } },
    INPUT_TAX: {
        type: "ASSET", codes: ["1400", "1410"], nameMatch: /input|itc|credit|gst|vat|tax/i,
        create: { code: "1410", name: (l) => `Input ${l} (tax credit)`, description: "Tax paid on purchases, claimable" },
    },
    AP: { type: "LIABILITY", codes: ["2100"], create: { code: "2100", name: () => "Accounts Payable", description: "Amounts owed to suppliers" } },
    OUTPUT_TAX: {
        type: "LIABILITY", codes: ["2200", "2205"], nameMatch: /tax|gst|vat|payable/i,
        create: { code: "2205", name: (l) => `${l} Payable`, description: "Tax collected on sales" },
    },
    CGST: { type: "LIABILITY", codes: ["2210"], create: { code: "2210", name: () => "CGST Payable", description: "Central GST collected" } },
    SGST: { type: "LIABILITY", codes: ["2220"], create: { code: "2220", name: () => "SGST Payable", description: "State GST collected" } },
    IGST: { type: "LIABILITY", codes: ["2230"], create: { code: "2230", name: () => "IGST Payable", description: "Integrated GST collected" } },
    SALARY_PAYABLE: { type: "LIABILITY", codes: ["2400"], create: { code: "2400", name: () => "Salary Payable", description: "Net pay owed to staff" } },
    PAYROLL_DEDUCTIONS: {
        type: "LIABILITY", codes: ["2410"],
        create: { code: "2410", name: () => "Payroll Deductions Payable", description: "PF, ESI, professional tax and tax withheld from pay" },
    },
    OPENING_EQUITY: { type: "EQUITY", codes: ["3900"], create: { code: "3900", name: () => "Opening Balance Equity", description: "Balancing entry for opening balances" } },
    RETAINED_EARNINGS: { type: "EQUITY", codes: ["3200"], create: { code: "3200", name: () => "Retained Earnings", description: "Profits kept in the business" } },
    SALES: { type: "REVENUE", codes: ["4100"], create: { code: "4100", name: () => "Sales Revenue", description: "Income from sales and services" } },
    SALES_RETURNS: { type: "REVENUE", codes: ["4150"], create: { code: "4150", name: () => "Sales Returns & Credit Notes", description: "Reduces sales (debit balance)" } },
    COGS: { type: "EXPENSE", codes: ["5100"], create: { code: "5100", name: () => "Cost of Goods Sold", description: "Stock bought for resale" } },
    PURCHASES: { type: "EXPENSE", codes: ["5150"], create: { code: "5150", name: () => "Purchases (Bills)", description: "Services and other purchases on supplier bills" } },
    SALARIES: { type: "EXPENSE", codes: ["5200"], create: { code: "5200", name: () => "Salaries & Wages", description: "Staff pay" } },
}

type Tx = Prisma.TransactionClient
type AccountRow = { id: string; code: string; name: string; type: string; isGroup: boolean; isActive: boolean }

/** Finds (or creates) the account that plays a role in this tenant's chart of accounts. */
export async function resolveLedgerAccount(tx: Tx, tenantId: string, role: LedgerRole, taxLabel: string, currencyCode: string): Promise<string> {
    const spec = ROLES[role]
    const candidates: AccountRow[] = await tx.account.findMany({
        where: { tenantId, code: { in: [...spec.codes, spec.create.code] } },
        select: { id: true, code: true, name: true, type: true, isGroup: true, isActive: true },
    })
    for (const code of [...spec.codes, spec.create.code]) {
        const acc = candidates.find((a) => a.code === code)
        if (acc && !acc.isGroup && acc.type === spec.type && (!spec.nameMatch || spec.nameMatch.test(acc.name))) return acc.id
    }
    if (candidates.some((a) => a.code === spec.create.code)) {
        throw new Error(`Account ${spec.create.code} exists but can't be used as ${spec.create.name(taxLabel)}. Rename or recode it in Chart of Accounts.`)
    }
    const created = await tx.account.create({
        data: {
            tenantId,
            code: spec.create.code,
            name: spec.create.name(taxLabel),
            type: spec.type as never,
            description: spec.create.description,
            currencyCode,
            isSystem: true,
        },
        select: { id: true },
    })
    return created.id
}

/* ───────────────────────── Journals ───────────────────────── */

export interface DraftLine {
    role: LedgerRole
    /** Post to this account instead of the role's account (manual entries like opening balances) */
    accountId?: string
    debit?: number
    credit?: number
    description?: string
    contactId?: string | null
}

export interface DraftJournal {
    date: Date
    reference: string
    narration: string
    /** Currency the amounts are in; converted to base currency when different */
    currencyCode: string
    lines: DraftLine[]
}

const cents = (n: number) => Math.round(n * 100)

/** Applies a journal line's effect to an account's running balance (normal-balance convention). */
async function applyBalance(tx: Tx, accountId: string, debit: number, credit: number, sign: 1 | -1) {
    const acc = await tx.account.findUnique({ where: { id: accountId }, select: { type: true } })
    if (!acc) return
    const debitNormal = acc.type === "ASSET" || acc.type === "EXPENSE"
    const delta = (debitNormal ? debit - credit : credit - debit) * sign
    if (delta !== 0) await tx.account.update({ where: { id: accountId }, data: { balance: { increment: delta } } })
}

async function nextEntryNumber(tx: Tx, tenantId: string, date: Date): Promise<string> {
    const year = date.getUTCFullYear()
    let n = (await tx.journalEntry.count({ where: { tenantId } })) + 1
    for (;;) {
        const entryNumber = `JE-${year}-${String(n).padStart(4, "0")}`
        if (!(await tx.journalEntry.findFirst({ where: { tenantId, entryNumber }, select: { id: true } }))) return entryNumber
        n++
    }
}

type ResolvedLine = { accountId: string; debit: number; credit: number; description: string | null; contactId: string | null }

/**
 * Makes the ledger match the draft for one source document: voids the
 * current journal(s) of (sourceType, sourceId) unless they already match,
 * then posts the draft. A null draft just voids. Returns the live journal id.
 */
export async function replaceSourceJournal(
    tx: Tx,
    tenantId: string,
    sourceType: "INVOICE" | "BILL" | "PAYMENT" | "PAYROLL" | "OPENING_BALANCE",
    sourceId: string,
    draft: DraftJournal | null
): Promise<string | null> {
    const tenant = await tx.tenant.findUnique({ where: { id: tenantId }, select: { currencyCode: true, countryCode: true, settings: true } })
    if (!tenant) throw new Error("Tenant not found")
    const base = tenant.currencyCode
    const taxLabel = resolveTaxRegime(tenant.countryCode, tenant.settings as never, base).taxLabel

    // Resolve and convert the draft into balanced lines (in cents, so it balances exactly)
    let lines: ResolvedLine[] = []
    if (draft) {
        const rate = draft.currencyCode && draft.currencyCode !== base ? (await convertAmount(1_000_000, draft.currencyCode, base)).toNumber() / 1_000_000 : 1
        const merged = new Map<string, ResolvedLine>()
        for (const l of draft.lines) {
            const debit = cents((l.debit || 0) * rate)
            const credit = cents((l.credit || 0) * rate)
            if (debit === 0 && credit === 0) continue
            const accountId = l.accountId ?? (await resolveLedgerAccount(tx, tenantId, l.role, taxLabel, base))
            const key = `${accountId}|${l.contactId || ""}|${debit > 0 ? "d" : "c"}`
            const prev = merged.get(key)
            if (prev) {
                prev.debit += debit
                prev.credit += credit
            } else {
                merged.set(key, { accountId, debit, credit, description: l.description || null, contactId: l.contactId || null })
            }
        }
        lines = [...merged.values()]
        const diff = lines.reduce((s, l) => s + l.debit - l.credit, 0)
        if (diff !== 0) {
            // Rounding from conversion or tax splits (a few cents): absorb it in the largest line on the short side
            if (Math.abs(diff) > Math.max(5, lines.length * 2)) throw new Error(`Journal for ${draft.reference} doesn't balance (${diff / 100})`)
            const side = diff > 0 ? "credit" : "debit"
            const target = lines.filter((l) => l[side] > 0).sort((a, b) => b[side] - a[side])[0]
            target[side] += Math.abs(diff)
        }
    }

    const existing: { id: string; date: Date; narration: string; lines: { accountId: string; debit: unknown; credit: unknown; contactId: string | null }[] }[] =
        await tx.journalEntry.findMany({
            where: { tenantId, sourceType, sourceId, status: "POSTED" },
            select: { id: true, date: true, narration: true, lines: { select: { accountId: true, debit: true, credit: true, contactId: true } } },
        })

    // Unchanged? Keep the current journal (no void/re-post noise)
    const sig = (ls: { accountId: string; debit: number; credit: number; contactId: string | null }[]) =>
        ls.map((l) => `${l.accountId}|${l.contactId || ""}|${l.debit}|${l.credit}`).sort().join(";")
    if (draft && existing.length === 1 && lines.length > 0) {
        const cur = existing[0]
        const curLines = cur.lines.map((l) => ({ accountId: l.accountId, contactId: l.contactId, debit: cents(Number(l.debit)), credit: cents(Number(l.credit)) }))
        if (sig(curLines) === sig(lines) && cur.date.getTime() === draft.date.getTime() && cur.narration === draft.narration) return cur.id
    }

    for (const je of existing) {
        await tx.journalEntry.update({ where: { id: je.id }, data: { status: "VOID" } })
        for (const l of je.lines) await applyBalance(tx, l.accountId, Number(l.debit), Number(l.credit), -1)
    }
    if (!draft || lines.length === 0) return null

    const total = lines.reduce((s, l) => s + l.debit, 0) / 100
    const je = await tx.journalEntry.create({
        data: {
            tenantId,
            entryNumber: await nextEntryNumber(tx, tenantId, draft.date),
            date: draft.date,
            reference: draft.reference.slice(0, 120),
            sourceType,
            sourceId,
            narration: draft.narration.slice(0, 500),
            status: "POSTED",
            totalDebit: total,
            totalCredit: total,
            currencyCode: base,
            lines: {
                create: lines.map((l) => ({
                    tenantId,
                    accountId: l.accountId,
                    debit: l.debit / 100,
                    credit: l.credit / 100,
                    description: l.description,
                    contactId: l.contactId,
                })),
            },
        },
        select: { id: true },
    })
    for (const l of lines) await applyBalance(tx, l.accountId, l.debit / 100, l.credit / 100, 1)
    return je.id
}

/* ───────────────────────── Documents → journals ───────────────────────── */

export type LedgerSource =
    | { kind: "invoice"; id: string }
    | { kind: "creditNote"; id: string }
    | { kind: "creditNoteRefund"; id: string }
    | { kind: "payment"; id: string }
    | { kind: "bill"; id: string }
    | { kind: "payrollRun"; id: string }

const n = (v: unknown) => Number(v || 0)
const LIVE_INVOICE = ["SENT", "VIEWED", "PARTIALLY_PAID", "PAID", "OVERDUE"]
const LIVE_BILL = ["OPEN", "PARTIALLY_PAID", "PAID"]
const LIVE_CREDIT_NOTE = ["ISSUED", "APPLIED", "REFUNDED"]
const LIVE_PAYROLL = ["APPROVED", "PROCESSED", "PAID"]

/** Payments that move credit between documents (no cash) carry this reference prefix. */
export const CREDIT_APPLICATION_PREFIX = "CN-APPLY:"

/** Splits output tax into the lines the business's tax regime uses. */
function outputTaxLines(mode: "IN_GST" | "SINGLE", tax: number, items: { cgst: number; sgst: number; igst: number }[], side: "debit" | "credit", contactId: string | null): DraftLine[] {
    if (tax === 0) return []
    if (mode !== "IN_GST") return [{ role: "OUTPUT_TAX", [side]: tax, contactId }]
    const igst = items.reduce((s, i) => s + i.igst, 0)
    const cgst = items.reduce((s, i) => s + i.cgst, 0)
    const sgst = items.reduce((s, i) => s + i.sgst, 0)
    const split = igst + cgst + sgst
    if (split <= 0) return [{ role: "OUTPUT_TAX", [side]: tax, contactId }]
    // Scale the per-line split to the document's tax total (document-level discounts)
    const f = tax / split
    return [
        { role: "IGST", [side]: igst * f, contactId },
        { role: "CGST", [side]: cgst * f, contactId },
        { role: "SGST", [side]: sgst * f, contactId },
    ]
}

async function draftFor(tx: Tx, tenantId: string, src: LedgerSource): Promise<{ sourceType: "INVOICE" | "BILL" | "PAYMENT" | "PAYROLL"; sourceId: string; draft: DraftJournal | null }[]> {
    const tenant = await tx.tenant.findUnique({ where: { id: tenantId }, select: { countryCode: true, currencyCode: true, settings: true } })
    if (!tenant) throw new Error("Tenant not found")
    const mode = resolveTaxRegime(tenant.countryCode, tenant.settings as never, tenant.currencyCode).mode

    switch (src.kind) {
        case "invoice": {
            const inv = await tx.invoice.findFirst({
                where: { id: src.id, tenantId },
                select: {
                    invoiceNumber: true, type: true, status: true, invoiceDate: true, total: true, taxAmount: true, currencyCode: true, contactId: true,
                    items: { select: { cgstAmount: true, sgstAmount: true, igstAmount: true } },
                },
            })
            const live = inv && LIVE_INVOICE.includes(inv.status) && inv.type !== "PROFORMA"
            if (!inv || !live) return [{ sourceType: "INVOICE", sourceId: src.id, draft: null }]
            const total = n(inv.total)
            const tax = n(inv.taxAmount)
            const items = inv.items.map((i: { cgstAmount: unknown; sgstAmount: unknown; igstAmount: unknown }) => ({ cgst: n(i.cgstAmount), sgst: n(i.sgstAmount), igst: n(i.igstAmount) }))
            const isCredit = inv.type === "CREDIT_NOTE"
            const lines: DraftLine[] = isCredit
                ? [
                      { role: "SALES_RETURNS", debit: total - tax, contactId: inv.contactId },
                      ...outputTaxLines(mode, tax, items, "debit", inv.contactId),
                      { role: "AR", credit: total, contactId: inv.contactId },
                  ]
                : [
                      { role: "AR", debit: total, contactId: inv.contactId },
                      { role: "SALES", credit: total - tax, contactId: inv.contactId },
                      ...outputTaxLines(mode, tax, items, "credit", inv.contactId),
                  ]
            return [{
                sourceType: "INVOICE",
                sourceId: src.id,
                draft: { date: inv.invoiceDate, reference: inv.invoiceNumber, narration: `${isCredit ? "Credit note" : "Invoice"} ${inv.invoiceNumber}`, currencyCode: inv.currencyCode, lines },
            }]
        }

        case "creditNote": {
            const cn = await tx.creditNote.findFirst({
                where: { id: src.id, tenantId },
                select: { creditNoteNumber: true, status: true, issueDate: true, subtotal: true, taxAmount: true, total: true, currencyCode: true, contactId: true },
            })
            const sourceId = `credit-note:${src.id}`
            if (!cn || !LIVE_CREDIT_NOTE.includes(cn.status)) return [{ sourceType: "INVOICE", sourceId, draft: null }]
            const tax = n(cn.taxAmount)
            const total = n(cn.total)
            // Credit note lines don't keep a CGST/SGST/IGST split: Indian tax goes back half CGST, half SGST unless the note is all IGST
            const taxLines: DraftLine[] = tax === 0 ? [] : mode === "IN_GST"
                ? [{ role: "CGST", debit: tax / 2, contactId: cn.contactId }, { role: "SGST", debit: tax / 2, contactId: cn.contactId }]
                : [{ role: "OUTPUT_TAX", debit: tax, contactId: cn.contactId }]
            return [{
                sourceType: "INVOICE",
                sourceId,
                draft: {
                    date: cn.issueDate,
                    reference: cn.creditNoteNumber,
                    narration: `Credit note ${cn.creditNoteNumber}`,
                    currencyCode: cn.currencyCode,
                    lines: [{ role: "SALES_RETURNS", debit: total - tax, contactId: cn.contactId }, ...taxLines, { role: "AR", credit: total, contactId: cn.contactId }],
                },
            }]
        }

        case "creditNoteRefund": {
            const r = await tx.creditNoteRefund.findFirst({
                where: { id: src.id, tenantId },
                select: { amount: true, refundDate: true, paymentMethod: true, creditNote: { select: { creditNoteNumber: true, contactId: true, currencyCode: true, status: true } } },
            })
            const sourceId = `credit-note-refund:${src.id}`
            if (!r || r.creditNote.status === "VOID") return [{ sourceType: "PAYMENT", sourceId, draft: null }]
            const cash = r.paymentMethod === "CASH" ? "CASH" : "BANK"
            return [{
                sourceType: "PAYMENT",
                sourceId,
                draft: {
                    date: r.refundDate,
                    reference: r.creditNote.creditNoteNumber,
                    narration: `Refund on credit note ${r.creditNote.creditNoteNumber}`,
                    currencyCode: r.creditNote.currencyCode,
                    lines: [{ role: "AR", debit: n(r.amount), contactId: r.creditNote.contactId }, { role: cash, credit: n(r.amount) }],
                },
            }]
        }

        case "payment": {
            const p = await tx.payment.findFirst({
                where: { id: src.id, tenantId },
                select: { amount: true, type: true, paymentDate: true, paymentMethod: true, reference: true, currencyCode: true, contactId: true, invoice: { select: { invoiceNumber: true } }, bill: { select: { billNumber: true } } },
            })
            if (!p || p.reference?.startsWith(CREDIT_APPLICATION_PREFIX)) return [{ sourceType: "PAYMENT", sourceId: src.id, draft: null }]
            const cash = p.paymentMethod === "CASH" ? "CASH" : "BANK"
            const amount = n(p.amount)
            const doc = p.invoice?.invoiceNumber || p.bill?.billNumber || p.reference || ""
            const inbound = p.type === "INBOUND"
            return [{
                sourceType: "PAYMENT",
                sourceId: src.id,
                draft: {
                    date: p.paymentDate,
                    reference: doc || "Payment",
                    narration: `${inbound ? "Payment received" : "Payment made"}${doc ? ` for ${doc}` : ""} (${p.paymentMethod})`,
                    currencyCode: p.currencyCode,
                    lines: inbound
                        ? [{ role: cash, debit: amount }, { role: "AR", credit: amount, contactId: p.contactId }]
                        : [{ role: "AP", debit: amount, contactId: p.contactId }, { role: cash, credit: amount }],
                },
            }]
        }

        case "bill": {
            const bill = await tx.bill.findFirst({
                where: { id: src.id, tenantId },
                select: {
                    billNumber: true, status: true, billDate: true, subtotal: true, discount: true, taxAmount: true, total: true, currencyCode: true, contactId: true,
                    items: { select: { lineTotal: true, taxAmount: true, product: { select: { type: true } } } },
                },
            })
            if (!bill || !LIVE_BILL.includes(bill.status)) return [{ sourceType: "BILL", sourceId: src.id, draft: null }]
            const total = n(bill.total)
            const tax = n(bill.taxAmount)
            const net = total - tax
            const lines = bill.items.map((i: { lineTotal: unknown; taxAmount: unknown; product: { type: string } | null }) => ({ amount: Math.max(0, n(i.lineTotal) - n(i.taxAmount)), stock: i.product?.type === "PRODUCT" }))
            const lineSum = lines.reduce((s: number, l: { amount: number }) => s + l.amount, 0)
            const stockShare = lineSum > 0 ? lines.filter((l: { stock: boolean }) => l.stock).reduce((s: number, l: { amount: number }) => s + l.amount, 0) / lineSum : 0
            return [{
                sourceType: "BILL",
                sourceId: src.id,
                draft: {
                    date: bill.billDate,
                    reference: bill.billNumber,
                    narration: `Supplier bill ${bill.billNumber}`,
                    currencyCode: bill.currencyCode,
                    lines: [
                        { role: "COGS", debit: net * stockShare, contactId: bill.contactId },
                        { role: "PURCHASES", debit: net * (1 - stockShare), contactId: bill.contactId },
                        { role: "INPUT_TAX", debit: tax, contactId: bill.contactId },
                        { role: "AP", credit: total, contactId: bill.contactId },
                    ],
                },
            }]
        }

        case "payrollRun": {
            const run = await tx.payrollRun.findFirst({
                where: { id: src.id, tenantId },
                select: {
                    runNumber: true, status: true, periodYear: true, periodMonth: true, payDate: true, paidAt: true, totalGross: true, totalDeductions: true, totalNetPay: true,
                    payslips: { select: { totalGross: true, unpaidLeaveDeduction: true, netSalary: true, totalDeductions: true } },
                },
            })
            const accrualId = `payroll:${src.id}`
            const paidId = `payroll-paid:${src.id}`
            if (!run || !LIVE_PAYROLL.includes(run.status)) {
                return [{ sourceType: "PAYROLL", sourceId: accrualId, draft: null }, { sourceType: "PAYROLL", sourceId: paidId, draft: null }]
            }
            type Slip = { totalGross: unknown; unpaidLeaveDeduction: unknown; netSalary: unknown; totalDeductions: unknown }
            const slips: Slip[] = run.payslips
            // Unpaid leave lowers the salary cost; the other deductions are owed to the government/funds
            const gross = slips.length ? slips.reduce((s, p) => s + n(p.totalGross), 0) : n(run.totalGross)
            const unpaid = slips.reduce((s, p) => s + n(p.unpaidLeaveDeduction), 0)
            const netPay = slips.length ? slips.reduce((s, p) => s + n(p.netSalary), 0) : n(run.totalNetPay)
            const withheld = gross - unpaid - netPay
            const periodEnd = new Date(Date.UTC(run.periodYear, run.periodMonth, 0, 12))
            const out: { sourceType: "PAYROLL"; sourceId: string; draft: DraftJournal | null }[] = [{
                sourceType: "PAYROLL",
                sourceId: accrualId,
                draft: {
                    date: periodEnd,
                    reference: run.runNumber,
                    narration: `Payroll ${run.runNumber} (${run.periodMonth}/${run.periodYear})`,
                    currencyCode: tenant.currencyCode,
                    lines: [
                        { role: "SALARIES", debit: gross - unpaid },
                        { role: "SALARY_PAYABLE", credit: netPay },
                        { role: "PAYROLL_DEDUCTIONS", credit: withheld },
                    ],
                },
            }]
            out.push({
                sourceType: "PAYROLL",
                sourceId: paidId,
                draft: run.status === "PAID"
                    ? {
                          date: run.paidAt || run.payDate,
                          reference: run.runNumber,
                          narration: `Salaries paid for ${run.runNumber}`,
                          currencyCode: tenant.currencyCode,
                          lines: [{ role: "SALARY_PAYABLE", debit: netPay }, { role: "BANK", credit: netPay }],
                      }
                    : null,
            })
            return out
        }
    }
}

/** Rebuilds one document's journal(s) to match the document, in one transaction. */
export async function syncLedger(tenantId: string, src: LedgerSource): Promise<void> {
    await prisma.$transaction(async (tx: Tx) => {
        for (const { sourceType, sourceId, draft } of await draftFor(tx, tenantId, src)) {
            await replaceSourceJournal(tx, tenantId, sourceType, sourceId, draft)
        }
    }, { timeout: 30_000 })
}

/**
 * For actions: posts a document to the ledger without failing the action.
 * A failure is reported (System Logs + alert) and fixed by "Rebuild ledger".
 */
export async function postToLedger(tenantId: string, src: LedgerSource): Promise<void> {
    try {
        await syncLedger(tenantId, src)
    } catch (err) {
        const { reportError } = await import("@/lib/error-reporting")
        await reportError({
            source: "server",
            kind: "ledger",
            path: `ledger:${src.kind}`,
            message: `Ledger posting failed for ${src.kind} ${src.id}: ${err instanceof Error ? err.message : String(err)}`,
            stack: err instanceof Error ? err.stack : undefined,
        })
    }
}

/**
 * Re-posts every document of a business (idempotent; unchanged documents are
 * left alone). Use after importing data, or to post documents created before
 * the ledger was connected.
 */
export async function rebuildLedger(tenantId: string): Promise<{ documents: number; failed: { kind: string; id: string; error: string }[] }> {
    const ids = async (rows: Promise<{ id: string }[]>) => (await rows).map((r) => r.id)
    const sources: LedgerSource[] = [
        ...(await ids(prisma.invoice.findMany({ where: { tenantId }, select: { id: true } }))).map((id) => ({ kind: "invoice" as const, id })),
        ...(await ids(prisma.creditNote.findMany({ where: { tenantId }, select: { id: true } }))).map((id) => ({ kind: "creditNote" as const, id })),
        ...(await ids(prisma.creditNoteRefund.findMany({ where: { tenantId }, select: { id: true } }))).map((id) => ({ kind: "creditNoteRefund" as const, id })),
        ...(await ids(prisma.bill.findMany({ where: { tenantId }, select: { id: true } }))).map((id) => ({ kind: "bill" as const, id })),
        ...(await ids(prisma.payment.findMany({ where: { tenantId }, select: { id: true } }))).map((id) => ({ kind: "payment" as const, id })),
        ...(await ids(prisma.payrollRun.findMany({ where: { tenantId }, select: { id: true } }))).map((id) => ({ kind: "payrollRun" as const, id })),
    ]
    // Journals whose document no longer exists get voided too
    const orphans: { sourceType: string; sourceId: string | null }[] = await prisma.journalEntry.findMany({
        where: { tenantId, status: "POSTED", sourceType: { in: ["INVOICE", "BILL", "PAYMENT", "PAYROLL"] } },
        select: { sourceType: true, sourceId: true },
    })
    const known = new Set(sources.map((s) => s.id))
    for (const o of orphans) {
        const rawId = (o.sourceId || "").replace(/^(credit-note-refund|credit-note|payroll-paid|payroll):/, "")
        if (rawId && !known.has(rawId)) {
            const kind = o.sourceId?.startsWith("credit-note-refund:") ? "creditNoteRefund"
                : o.sourceId?.startsWith("credit-note:") ? "creditNote"
                : o.sourceId?.startsWith("payroll") ? "payrollRun"
                : o.sourceType === "INVOICE" ? "invoice" : o.sourceType === "BILL" ? "bill" : "payment"
            sources.push({ kind, id: rawId } as LedgerSource)
            known.add(rawId)
        }
    }
    const failed: { kind: string; id: string; error: string }[] = []
    for (const src of sources) {
        try {
            await syncLedger(tenantId, src)
        } catch (err) {
            failed.push({ kind: src.kind, id: src.id, error: err instanceof Error ? err.message : String(err) })
        }
    }
    return { documents: sources.length, failed }
}
