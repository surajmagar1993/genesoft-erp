import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { convertAmount } from "@/lib/exchange-rates"

/**
 * Customer/supplier statement (ledger_entries + contacts.balance). Server-only;
 * takes the tenant id so background jobs (recurring invoices) can use it too.
 */
export type LedgerEntryType = "INVOICE" | "PAYMENT" | "CREDIT_NOTE" | "REFUND" | "OPENING_BALANCE"

export interface RecordTransactionPayload {
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
export async function recordContactTransaction(tenantId: string, payload: RecordTransactionPayload) {
  const { contactId, type, amount, referenceId, description, date } = payload

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

    // 2. Normalize amount to Base Currency. Without a currency the amount is
    // already in the business's own (never assume INR).
    const baseCurrency = tenant.currencyCode
    const currencyCode = payload.currencyCode || baseCurrency
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

    return entry
  })
}
