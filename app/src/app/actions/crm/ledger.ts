"use server"

import { prisma } from "@/lib/prisma"
import { getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"
import { convertAmount } from "@/lib/exchange-rates"

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
  currencyCode?: string // The currency of the transaction (e.g. USD)
  referenceId?: string
  description?: string
  date?: Date
}

/**
 * Records a financial transaction in the ledger and updates the contact's running balance.
 * Normalizes the amount to the tenant's base currency for balance tracking.
 */
export async function recordTransaction(payload: RecordTransactionPayload) {
  const tenantId = await getTenantId()
  const { contactId, type, amount, currencyCode = "INR", referenceId, description, date } = payload

  const transactionAmount = new Prisma.Decimal(amount)

  return await (prisma as any).$transaction(async (tx: any) => {
    // 1. Fetch Tenant and Contact to get base currency and current balance
    const tenant = await tx.tenant.findUnique({
      where: { id: tenantId },
      select: { currencyCode: true }
    })
    
    const contact = await tx.contact.findUnique({
      where: { id: contactId, tenantId },
      select: { balance: true }
    })

    if (!tenant || !contact) throw new Error("Tenant or Contact not found")

    // 2. Normalize amount to Base Currency
    const baseCurrency = tenant.currencyCode
    let amountInBaseCurrency = transactionAmount

    if (currencyCode !== baseCurrency) {
      amountInBaseCurrency = await convertAmount(transactionAmount, currencyCode, baseCurrency)
    }

    const newBalance = new Prisma.Decimal(contact.balance).add(amountInBaseCurrency)

    // 3. Create Ledger Entry (Saving original currency)
    const entry = await (tx as any).ledgerEntry.create({
      data: {
        tenantId,
        contactId,
        type,
        amount: amountInBaseCurrency, // We store the normalized amount in the 'amount' column
        balance: newBalance,
        currencyCode, // This stores the ORIGINAL currency for audit
        referenceId,
        description: currencyCode !== baseCurrency 
          ? `${description} (Original: ${transactionAmount} ${currencyCode})`
          : description,
        date: date || new Date(),
      }
    })

    // 4. Update Contact Balance (Normalized)
    await tx.contact.update({
      where: { id: contactId, tenantId },
      data: { balance: { increment: amountInBaseCurrency } }
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

  const [dbEntries, tenant] = await Promise.all([
    (prisma as any).ledgerEntry.findMany({
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
