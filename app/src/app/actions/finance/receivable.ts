"use server"

import { createClient } from "@/lib/supabase/server"
import { getTenantId } from "@/lib/get-tenant-id"

export interface ReceivableSummary {
  totalOutstanding: number
  totalOverdue: number
  agingBuckets: {
    current: number // 0-30 days
    thirtyToSixty: number // 31-60 days
    sixtyToNinety: number // 61-90 days
    ninetyPlus: number // 90+ days
  }
  currency: string
}

export interface DebtorSummary {
  contactId: string
  displayName: string
  totalOwed: number
  overdue: number
  lastInvoiceDate: string | null
}

/**
 * Get global receivable metrics for the dashboard
 */
export async function getReceivableSummary(): Promise<ReceivableSummary> {
  const supabase = await createClient()
  const tenantId = await getTenantId()
  const now = new Date()

  // Fetch all non-paid invoices
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, total, status, invoice_date, due_date, currency_code")
    .eq("tenant_id", tenantId)
    .not("status", "eq", "PAID")
    .not("status", "eq", "CANCELLED")

  // Fetch all payments for these invoices to calculate real balance
  const invoiceIds = invoices?.map(inv => inv.id) || []
  let payments: any[] = []
  
  if (invoiceIds.length > 0) {
    const { data: pData } = await supabase
      .from("payments")
      .select("invoice_id, amount")
      .in("invoice_id", invoiceIds)
      .eq("tenant_id", tenantId)
    payments = pData || []
  }

  const summary: ReceivableSummary = {
    totalOutstanding: 0,
    totalOverdue: 0,
    agingBuckets: {
      current: 0,
      thirtyToSixty: 0,
      sixtyToNinety: 0,
      ninetyPlus: 0,
    },
    currency: invoices?.[0]?.currency_code || "INR"
  }

  for (const inv of invoices ?? []) {
    const totalPayments = payments
      .filter(p => p.invoice_id === inv.id)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0)
    
    const balance = Number(inv.total || 0) - totalPayments
    if (balance <= 0) continue

    summary.totalOutstanding += balance

    const dueDate = new Date(inv.due_date || inv.invoice_date)
    const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 3600 * 24))

    if (dueDate < now) {
      summary.totalOverdue += balance
    }

    // Aging buckets based on Days Past Due (DPD)
    if (diffDays <= 30) {
      summary.agingBuckets.current += balance
    } else if (diffDays <= 60) {
      summary.agingBuckets.thirtyToSixty += balance
    } else if (diffDays <= 90) {
      summary.agingBuckets.sixtyToNinety += balance
    } else {
      summary.agingBuckets.ninetyPlus += balance
    }
  }

  // Round values
  summary.totalOutstanding = parseFloat(summary.totalOutstanding.toFixed(2))
  summary.totalOverdue = parseFloat(summary.totalOverdue.toFixed(2))
  summary.agingBuckets.current = parseFloat(summary.agingBuckets.current.toFixed(2))
  summary.agingBuckets.thirtyToSixty = parseFloat(summary.agingBuckets.thirtyToSixty.toFixed(2))
  summary.agingBuckets.sixtyToNinety = parseFloat(summary.agingBuckets.sixtyToNinety.toFixed(2))
  summary.agingBuckets.ninetyPlus = parseFloat(summary.agingBuckets.ninetyPlus.toFixed(2))

  return summary
}

/**
 * Get top debtors grouped by customer
 */
export async function getTopDebtors(limit = 10): Promise<DebtorSummary[]> {
  const supabase = await createClient()
  const tenantId = await getTenantId()
  const now = new Date()

  // Fetch invoices with contact info
  const { data: invoices } = await supabase
    .from("invoices")
    .select(`
      id, 
      total, 
      status, 
      invoice_date, 
      due_date, 
      contact_id,
      contacts (display_name)
    `)
    .eq("tenant_id", tenantId)
    .not("status", "eq", "PAID")
    .not("status", "eq", "CANCELLED")

  // Fetch payments
  const invoiceIds = invoices?.map(inv => inv.id) || []
  let payments: any[] = []
  
  if (invoiceIds.length > 0) {
    const { data: pData } = await supabase
      .from("payments")
      .select("invoice_id, amount")
      .in("invoice_id", invoiceIds)
      .eq("tenant_id", tenantId)
    payments = pData || []
  }

  const debtorMap = new Map<string, DebtorSummary>()

  for (const inv of invoices ?? []) {
    const totalPayments = payments
      .filter(p => p.invoice_id === inv.id)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0)
    
    const balance = Number(inv.total || 0) - totalPayments
    if (balance <= 0) continue

    const contactId = inv.contact_id
    const displayName = (inv.contacts as any)?.display_name || "Unknown Customer"
    const isOverdue = inv.due_date && new Date(inv.due_date) < now

    if (!debtorMap.has(contactId)) {
      debtorMap.set(contactId, {
        contactId,
        displayName,
        totalOwed: 0,
        overdue: 0,
        lastInvoiceDate: inv.invoice_date
      })
    }

    const debtor = debtorMap.get(contactId)!
    debtor.totalOwed += balance
    if (isOverdue) debtor.overdue += balance
    
    // Track most recent invoice
    if (!debtor.lastInvoiceDate || new Date(inv.invoice_date) > new Date(debtor.lastInvoiceDate)) {
      debtor.lastInvoiceDate = inv.invoice_date
    }
  }

  return Array.from(debtorMap.values())
    .sort((a, b) => b.totalOwed - a.totalOwed)
    .slice(0, limit)
    .map(d => ({
      ...d,
      totalOwed: parseFloat(d.totalOwed.toFixed(2)),
      overdue: parseFloat(d.overdue.toFixed(2))
    }))
}
