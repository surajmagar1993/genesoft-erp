"use server"

import { getTenantId } from "@/lib/get-tenant-id"
import { convertAmount } from "@/lib/exchange-rates"
import { prisma } from "@/lib/prisma"
import { computeMonthlyProfitAndLoss, computeProfitAndLoss } from "@/lib/profit-and-loss"

/** Module access checked by the tenant helpers (src/lib/access.ts) */
const MODULE = "finance" as const

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */

/**
 * Payment amounts in a period. Dates are the "YYYY-MM-DD" strings the report
 * screen sends, compared like PostgREST did (the end day counts from its start).
 */
async function amountsInPeriod(tenantId: string, type: "INBOUND" | "OUTBOUND", startDate: string, endDate: string) {
  const rows = await prisma.payment.findMany({
    where: { tenantId, type, paymentDate: { gte: new Date(startDate), lte: new Date(endDate) } },
    select: { amount: true, currencyCode: true },
  })
  return rows.map((p) => ({ amount: Number(p.amount), currency_code: p.currencyCode }))
}

export interface PnlReport {
  period: { start: string; end: string }
  revenue: {
    sales: number        // invoices + debit notes, before tax
    creditNotes: number  // credit notes, before tax (subtracted)
    other: number
    total: number
  }
  expenses: {
    cogs: number         // bill lines for stock products
    bills: number        // other bill lines
    expenses: number     // approved / paid expenses (Finance → Expenses)
    payroll: number      // gross pay of approved payroll runs
    operating: number    // bills + expenses + payroll
    total: number
  }
  grossProfit: number
  netProfit: number
  profitMargin: number  // %
}

export interface MonthlyRevenue {
  month: string         // "Jan", "Feb" ...
  year: number
  revenue: number
  expenses: number
  profit: number
}

export interface CashFlowSummary {
  period: { start: string; end: string }
  cashIn: number        // INBOUND payments
  cashOut: number       // OUTBOUND payments
  netCashFlow: number
  openingAR: number     // total outstanding invoices
  openingAP: number     // total outstanding bills
}

export interface TopRevenueContact {
  contactId: string
  displayName: string
  revenue: number
  invoiceCount: number
}

/* ─────────────────────────────────────────
   P&L Report
───────────────────────────────────────── */

export async function getPnlReport(
  startDate: string,
  endDate: string
): Promise<PnlReport> {
  const tenantId = await getTenantId(MODULE)
  const pnl = await computeProfitAndLoss(tenantId, startDate, endDate)
  return {
    period: { start: startDate, end: endDate },
    revenue: { ...pnl.revenue, other: 0 },
    expenses: pnl.expenses,
    grossProfit: pnl.grossProfit,
    netProfit: pnl.netProfit,
    profitMargin: pnl.profitMargin,
  }
}

/* ─────────────────────────────────────────
   Monthly Revenue (12 months for a year)
───────────────────────────────────────── */

export async function getMonthlyRevenue(year: number): Promise<MonthlyRevenue[]> {
  const tenantId = await getTenantId(MODULE)
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const months = await computeMonthlyProfitAndLoss(tenantId, year)
  return months.map((m, idx) => ({
    month: monthNames[idx],
    year,
    revenue: m.revenue.total,
    expenses: m.expenses.total,
    profit: m.netProfit,
  }))
}

/* ─────────────────────────────────────────
   Cash Flow Summary
───────────────────────────────────────── */

export async function getCashFlowSummary(
  startDate: string,
  endDate: string
): Promise<CashFlowSummary> {
  const tenantId = await getTenantId(MODULE)

  // Fetch Tenant Base Currency
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { currencyCode: true }
  })
  if (!tenant) throw new Error("Tenant not found")
  const baseCurrency = tenant.currencyCode

  // Payments received (inbound) in period
  const inbound = await amountsInPeriod(tenantId, "INBOUND", startDate, endDate)

  // Payments made (outbound) in period
  const outbound = await amountsInPeriod(tenantId, "OUTBOUND", startDate, endDate)

  let cashIn = 0
  for (const p of inbound ?? []) {
    const raw = Number(p.amount)
    const normalized = (p.currency_code || "INR") === baseCurrency ? raw : (await convertAmount(raw, p.currency_code || "INR", baseCurrency)).toNumber()
    cashIn += normalized
  }

  let cashOut = 0
  for (const p of outbound ?? []) {
    const raw = Number(p.amount)
    const normalized = (p.currency_code || "INR") === baseCurrency ? raw : (await convertAmount(raw, p.currency_code || "INR", baseCurrency)).toNumber()
    cashOut += normalized
  }

  // Outstanding AR (all time — snapshot)
  const unpaidInvoices = (await prisma.invoice.findMany({ where: { tenantId, status: { in: ["SENT", "PARTIALLY_PAID"] } }, select: { total: true, currencyCode: true } }))
    .map((i) => ({ total: Number(i.total), currency_code: i.currencyCode }))

  // Outstanding AP (all time — snapshot)
  const unpaidBills = (await prisma.bill.findMany({ where: { tenantId, status: { in: ["OPEN", "PARTIALLY_PAID"] } }, select: { total: true, currencyCode: true } }))
    .map((b) => ({ total: Number(b.total), currency_code: b.currencyCode }))

  let openingAR = 0
  for (const inv of unpaidInvoices ?? []) {
    const raw = Number(inv.total)
    const normalized = (inv.currency_code || "INR") === baseCurrency ? raw : (await convertAmount(raw, inv.currency_code || "INR", baseCurrency)).toNumber()
    openingAR += normalized
  }

  let openingAP = 0
  for (const b of unpaidBills ?? []) {
    const raw = Number(b.total)
    const normalized = (b.currency_code || "INR") === baseCurrency ? raw : (await convertAmount(raw, b.currency_code || "INR", baseCurrency)).toNumber()
    openingAP += normalized
  }

  return {
    period: { start: startDate, end: endDate },
    cashIn: parseFloat(cashIn.toFixed(2)),
    cashOut: parseFloat(cashOut.toFixed(2)),
    netCashFlow: parseFloat((cashIn - cashOut).toFixed(2)),
    openingAR: parseFloat(openingAR.toFixed(2)),
    openingAP: parseFloat(openingAP.toFixed(2)),
  }
}

/* ─────────────────────────────────────────
   Top Revenue Contacts
───────────────────────────────────────── */

export async function getTopRevenueContacts(limit = 5): Promise<TopRevenueContact[]> {
  const tenantId = await getTenantId(MODULE)

  // Fetch Tenant Base Currency
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { currencyCode: true }
  })
  if (!tenant) throw new Error("Tenant not found")
  const baseCurrency = tenant.currencyCode

  const invoices = (await prisma.invoice.findMany({
    where: { tenantId, status: { in: ["SENT", "PARTIALLY_PAID", "PAID"] } },
    select: { contactId: true, subtotal: true, total: true, currencyCode: true, contact: { select: { displayName: true } } },
  })).map((i) => ({ contact_id: i.contactId, subtotal: Number(i.subtotal), total: Number(i.total), currency_code: i.currencyCode, contacts: { display_name: i.contact.displayName } }))

  const contactMap = new Map<string, TopRevenueContact>()

  for (const inv of invoices ?? []) {
    const id = inv.contact_id
    const name = (inv.contacts as any)?.display_name ?? "Unknown"
    const raw = Number(inv.subtotal ?? inv.total ?? 0)
    const normalized = inv.currency_code === baseCurrency ? raw : (await convertAmount(raw, inv.currency_code, baseCurrency)).toNumber()

    if (!contactMap.has(id)) {
      contactMap.set(id, { contactId: id, displayName: name, revenue: 0, invoiceCount: 0 })
    }
    const entry = contactMap.get(id)!
    entry.revenue += normalized
    entry.invoiceCount += 1
  }

  return Array.from(contactMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
    .map(c => ({ ...c, revenue: parseFloat(c.revenue.toFixed(2)) }))
}
