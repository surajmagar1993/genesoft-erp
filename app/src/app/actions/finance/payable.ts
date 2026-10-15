"use server"

import { prisma } from "@/lib/prisma"
import { pick, toRow, toRows } from "@/lib/pg-row"
import { getTenantId } from "@/lib/get-tenant-id"

export interface PayableSummary {
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

export interface CreditorSummary {
  contactId: string
  displayName: string
  totalOwed: number
  overdue: number
  lastBillDate: string | null
}

/**
 * Get global payable metrics for the dashboard
 */
export async function getPayableSummary(): Promise<PayableSummary> {
  const tenantId = await getTenantId()
  const now = new Date()

  // Fetch all non-paid bills
  const bills = (await prisma.bill.findMany({ where: { tenantId, status: { notIn: ["PAID", "VOID"] } } }))
    .map((b) => pick(toRow("Bill", b), ["id", "total", "status", "bill_date", "due_date", "currency_code"]) as { id: string; total: number; status: string; bill_date: string; due_date: string | null; currency_code: string })

  // Fetch all outbound payments for these bills
  const billIds = bills?.map(b => b.id) || []
  let payments: any[] = []
  
  if (billIds.length > 0) {
    payments = (await prisma.payment.findMany({ where: { tenantId, billId: { in: billIds }, type: "OUTBOUND" }, select: { billId: true, amount: true } }))
      .map((p) => ({ bill_id: p.billId, amount: Number(p.amount) }))
  }

  const summary: PayableSummary = {
    totalOutstanding: 0,
    totalOverdue: 0,
    agingBuckets: {
      current: 0,
      thirtyToSixty: 0,
      sixtyToNinety: 0,
      ninetyPlus: 0,
    },
    currency: bills?.[0]?.currency_code || "INR"
  }

  for (const bill of bills ?? []) {
    const totalPayments = payments
      .filter(p => p.bill_id === bill.id)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0)
    
    const balance = Number(bill.total || 0) - totalPayments
    if (balance <= 0) continue

    summary.totalOutstanding += balance

    const dueDate = new Date(bill.due_date || bill.bill_date)
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
 * Get top creditors (vendors) grouped by contact
 */
export async function getTopCreditors(limit = 10): Promise<CreditorSummary[]> {
  const tenantId = await getTenantId()
  const now = new Date()

  // Fetch bills with contact info
  const bills = (await prisma.bill.findMany({ where: { tenantId, status: { notIn: ["PAID", "VOID"] } }, include: { contact: { select: { displayName: true } } } }))
    .map((b) => ({
      ...(pick(toRow("Bill", b), ["id", "total", "status", "bill_date", "due_date", "contact_id"]) as { id: string; total: number; status: string; bill_date: string; due_date: string | null; contact_id: string }),
      contacts: { display_name: b.contact.displayName },
    }))

  // Fetch payments
  const billIds = bills?.map(b => b.id) || []
  let payments: any[] = []
  
  if (billIds.length > 0) {
    payments = (await prisma.payment.findMany({ where: { tenantId, billId: { in: billIds }, type: "OUTBOUND" }, select: { billId: true, amount: true } }))
      .map((p) => ({ bill_id: p.billId, amount: Number(p.amount) }))
  }

  const creditorMap = new Map<string, CreditorSummary>()

  for (const bill of bills ?? []) {
    const totalPayments = payments
      .filter(p => p.bill_id === bill.id)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0)
    
    const balance = Number(bill.total || 0) - totalPayments
    if (balance <= 0) continue

    const contactId = bill.contact_id
    const displayName = (bill.contacts as any)?.display_name || "Unknown Vendor"
    const isOverdue = bill.due_date && new Date(bill.due_date) < now

    if (!creditorMap.has(contactId)) {
      creditorMap.set(contactId, {
        contactId,
        displayName,
        totalOwed: 0,
        overdue: 0,
        lastBillDate: bill.bill_date
      })
    }

    const creditor = creditorMap.get(contactId)!
    creditor.totalOwed += balance
    if (isOverdue) creditor.overdue += balance
    
    // Track most recent bill
    if (!creditor.lastBillDate || new Date(bill.bill_date) > new Date(creditor.lastBillDate)) {
      creditor.lastBillDate = bill.bill_date
    }
  }

  return Array.from(creditorMap.values())
    .sort((a, b) => b.totalOwed - a.totalOwed)
    .slice(0, limit)
    .map(c => ({
      ...c,
      totalOwed: parseFloat(c.totalOwed.toFixed(2)),
      overdue: parseFloat(c.overdue.toFixed(2))
    }))
}
