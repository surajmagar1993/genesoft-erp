"use server"

import { createClient } from "@/lib/supabase/server"
import { getTenantId } from "@/lib/get-tenant-id"

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */

export interface PnlReport {
  period: { start: string; end: string }
  revenue: {
    sales: number
    other: number
    total: number
  }
  expenses: {
    cogs: number        // bills / vendor invoices
    operating: number   // estimated from bills
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
  const supabase = await createClient()
  const tenantId = await getTenantId()

  // Revenue: from invoices (SENT, PARTIALLY_PAID, PAID) in period
  const { data: invoices } = await supabase
    .from("invoices")
    .select("subtotal, total, tax_amount, status")
    .eq("tenant_id", tenantId)
    .in("status", ["SENT", "PARTIALLY_PAID", "PAID"])
    .gte("invoice_date", startDate)
    .lte("invoice_date", endDate)

  const salesRevenue = (invoices ?? []).reduce(
    (sum, inv) => sum + Number(inv.subtotal ?? inv.total ?? 0),
    0
  )

  // 2. Fetch all bills in period WITH items and products
  const { data: billsWithItems } = await supabase
    .from("bills")
    .select(`
      id,
      bill_items (
        line_total,
        product_id,
        products (type)
      )
    `)
    .eq("tenant_id", tenantId)
    .in("status", ["OPEN", "PARTIALLY_PAID", "PAID"])
    .gte("bill_date", startDate)
    .lte("bill_date", endDate)

  let cogs = 0
  let operating = 0

  for (const bill of billsWithItems ?? []) {
    for (const item of bill.bill_items as any[]) {
      const amount = Number(item.line_total || 0)
      if (item.products?.type === "PRODUCT") {
        cogs += amount
      } else {
        operating += amount // Services or miscellaneous are operating expenses
      }
    }
  }

  const totalBillExpenses = cogs + operating
  const grossProfit = salesRevenue - cogs
  const netProfit = grossProfit - operating
  const profitMargin = salesRevenue > 0 ? (netProfit / salesRevenue) * 100 : 0

  return {
    period: { start: startDate, end: endDate },
    revenue: {
      sales: parseFloat(salesRevenue.toFixed(2)),
      other: 0,
      total: parseFloat(salesRevenue.toFixed(2)),
    },
    expenses: {
      cogs: parseFloat(cogs.toFixed(2)),
      operating: parseFloat(operating.toFixed(2)),
      total: parseFloat(totalBillExpenses.toFixed(2)),
    },
    grossProfit: parseFloat(grossProfit.toFixed(2)),
    netProfit: parseFloat(netProfit.toFixed(2)),
    profitMargin: parseFloat(profitMargin.toFixed(1)),
  }
}

/* ─────────────────────────────────────────
   Monthly Revenue (12 months for a year)
───────────────────────────────────────── */

export async function getMonthlyRevenue(year: number): Promise<MonthlyRevenue[]> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const startDate = `${year}-01-01`
  const endDate = `${year}-12-31`

  const { data: invoices } = await supabase
    .from("invoices")
    .select("subtotal, total, invoice_date")
    .eq("tenant_id", tenantId)
    .in("status", ["SENT", "PARTIALLY_PAID", "PAID"])
    .gte("invoice_date", startDate)
    .lte("invoice_date", endDate)

  const { data: bills } = await supabase
    .from("bills")
    .select("subtotal, total, bill_date")
    .eq("tenant_id", tenantId)
    .in("status", ["OPEN", "PARTIALLY_PAID", "PAID"])
    .gte("bill_date", startDate)
    .lte("bill_date", endDate)

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  
  const result: MonthlyRevenue[] = monthNames.map((month, idx) => {
    const monthNum = idx + 1
    const monthStr = String(monthNum).padStart(2, "0")

    const revenue = (invoices ?? [])
      .filter(inv => inv.invoice_date?.startsWith(`${year}-${monthStr}`))
      .reduce((sum, inv) => sum + Number(inv.subtotal ?? inv.total ?? 0), 0)

    const expenses = (bills ?? [])
      .filter(b => b.bill_date?.startsWith(`${year}-${monthStr}`))
      .reduce((sum, b) => sum + Number(b.subtotal ?? b.total ?? 0), 0)

    return {
      month,
      year,
      revenue: parseFloat(revenue.toFixed(2)),
      expenses: parseFloat(expenses.toFixed(2)),
      profit: parseFloat((revenue - expenses).toFixed(2)),
    }
  })

  return result
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

  // Payments received (inbound) in period
  const { data: inbound } = await supabase
    .from("payments")
    .select("amount")
    .eq("tenant_id", tenantId)
    .eq("type", "INBOUND")
    .gte("payment_date", startDate)
    .lte("payment_date", endDate)

  // Payments made (outbound) in period
  const { data: outbound } = await supabase
    .from("payments")
    .select("amount")
    .eq("tenant_id", tenantId)
    .eq("type", "OUTBOUND")
    .gte("payment_date", startDate)
    .lte("payment_date", endDate)

  // Outstanding AR (all time — snapshot)
  const { data: unpaidInvoices } = await supabase
    .from("invoices")
    .select("total")
    .eq("tenant_id", tenantId)
    .in("status", ["SENT", "PARTIALLY_PAID"])

  // Outstanding AP (all time — snapshot)
  const { data: unpaidBills } = await supabase
    .from("bills")
    .select("total")
    .eq("tenant_id", tenantId)
    .in("status", ["OPEN", "PARTIALLY_PAID"])

  const cashIn = (inbound ?? []).reduce((s, p) => s + Number(p.amount), 0)
  const cashOut = (outbound ?? []).reduce((s, p) => s + Number(p.amount), 0)
  const openingAR = (unpaidInvoices ?? []).reduce((s, inv) => s + Number(inv.total), 0)
  const openingAP = (unpaidBills ?? []).reduce((s, b) => s + Number(b.total), 0)

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

  const { data: invoices } = await supabase
    .from("invoices")
    .select("contact_id, subtotal, total, contacts(display_name)")
    .eq("tenant_id", tenantId)
    .in("status", ["SENT", "PARTIALLY_PAID", "PAID"])

  const contactMap = new Map<string, TopRevenueContact>()

  for (const inv of invoices ?? []) {
    const id = inv.contact_id
    const name = (inv.contacts as any)?.display_name ?? "Unknown"
    const amount = Number(inv.subtotal ?? inv.total ?? 0)

    if (!contactMap.has(id)) {
      contactMap.set(id, { contactId: id, displayName: name, revenue: 0, invoiceCount: 0 })
    }
    const entry = contactMap.get(id)!
    entry.revenue += amount
    entry.invoiceCount += 1
  }

  return Array.from(contactMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
    .map(c => ({ ...c, revenue: parseFloat(c.revenue.toFixed(2)) }))
}
