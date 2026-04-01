"use server"

import { createClient } from "@/lib/supabase/server"
import { getTenantId } from "@/lib/get-tenant-id"

export interface LedgerEntry {
  id: string
  date: string
  type: "INVOICE" | "PAYMENT" | "CREDIT_NOTE"
  reference: string
  description: string
  debit: number
  credit: number
  balance: number
  status?: string
  currency_code: string
}

export interface LedgerSummary {
  totalInvoiced: number
  totalPaid: number
  outstandingBalance: number
  overdueAmount: number
  currency: string
}

export interface CustomerLedgerData {
  entries: LedgerEntry[]
  summary: LedgerSummary
}

export async function getCustomerLedger(contactId: string): Promise<CustomerLedgerData> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  // Fetch all invoices for this contact
  // Try contact_id first, fall back to matching by customer_name
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, invoice_date, total, status, currency_code, due_date, valid_until")
    .eq("tenant_id", tenantId)
    .eq("contact_id", contactId)
    .order("invoice_date", { ascending: true })

  // Fetch all payments for this contact
  const { data: payments } = await supabase
    .from("payments")
    .select("id, payment_date, amount, payment_method, reference, currency_code, invoice_id")
    .eq("tenant_id", tenantId)
    .eq("contact_id", contactId)
    .order("payment_date", { ascending: true })

  const entries: LedgerEntry[] = []
  const now = new Date()

  // Map invoices → debit entries
  for (const inv of invoices ?? []) {
    const invoiceTotal = Number(inv.total || 0)
    // Skip zero-total invoices if total column wasn't populated
    entries.push({
      id: inv.id,
      date: inv.invoice_date,
      type: "INVOICE",
      reference: inv.invoice_number || "—",
      description: `Tax Invoice ${inv.invoice_number || ""}`,
      debit: invoiceTotal,
      credit: 0,
      balance: 0,
      status: inv.status,
      currency_code: inv.currency_code || "INR",
    })
  }

  // Map payments → credit entries
  for (const pmt of payments ?? []) {
    entries.push({
      id: pmt.id,
      date: pmt.payment_date,
      type: "PAYMENT",
      reference: pmt.reference || `PMT-${pmt.id.toString().slice(0, 8).toUpperCase()}`,
      description: `Payment received (${(pmt.payment_method || "Other").replace(/_/g, " ")})`,
      debit: 0,
      credit: Number(pmt.amount || 0),
      balance: 0,
      currency_code: pmt.currency_code || "INR",
    })
  }

  // Sort chronologically
  entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Compute running balance (debit = owed, credit = paid)
  let runningBalance = 0
  for (const entry of entries) {
    runningBalance += entry.debit - entry.credit
    entry.balance = parseFloat(runningBalance.toFixed(2))
  }

  // Summary
  const totalInvoiced = entries
    .filter(e => e.type === "INVOICE")
    .reduce((sum, e) => sum + e.debit, 0)
  const totalPaid = entries
    .filter(e => e.type === "PAYMENT")
    .reduce((sum, e) => sum + e.credit, 0)

  // Overdue: invoices past due_date / valid_until that aren't PAID
  const overdueAmount = (invoices ?? [])
    .filter(inv => {
      const dueDate = inv.due_date || inv.valid_until
      return dueDate && new Date(dueDate) < now &&
        inv.status !== "PAID" && inv.status !== "CANCELLED"
    })
    .reduce((sum, inv) => sum + Number(inv.total || 0), 0)

  const currency = entries[0]?.currency_code || "INR"

  return {
    entries,
    summary: {
      totalInvoiced: parseFloat(totalInvoiced.toFixed(2)),
      totalPaid: parseFloat(totalPaid.toFixed(2)),
      outstandingBalance: parseFloat((totalInvoiced - totalPaid).toFixed(2)),
      overdueAmount: parseFloat(overdueAmount.toFixed(2)),
      currency,
    },
  }
}
