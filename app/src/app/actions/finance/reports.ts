"use server"

import { createClient } from "@/lib/supabase/server"
import { getTenantId } from "@/lib/get-tenant-id"
import { convertAmount } from "@/lib/exchange-rates"
import { prisma } from "@/lib/prisma"
import { computeMonthlyProfitAndLoss, computeProfitAndLoss } from "@/lib/profit-and-loss"

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */

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
  const tenantId = await getTenantId()
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
  const tenantId = await getTenantId()
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
  const supabase = await createClient()
  const tenantId = await getTenantId()

  // Fetch Tenant Base Currency
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { currencyCode: true }
  })
  if (!tenant) throw new Error("Tenant not found")
  const baseCurrency = tenant.currencyCode

  // Payments received (inbound) in period
  const { data: inbound } = await supabase
    .from("payments")
    .select("amount, currency_code")
    .eq("tenant_id", tenantId)
    .eq("type", "INBOUND")
    .gte("payment_date", startDate)
    .lte("payment_date", endDate)

  // Payments made (outbound) in period
  const { data: outbound } = await supabase
    .from("payments")
    .select("amount, currency_code")
    .eq("tenant_id", tenantId)
    .eq("type", "OUTBOUND")
    .gte("payment_date", startDate)
    .lte("payment_date", endDate)

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
  const { data: unpaidInvoices } = await supabase
    .from("invoices")
    .select("total, currency_code")
    .eq("tenant_id", tenantId)
    .in("status", ["SENT", "PARTIALLY_PAID"])

  // Outstanding AP (all time — snapshot)
  const { data: unpaidBills } = await supabase
    .from("bills")
    .select("total, currency_code")
    .eq("tenant_id", tenantId)
    .in("status", ["OPEN", "PARTIALLY_PAID"])

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
  const supabase = await createClient()
  const tenantId = await getTenantId()

  // Fetch Tenant Base Currency
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { currencyCode: true }
  })
  if (!tenant) throw new Error("Tenant not found")
  const baseCurrency = tenant.currencyCode

  const { data: invoices } = await supabase
    .from("invoices")
    .select("contact_id, subtotal, total, currency_code, contacts(display_name)")
    .eq("tenant_id", tenantId)
    .in("status", ["SENT", "PARTIALLY_PAID", "PAID"])

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
