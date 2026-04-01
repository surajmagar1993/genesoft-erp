"use server"

import { prisma } from "@/lib/prisma"
import { getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"

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

interface RecordTransactionPayload {
  contactId: string
  type: LedgerEntryType
  amount: number | Prisma.Decimal
  referenceId?: string
  description?: string
  date?: Date
}

/**
 * Records a financial transaction in the ledger and updates the contact's running balance.
 */
export async function recordTransaction(payload: RecordTransactionPayload) {
  const tenantId = await getTenantId()
  const { contactId, type, amount, referenceId, description, date } = payload

  const decimalAmount = new Prisma.Decimal(amount)

  return await prisma.$transaction(async (tx) => {
    const contact = await tx.contact.findUnique({
      where: { id: contactId, tenantId },
      select: { balance: true }
    })

    if (!contact) throw new Error("Contact not found")

    const newBalance = new Prisma.Decimal(contact.balance).add(decimalAmount)

    const entry = await tx.ledgerEntry.create({
      data: {
        tenantId,
        contactId,
        type,
        amount: decimalAmount,
        balance: newBalance,
        referenceId,
        description,
        date: date || new Date(),
      }
    })

    // Perform atomic balance update to prevent race conditions
    await tx.contact.update({
      where: { id: contactId, tenantId },
      data: { balance: { increment: decimalAmount } }
    })

    revalidatePath(`/crm/contacts/${contactId}`)
    return entry
  })
}

/**
 * Fetches the ledger history for a specific customer, structured for the UI.
 */
export async function getCustomerLedger(contactId: string): Promise<CustomerLedgerData> {
  const tenantId = await getTenantId()

  const dbEntries = await prisma.ledgerEntry.findMany({
    where: {
      contactId,
      tenantId
    },
    orderBy: {
      date: 'desc'
    }
  })

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
      currency_code: "INR", // Default to INR for now
    }
  })

  // Calculate summary
  const totalInvoiced = entries.reduce((acc, e) => acc + e.debit, 0)
  const totalPaid = entries.reduce((acc, e) => acc + e.credit, 0)
  const latestBalance = entries.length > 0 ? entries[0].balance : 0

  return {
    entries,
    summary: {
      totalInvoiced,
      totalPaid,
      outstandingBalance: latestBalance,
      overdueAmount: 0,
      currency: "INR"
    }
  }
}
