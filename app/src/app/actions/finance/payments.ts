"use server"

import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"
import { recordTransaction } from "@/app/actions/crm/ledger"

export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "CREDIT_CARD" | "DEBIT_CARD" | "UPI" | "CHEQUE" | "STRIPE" | "PAYPAL" | "OTHER"

export interface PaymentDB {
  id: string
  tenant_id: string
  invoice_id: string | null
  bill_id: string | null
  contact_id: string
  amount: number
  payment_date: string
  payment_method: PaymentMethod
  type: "INBOUND" | "OUTBOUND"
  reference: string | null
  notes: string | null
  currency_code: string
  created_at: string
  updated_at: string
  
  invoices?: any
  bills?: any
  contacts?: any
}

export interface CreatePaymentPayload {
  invoice_id?: string | null
  bill_id?: string | null
  contact_id: string
  amount: number
  payment_date: string
  payment_method: PaymentMethod
  type?: "INBOUND" | "OUTBOUND"
  reference?: string
  notes?: string
  currency_code?: string
}

/* ── Read All Payments ── */
export async function getPayments(
  page: number = 1, 
  limit: number = 10
): Promise<{ data: PaymentDB[]; total: number }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()
  const offset = (page - 1) * limit

  const { data, count, error } = await supabase
    .from("payments")
    .select("*, invoices(invoice_number, total, currency_code), bills(bill_number, total, currency_code), contacts(display_name, company_name)", { count: "exact" })
    .eq("tenant_id", tenantId)
    .order("payment_date", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error("getPayments error:", error.message)
    return { data: [], total: 0 }
  }
  return { data: data ?? [], total: count || 0 }
}

/* ── Read By Invoice ── */
export async function getPaymentsByInvoice(invoiceId: string): Promise<PaymentDB[]> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("invoice_id", invoiceId)
    .order("payment_date", { ascending: false })

  if (error) {
    console.error("getPaymentsByInvoice error:", error.message)
    return []
  }
  return data ?? []
}

/* ── Create Payment ── */
export async function createPayment(payload: CreatePaymentPayload): Promise<{ id: string | null; error: string | null }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  // 1. Insert Payment
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      ...payload,
      tenant_id: tenantId,
      type: payload.type || (payload.invoice_id ? "INBOUND" : "OUTBOUND")
    })
    .select("id")
    .single()

  if (paymentError || !payment) {
    console.error("createPayment error:", paymentError?.message)
    return { id: null, error: paymentError?.message ?? "Failed to create payment" }
  }

  // 2. Ledger Integration
  if (payment.id) {
    const isInbound = (payload.type === "INBOUND" || (!payload.type && !!payload.invoice_id))
    if (isInbound && payload.contact_id) {
        try {
            await recordTransaction({
                contactId: payload.contact_id,
                type: "PAYMENT",
                amount: -Math.abs(payload.amount), // Credit (-)
                referenceId: payment.id,
                description: `Payment received via ${payload.payment_method}`,
                date: new Date(payload.payment_date)
            })
        } catch (ledgerError) {
            console.error("Ledger recording failed during payment:", ledgerError)
        }
    }
  }

  // 3. Recalculate Status
  if (payload.invoice_id) {
    await syncInvoiceStatus(payload.invoice_id)
    revalidatePath("/sales/invoices")
    revalidatePath(`/sales/invoices/${payload.invoice_id}`)
  } else if (payload.bill_id) {
    await syncBillStatus(payload.bill_id)
    revalidatePath("/finance/bills")
    revalidatePath(`/finance/bills/${payload.bill_id}`)
  }

  revalidatePath("/finance/payments")
  revalidatePath("/finance/payable")
  
  return { id: payment.id, error: null }
}

/* ── Delete Payment ── */
export async function deletePayment(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  // 1. Get the payment first to know what to sync
  const { data: p } = await supabase
    .from("payments")
    .select("invoice_id, bill_id")
    .eq("id", id)
    .single()

  // 2. Delete the payment
  const { error } = await supabase
    .from("payments")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (error) {
    console.error("deletePayment error:", error.message)
    return { error: error.message }
  }

  // 3. Recalculate status
  if (p?.invoice_id) {
    await syncInvoiceStatus(p.invoice_id)
    revalidatePath("/sales/invoices")
    revalidatePath(`/sales/invoices/${p.invoice_id}`)
  } else if (p?.bill_id) {
    await syncBillStatus(p.bill_id)
    revalidatePath("/finance/bills")
    revalidatePath(`/finance/bills/${p.bill_id}`)
  }

  // ─── LEDGER INTEGRATION ───
  try {
    const entry = await (prisma as any).ledgerEntry.findFirst({
        where: { referenceId: id, tenantId }
    })
    
    if (entry) {
        await (prisma as any).$transaction(async (tx: any) => {
            // Adjust balance: CurrentBalance - EntryAmount
            // Since Payment amount was negative, decrementing it will increase the balance back.
            await tx.contact.update({
                where: { id: entry.contactId },
                data: { balance: { decrement: entry.amount } }
            })
            // Delete entry
            await (tx as any).ledgerEntry.delete({ where: { id: entry.id } })
        })
    }
  } catch (ledgerError) {
    console.error("Ledger cleanup failed for payment:", ledgerError)
  }

  revalidatePath("/finance/payments")
  revalidatePath("/finance/payable")
  
  return { error: null }
}

/* ── Helper: Sync Invoice Status ── */
export async function syncInvoiceStatus(invoiceId: string) {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  // a. Fetch invoice total
  const { data: invoice } = await supabase
    .from("invoices")
    .select("total, status")
    .eq("id", invoiceId)
    .eq("tenant_id", tenantId)
    .single()

  if (!invoice) return

  // b. Fetch sum of all payments
  const { data: payments } = await supabase
    .from("payments")
    .select("amount")
    .eq("invoice_id", invoiceId)
    .eq("tenant_id", tenantId)

  const totalPaid = (payments ?? []).reduce((acc, p) => acc + Number(p.amount), 0)
  const totalAmount = Number(invoice.total || 0)

  let newStatus = invoice.status

  if (totalPaid >= totalAmount && totalAmount > 0) {
    newStatus = "PAID"
  } else if (totalPaid > 0) {
    newStatus = "PARTIALLY_PAID"
  } else {
    // If deleted all payments, fallback to SENT if it was paid
    if (newStatus === "PAID" || newStatus === "PARTIALLY_PAID") {
      newStatus = "SENT"
    }
  }

  // c. Update Invoice status if changed
  if (newStatus !== invoice.status) {
    await supabase
      .from("invoices")
      .update({ status: newStatus })
      .eq("id", invoiceId)
      .eq("tenant_id", tenantId)
  }
}

/* ── Helper: Sync Bill Status ── */
export async function syncBillStatus(billId: string) {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { data: bill } = await supabase
    .from("bills")
    .select("total, status")
    .eq("id", billId)
    .eq("tenant_id", tenantId)
    .single()

  if (!bill) return

  const { data: payments } = await supabase
    .from("payments")
    .select("amount")
    .eq("bill_id", billId)
    .eq("tenant_id", tenantId)

  const totalPaid = (payments ?? []).reduce((acc, p) => acc + Number(p.amount), 0)
  const totalAmount = Number(bill.total || 0)

  let newStatus = bill.status

  if (totalPaid >= totalAmount && totalAmount > 0) {
    newStatus = "PAID"
  } else if (totalPaid > 0) {
    newStatus = "PARTIALLY_PAID"
  } else {
    if (newStatus === "PAID" || newStatus === "PARTIALLY_PAID") {
      newStatus = "OPEN"
    }
  }

  if (newStatus !== bill.status) {
    await supabase
      .from("bills")
      .update({ status: newStatus })
      .eq("id", billId)
      .eq("tenant_id", tenantId)
  }
}
