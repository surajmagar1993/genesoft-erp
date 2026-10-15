"use server"

import type { BillStatus, InvoiceStatus, Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { pick, toRow, toRows } from "@/lib/pg-row"
import { isRecordId } from "@/lib/utils"
import { getTenantId, getTenantManagerId, getTenantWriterId } from "@/lib/get-tenant-id"
import { assertTenantRefs } from "@/lib/tenant-refs"
import { fireWorkflowEvent } from "@/lib/workflow-engine"
import { revalidatePath } from "next/cache"
import { recordTransaction } from "@/app/actions/crm/ledger"
import { postToLedger } from "@/lib/ledger"

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
  const tenantId = await getTenantId()
  const offset = (page - 1) * limit

  try {
    const [rows, total] = await Promise.all([
      prisma.payment.findMany({ where: { tenantId }, include: { invoice: true, bill: true, contact: true }, orderBy: { paymentDate: "desc" }, skip: offset, take: limit }),
      prisma.payment.count({ where: { tenantId } }),
    ])
    const data = rows.map((p) => ({
      ...toRow<PaymentDB>("Payment", p),
      invoices: p.invoice ? (pick(toRow("Invoice", p.invoice), ["invoice_number", "total", "currency_code"]) as PaymentDB["invoices"]) : null,
      bills: p.bill ? (pick(toRow("Bill", p.bill), ["bill_number", "total", "currency_code"]) as PaymentDB["bills"]) : null,
      contacts: pick(toRow("Contact", p.contact), ["display_name", "company_name"]) as PaymentDB["contacts"],
    }))
    return { data, total }
  } catch (err) {
    console.error("getPayments error:", err)
    return { data: [], total: 0 }
  }
}

/* ── Read By Invoice ── */
export async function getPaymentsByInvoice(invoiceId: string): Promise<PaymentDB[]> {
  const tenantId = await getTenantId()

  if (!isRecordId(invoiceId)) return []
  const rows = await prisma.payment.findMany({ where: { tenantId, invoiceId }, orderBy: { paymentDate: "desc" } })
  return toRows("Payment", rows)
}

/* ── Create Payment ── */
const PAYMENT_METHODS: PaymentMethod[] = ["CASH", "BANK_TRANSFER", "CREDIT_CARD", "DEBIT_CARD", "UPI", "CHEQUE", "STRIPE", "PAYPAL", "OTHER"]

export async function createPayment(payload: CreatePaymentPayload): Promise<{ id: string | null; error: string | null }> {
  const tenantId = await getTenantWriterId()
  try {
    await assertTenantRefs(tenantId, { invoice: payload.invoice_id, bill: payload.bill_id, contact: payload.contact_id })
  } catch (refError) {
    return { id: null, error: refError instanceof Error ? refError.message : "Invalid reference" }
  }

  const amount = Number(payload.amount)
  if (!Number.isFinite(amount) || amount <= 0) return { id: null, error: "Enter an amount greater than zero" }
  if (!PAYMENT_METHODS.includes(payload.payment_method)) return { id: null, error: "Choose a payment method" }
  const paymentDate = new Date(payload.payment_date || Date.now())
  if (Number.isNaN(paymentDate.getTime())) return { id: null, error: "Enter a valid payment date" }

  // A payment is in the document's currency; otherwise the business's own
  const doc = payload.invoice_id
    ? await prisma.invoice.findFirst({ where: { id: payload.invoice_id, tenantId }, select: { currencyCode: true } })
    : payload.bill_id
      ? await prisma.bill.findFirst({ where: { id: payload.bill_id, tenantId }, select: { currencyCode: true } })
      : null
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { currencyCode: true } })
  const currencyCode = doc?.currencyCode || payload.currency_code || tenant?.currencyCode || "INR"
  const type = payload.type || (payload.invoice_id ? "INBOUND" : "OUTBOUND")

  let paymentId: string
  try {
    const payment = await prisma.payment.create({
      data: {
        tenantId,
        invoiceId: payload.invoice_id || null,
        billId: payload.bill_id || null,
        contactId: payload.contact_id,
        amount,
        paymentDate,
        paymentMethod: payload.payment_method,
        type,
        reference: payload.reference || null,
        notes: payload.notes || null,
        currencyCode,
      },
      select: { id: true },
    })
    paymentId = payment.id
  } catch (paymentError) {
    console.error("createPayment error:", paymentError)
    return { id: null, error: "Failed to record the payment" }
  }

  await postToLedger(tenantId, { kind: "payment", id: paymentId })

  // Ledger: a payment received lowers what the customer owes
  if (type === "INBOUND" && payload.contact_id) {
    try {
      await recordTransaction({
        contactId: payload.contact_id,
        type: "PAYMENT",
        amount: -Math.abs(amount),
        currencyCode,
        referenceId: paymentId,
        description: `Payment received via ${payload.payment_method}`,
        date: paymentDate,
      })
    } catch (ledgerError) {
      console.error("Ledger recording failed during payment:", ledgerError)
    }
  }

  if (payload.invoice_id) {
    await syncInvoiceStatus(payload.invoice_id)
    revalidatePath("/sales/invoices")
    revalidatePath(`/sales/invoices/${payload.invoice_id}`)
  } else if (payload.bill_id) {
    await syncBillStatus(payload.bill_id)
    revalidatePath("/finance/bills")
    revalidatePath(`/finance/bills/${payload.bill_id}`)
  }

  if (type === "INBOUND") {
    const customer = payload.contact_id
      ? await prisma.contact.findFirst({ where: { id: payload.contact_id, tenantId }, select: { displayName: true } })
      : null
    fireWorkflowEvent(tenantId, "PAYMENT_RECEIVED", {
      amount,
      paymentMethod: payload.payment_method,
      customerName: customer?.displayName ?? null,
    }, paymentId)
  }

  revalidatePath("/finance/payments")
  revalidatePath("/finance/payable")

  return { id: paymentId, error: null }
}

/* ── Delete Payment ── */
export async function deletePayment(id: string): Promise<{ error: string | null }> {
  const tenantId = await getTenantManagerId()

  const p = await prisma.payment.findFirst({ where: { id, tenantId }, select: { invoiceId: true, billId: true } })
  if (!p) return { error: "Payment not found" }

  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.payment.deleteMany({ where: { id, tenantId } })
      // Undo its ledger entry: the entry amount was negative, so this raises the balance back
      const entry = await tx.ledgerEntry.findFirst({ where: { referenceId: id, tenantId } })
      if (entry) {
        await tx.contact.updateMany({ where: { id: entry.contactId, tenantId }, data: { balance: { decrement: entry.amount } } })
        await tx.ledgerEntry.deleteMany({ where: { id: entry.id, tenantId } })
      }
    })
  } catch (error) {
    console.error("deletePayment error:", error)
    return { error: "Failed to delete the payment" }
  }
  await postToLedger(tenantId, { kind: "payment", id })

  if (p.invoiceId) {
    await syncInvoiceStatus(p.invoiceId)
    revalidatePath("/sales/invoices")
    revalidatePath(`/sales/invoices/${p.invoiceId}`)
  } else if (p.billId) {
    await syncBillStatus(p.billId)
    revalidatePath("/finance/bills")
    revalidatePath(`/finance/bills/${p.billId}`)
  }

  revalidatePath("/finance/payments")
  revalidatePath("/finance/payable")

  return { error: null }
}

/** PAID / PARTIALLY_PAID from the payments so far; with none left a paid document goes back to `unpaidStatus`. */
function statusFromPayments(current: string, total: number, paid: number, unpaidStatus: string): string {
  if (paid >= total && total > 0) return "PAID"
  if (paid > 0) return "PARTIALLY_PAID"
  return current === "PAID" || current === "PARTIALLY_PAID" ? unpaidStatus : current
}

/* ── Helper: Sync Invoice Status ── */
export async function syncInvoiceStatus(invoiceId: string) {
  const tenantId = await getTenantWriterId()
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, tenantId }, select: { total: true, status: true } })
  if (!invoice) return

  const agg = await prisma.payment.aggregate({ where: { invoiceId, tenantId }, _sum: { amount: true } })
  const newStatus = statusFromPayments(invoice.status, Number(invoice.total || 0), Number(agg._sum.amount || 0), "SENT")
  if (newStatus !== invoice.status) {
    await prisma.invoice.updateMany({ where: { id: invoiceId, tenantId }, data: { status: newStatus as InvoiceStatus } })
  }
}

/* ── Helper: Sync Bill Status ── */
export async function syncBillStatus(billId: string) {
  const tenantId = await getTenantWriterId()
  const bill = await prisma.bill.findFirst({ where: { id: billId, tenantId }, select: { total: true, status: true } })
  if (!bill) return

  const agg = await prisma.payment.aggregate({ where: { billId, tenantId }, _sum: { amount: true } })
  const newStatus = statusFromPayments(bill.status, Number(bill.total || 0), Number(agg._sum.amount || 0), "OPEN")
  if (newStatus !== bill.status) {
    await prisma.bill.updateMany({ where: { id: billId, tenantId }, data: { status: newStatus as BillStatus } })
  }
}
