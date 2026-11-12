"use server"

import { reportCaught } from "@/lib/error-reporting"
import type { BillStatus, InvoiceStatus, Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { pick, toRow, toRows } from "@/lib/pg-row"
import { isRecordId } from "@/lib/utils"
import { getTenantId, getTenantManagerId, getTenantWriterId } from "@/lib/get-tenant-id"
import { assertTenantRefs } from "@/lib/tenant-refs"
import { fireWorkflowEvent } from "@/lib/workflow-engine"
import { revalidatePath } from "next/cache"
import { recordContactTransaction } from "@/lib/contact-ledger"
import { postToLedger } from "@/lib/ledger"
import { syncInvoiceStock } from "@/lib/stock"
import { logTenantAudit } from "@/lib/tenant-audit"

/** Module access checked by the tenant helpers (src/lib/access.ts) */
const MODULE = ["finance", "sales"] as const

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
  
  invoices?: { invoice_number: string; total: number; currency_code: string } | null
  bills?: { bill_number: string; total: number; currency_code: string } | null
  contacts?: { display_name: string; company_name: string | null }
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
  const tenantId = await getTenantId(MODULE)
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
  const tenantId = await getTenantId(MODULE)

  if (!isRecordId(invoiceId)) return []
  const rows = await prisma.payment.findMany({ where: { tenantId, invoiceId }, orderBy: { paymentDate: "desc" } })
  return toRows("Payment", rows)
}

/* ── Create Payment ── */
// STRIPE and PAYPAL stay in the type only so old payments still display; new payments can't use them
const PAYMENT_METHODS: PaymentMethod[] = ["CASH", "BANK_TRANSFER", "CREDIT_CARD", "DEBIT_CARD", "UPI", "CHEQUE", "OTHER"]

/** A refusal the user should read as written (not a fault to report) */
class UserError extends Error {}

export async function createPayment(payload: CreatePaymentPayload): Promise<{ id: string | null; error: string | null }> {
  const tenantId = await getTenantWriterId(MODULE)
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
  const invoiceDoc = payload.invoice_id
    ? await prisma.invoice.findFirst({ where: { id: payload.invoice_id, tenantId }, select: { currencyCode: true, status: true, type: true, contactId: true } })
    : null
  const billDoc = !invoiceDoc && payload.bill_id
    ? await prisma.bill.findFirst({ where: { id: payload.bill_id, tenantId }, select: { currencyCode: true, status: true, contactId: true } })
    : null
  // Only issued documents can be paid: a draft or proforma isn't in the books yet (no sale, no stock movement)
  if (invoiceDoc && (invoiceDoc.type === "PROFORMA" || ["DRAFT", "CANCELLED", "REJECTED", "EXPIRED"].includes(invoiceDoc.status))) {
    return {
      id: null,
      error: invoiceDoc.type === "PROFORMA"
        ? "A proforma invoice can't take payments. Convert it to a tax invoice first."
        : invoiceDoc.status === "DRAFT"
          ? "This invoice is still a draft. Edit it and mark it as Sent before recording a payment."
          : `A ${invoiceDoc.status.toLowerCase()} invoice can't take payments.`,
    }
  }
  if (billDoc && (billDoc.status === "DRAFT" || billDoc.status === "VOID")) {
    return { id: null, error: billDoc.status === "DRAFT" ? "This bill is still a draft. Open it before recording a payment." : "A void bill can't take payments." }
  }
  const doc = invoiceDoc ?? billDoc
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { currencyCode: true } })
  // The document's currency; a payment with no document may name one, else the business's own (never assumed)
  const givenCurrency = /^[A-Za-z]{3}$/.test(String(payload.currency_code || "")) ? String(payload.currency_code).toUpperCase() : null
  const currencyCode = doc?.currencyCode || givenCurrency || tenant?.currencyCode
  if (!currencyCode) return { id: null, error: "Set your business's currency in Settings before recording payments." }
  // Money in for an invoice, money out for a bill; only a payment with no document chooses
  const type = invoiceDoc ? "INBOUND" : billDoc ? "OUTBOUND" : payload.type
  if (type !== "INBOUND" && type !== "OUTBOUND") return { id: null, error: "Choose whether this is money received or money paid." }
  // The payment belongs to the document's customer or supplier, whatever the form sent
  const contactId = doc?.contactId || payload.contact_id
  if (!contactId) return { id: null, error: "Choose the customer or supplier." }

  let paymentId: string
  try {
    paymentId = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Lock the document while its balance is checked, so two payments saved at the same
      // moment (or a double click) can't pay it twice over
      if (invoiceDoc) {
        await tx.$queryRaw`select id from invoices where id = ${payload.invoice_id} and tenant_id = ${tenantId}::uuid for update`
        const [inv, paid] = await Promise.all([
          tx.invoice.findFirstOrThrow({ where: { id: payload.invoice_id!, tenantId }, select: { total: true, invoiceNumber: true } }),
          tx.payment.aggregate({ where: { invoiceId: payload.invoice_id!, tenantId }, _sum: { amount: true } }),
        ])
        const due = Math.round(Number(inv.total) * 100) - Math.round(Number(paid._sum.amount || 0) * 100)
        if (Math.round(amount * 100) > due) throw new UserError(`Invoice ${inv.invoiceNumber} has ${currencyCode} ${(Math.max(0, due) / 100).toFixed(2)} left to pay. Enter that amount or less.`)
      } else if (billDoc) {
        await tx.$queryRaw`select id from bills where id = ${payload.bill_id}::uuid and tenant_id = ${tenantId}::uuid for update`
        const [bill, paid] = await Promise.all([
          tx.bill.findFirstOrThrow({ where: { id: payload.bill_id!, tenantId }, select: { total: true, billNumber: true } }),
          tx.payment.aggregate({ where: { billId: payload.bill_id!, tenantId }, _sum: { amount: true } }),
        ])
        const due = Math.round(Number(bill.total) * 100) - Math.round(Number(paid._sum.amount || 0) * 100)
        if (Math.round(amount * 100) > due) throw new UserError(`Bill ${bill.billNumber} has ${currencyCode} ${(Math.max(0, due) / 100).toFixed(2)} left to pay. Enter that amount or less.`)
      }
      const payment = await tx.payment.create({
        data: {
          tenantId,
          invoiceId: invoiceDoc ? payload.invoice_id! : null,
          billId: billDoc ? payload.bill_id! : null,
          contactId,
          amount,
          paymentDate,
          paymentMethod: payload.payment_method,
          type,
          reference: payload.reference ? String(payload.reference).slice(0, 200) : null,
          notes: payload.notes ? String(payload.notes).slice(0, 2000) : null,
          currencyCode,
        },
        select: { id: true },
      })
      return payment.id
    })
  } catch (paymentError) {
    if (paymentError instanceof UserError) return { id: null, error: paymentError.message }
    await reportCaught(paymentError, "createPayment", { tenantId, invoiceId: payload.invoice_id, billId: payload.bill_id })
    return { id: null, error: "Failed to record the payment" }
  }

  await postToLedger(tenantId, { kind: "payment", id: paymentId })

  // Ledger: a payment received lowers what the customer owes
  if (type === "INBOUND") {
    try {
      await recordContactTransaction(tenantId, {
        contactId,
        type: "PAYMENT",
        amount: -Math.abs(amount),
        currencyCode,
        referenceId: paymentId,
        description: `Payment received via ${payload.payment_method}`,
        date: paymentDate,
      })
    } catch (ledgerError) {
      await reportCaught(ledgerError, "createPayment: customer balance entry", { tenantId, paymentId })
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
    const customer = await prisma.contact.findFirst({ where: { id: contactId, tenantId }, select: { displayName: true } })
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
  const tenantId = await getTenantManagerId(MODULE)

  const p = await prisma.payment.findFirst({ where: { id, tenantId }, select: { invoiceId: true, billId: true, amount: true, currencyCode: true, reference: true } })
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
  await logTenantAudit(tenantId, "PAYMENT_DELETED", { target: { type: "PAYMENT", id }, metadata: { amount: Number(p.amount), currency: p.currencyCode, reference: p.reference, invoiceId: p.invoiceId, billId: p.billId } })

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
  const tenantId = await getTenantWriterId(MODULE)
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, tenantId }, select: { total: true, status: true } })
  if (!invoice) return

  const agg = await prisma.payment.aggregate({ where: { invoiceId, tenantId }, _sum: { amount: true } })
  const newStatus = statusFromPayments(invoice.status, Number(invoice.total || 0), Number(agg._sum.amount || 0), "SENT")
  if (newStatus !== invoice.status) {
    await prisma.invoice.updateMany({ where: { id: invoiceId, tenantId }, data: { status: newStatus as InvoiceStatus } })
    // The status decides whether the sale is in the books and moves stock: keep both in step
    await postToLedger(tenantId, { kind: "invoice", id: invoiceId })
    await syncInvoiceStock(tenantId, { invoiceId })
  }
}

/* ── Helper: Sync Bill Status ── */
export async function syncBillStatus(billId: string) {
  const tenantId = await getTenantWriterId(MODULE)
  const bill = await prisma.bill.findFirst({ where: { id: billId, tenantId }, select: { total: true, status: true } })
  if (!bill) return

  const agg = await prisma.payment.aggregate({ where: { billId, tenantId }, _sum: { amount: true } })
  const newStatus = statusFromPayments(bill.status, Number(bill.total || 0), Number(agg._sum.amount || 0), "OPEN")
  if (newStatus !== bill.status) {
    await prisma.bill.updateMany({ where: { id: billId, tenantId }, data: { status: newStatus as BillStatus } })
    await postToLedger(tenantId, { kind: "bill", id: billId })
  }
}
