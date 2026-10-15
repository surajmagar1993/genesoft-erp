"use server"

import { prisma } from "@/lib/prisma"
import { getTenantId, getTenantWriterId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"
import { convertAmount } from "@/lib/exchange-rates"
import { recordContactTransaction, type RecordTransactionPayload } from "@/lib/contact-ledger"

/** Module access checked by the tenant helpers (src/lib/access.ts) */
const MODULE = ["crm", "sales", "finance"] as const

export type LedgerEntryType = "INVOICE" | "PAYMENT" | "CREDIT_NOTE" | "REFUND" | "OPENING_BALANCE"

export interface LedgerEntry {
  id: string
  date: string
  type: LedgerEntryType
  reference: string
  description: string
  debit: number
  credit: number
  balance: number
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

/**
 * Records a financial transaction in the ledger and updates the contact's running balance.
 * Normalizes the amount to the tenant's base currency for balance tracking.
 */
export async function recordTransaction(payload: RecordTransactionPayload) {
  const tenantId = await getTenantWriterId(MODULE)
  const entry = await recordContactTransaction(tenantId, payload)
  revalidatePath(`/crm/contacts/${payload.contactId}`)
  return entry
}

/**
 * Fetches the ledger history for a specific customer, structured for the UI.
 */
export async function getCustomerLedger(contactId: string): Promise<CustomerLedgerData> {
  const tenantId = await getTenantId(MODULE)

  const [dbEntries, tenant] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where: { contactId, tenantId },
      orderBy: { date: "desc" }
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { currencyCode: true }
    })
  ])

  if (!tenant) throw new Error("Tenant not found")

  // Map to UI format
  const entries: LedgerEntry[] = dbEntries.map((e: any) => {
    const amount = Number(e.amount)
    return {
      id: e.id,
      date: e.date.toISOString(),
      type: e.type as LedgerEntryType,
      reference: e.referenceId || "—",
      description: e.description || "",
      debit: amount > 0 ? amount : 0,
      credit: amount < 0 ? Math.abs(amount) : 0,
      balance: Number(e.balance),
      currency_code: e.currencyCode,
    }
  })

  // Calculate summary
  const latestBalance = entries.length > 0 ? entries[0].balance : 0

  return {
    entries,
    summary: {
      totalInvoiced: entries.reduce((acc, e) => acc + e.debit, 0),
      totalPaid: entries.reduce((acc, e) => acc + e.credit, 0),
      outstandingBalance: latestBalance,
      overdueAmount: 0,
      currency: tenant.currencyCode, // Base Currency
    }
  }
}
