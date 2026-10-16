"use server"

import { getTenantId, getTenantManagerId, getTenantWriterId } from "@/lib/get-tenant-id"
import { getCurrentUser } from "@/lib/current-user"
import { postToLedger } from "@/lib/ledger"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { pick, toRow, toRows, type PgRow } from "@/lib/pg-row"
import { computeInvoiceGstSummary, computeLineItemGst } from "@/lib/gst-engine"
import { assertTenantRefs } from "@/lib/tenant-refs"
import { isUuid } from "@/lib/utils"

export type BillStatus = "DRAFT" | "OPEN" | "PARTIALLY_PAID" | "PAID" | "VOID"

export interface BillItem {
  id?: string
  productId?: string
  description: string
  hsnSacCode?: string
  quantity: number
  unitPrice: number
  taxPercent: number
  taxAmount: number
  lineTotal: number
}

export interface BillData {
  contactId: string
  billNumber: string
  status: BillStatus
  billDate: Date
  dueDate?: Date
  subtotal: number
  taxAmount: number
  discount: number
  total: number
  currencyCode: string
  notes?: string
  items: BillItem[]
}

/**
 * Fetch all bills for the current tenant
 */
export async function getBills(page: number = 1, limit: number = 10) {
  try {
    const tenantId = await getTenantId(MODULE)
    const [rows, total] = await Promise.all([
      prisma.bill.findMany({ where: { tenantId }, include: { items: true }, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      prisma.bill.count({ where: { tenantId } }),
    ])
    return { data: rows.map((b) => ({ ...toRow("Bill", b), bill_items: toRows("BillItem", b.items) })), total }
  } catch (err) {
    console.error("Error fetching bills:", err)
    return { data: [], total: 0 }
  }
}

/* ── Read Single Bill ── */
export async function getBill(id: string): Promise<PgRow | null> {
  if (!isUuid(id)) return null
  const tenantId = await getTenantId(MODULE)
  const b = await prisma.bill.findFirst({ where: { id, tenantId }, include: { items: true, contact: true, payments: true } })
  if (!b) return null
  return {
    ...toRow("Bill", b),
    bill_items: toRows("BillItem", b.items),
    contacts: pick(toRow("Contact", b.contact), ["display_name", "email", "phone", "company_name", "billing_address"]),
    payments: toRows("Payment", b.payments),
  }
}

/**
 * Fetch a single bill by ID with its items
 */
export async function getBillById(id: string) {
  const tenantId = await getTenantId(MODULE)
  const b = isUuid(id) ? await prisma.bill.findFirst({ where: { id, tenantId }, include: { items: true, contact: true } }) : null
  if (!b) throw new Error("Failed to fetch bill")
  return { ...toRow<PgRow>("Bill", b), contact: toRow("Contact", b.contact), items: toRows("BillItem", b.items) }
}

/**
 * Bill lines and totals worked out on the server (the GST engine the form
 * uses). The form doesn't send its supply type, and intra/inter-state
 * rounding can differ by a paisa, so the variant closest to the form's total
 * is kept.
 */
function billFigures(items: BillItem[], discount: number, formTotal?: number) {
  const variants = (["intra", "inter"] as const).map((supply) => {
    const lines = items.map((it, i) => {
      const q = Number(it.quantity), p = Number(it.unitPrice), t = Number(it.taxPercent ?? 0)
      if (!Number.isFinite(q) || q <= 0) throw new Error(`Line ${i + 1}: quantity must be more than 0`)
      if (!Number.isFinite(p) || p < 0) throw new Error(`Line ${i + 1}: price must be zero or more`)
      if (!Number.isFinite(t) || t < 0 || t > 100) throw new Error(`Line ${i + 1}: tax must be between 0 and 100%`)
      const g = computeLineItemGst(q, p, t, supply)
      return { ...it, quantity: q, unitPrice: p, taxPercent: t, taxAmount: g.totalTaxAmount, lineTotal: g.lineTotal }
    })
    const d = Number(discount || 0)
    if (!Number.isFinite(d) || d < 0) throw new Error("Discount must be zero or more")
    const sum = computeInvoiceGstSummary(lines.map((l) => ({ qty: l.quantity, unitPrice: l.unitPrice, gstRate: l.taxPercent })), supply, d, "FIXED")
    return { lines, subtotal: sum.subtotal, taxAmount: sum.totalTax, discount: d, total: sum.grandTotal }
  })
  return variants.reduce((best, v) => (Math.abs(v.total - Number(formTotal ?? v.total)) < Math.abs(best.total - Number(formTotal ?? best.total)) ? v : best))
}

const billItemRows = (billId: string, lines: BillItem[]) =>
  lines.map((item) => ({
    billId,
    productId: item.productId || null,
    description: item.description,
    hsnSacCode: item.hsnSacCode || null,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    taxPercent: item.taxPercent,
    taxAmount: item.taxAmount,
    lineTotal: item.lineTotal,
    // bill_items has no default id in the live database
    id: crypto.randomUUID(),
  }))

import { recordTransaction } from "@/app/actions/crm/ledger"
import { createNotification } from "@/app/actions/notifications"
import { logTenantAudit } from "@/lib/tenant-audit"

/** Module access checked by the tenant helpers (src/lib/access.ts) */
const MODULE = "finance" as const

/**
 * Create a new vendor bill
 */
export async function createBill(data: BillData) {
  const tenantId = await getTenantWriterId(MODULE)

  if (data.contactId && !(await prisma.contact.count({ where: { id: data.contactId, tenantId } }))) {
    throw new Error("Vendor not found")
  }
  await assertTenantRefs(tenantId, { product: data.items.map((i) => i.productId) })
  const fig = billFigures(data.items, data.discount, data.total)
  data = { ...data, subtotal: fig.subtotal, taxAmount: fig.taxAmount, discount: fig.discount, total: fig.total }

  // Header and lines together
  const created = await prisma.$transaction(async (tx) => {
    const b = await tx.bill.create({
      data: {
        tenantId,
        contactId: data.contactId,
        billNumber: data.billNumber,
        status: data.status,
        billDate: data.billDate,
        dueDate: data.dueDate ?? null,
        subtotal: fig.subtotal,
        taxAmount: fig.taxAmount,
        discount: fig.discount,
        total: fig.total,
        currencyCode: data.currencyCode,
        notes: data.notes ?? null,
      },
    })
    await tx.billItem.createMany({ data: billItemRows(b.id, fig.lines) })
    return b
  })
  const bill = toRow<PgRow>("Bill", created)

  // Create notification for bill creation
  try {
    const user = await getCurrentUser()
    if (user) {
        await createNotification({
            type: "bill",
            title: "New Purchase Bill",
            description: `Bill ${data.billNumber} for ${data.total} ${data.currencyCode} has been created.`,
            link: `/finance/bills/${bill.id}`,
            userId: user.id,
            tenantId: tenantId,
        })
    }
  } catch (e) {
    console.error("Failed to notify:", e)
  }

  // 3. LEDGER INTEGRATION (AP)
  if (data.status !== "DRAFT") {
    try {
        await recordTransaction({
            contactId: data.contactId,
            type: "INVOICE", // Technically a Vendor Invoice
            amount: -Math.abs(data.total), // Credit to vendor (we owe them more)
            referenceId: bill.id,
            description: `Bill ${data.billNumber} created`,
            date: data.billDate
        })
    } catch (ledgerError) {
        console.error("Ledger recording failed during bill creation:", ledgerError)
    }
  }

  await postToLedger(tenantId, { kind: "bill", id: bill.id })

  revalidatePath("/finance/bills")
  revalidatePath("/finance/payable")
  return bill
}

/**
 * Update an existing bill
 */
export async function updateBill(id: string, data: Partial<BillData>) {
  const tenantId = await getTenantWriterId(MODULE)

  if (data.contactId && !(await prisma.contact.count({ where: { id: data.contactId, tenantId } }))) {
    throw new Error("Vendor not found")
  }
  if (data.items) await assertTenantRefs(tenantId, { product: data.items.map((i) => i.productId) })

  await prisma.$transaction(async (tx) => {
    const existing = await tx.bill.findFirst({ where: { id, tenantId }, select: { discount: true } })
    if (!existing) throw new Error("Bill not found")
    // New lines → totals from the server; header-only edits keep the saved totals
    const fig = data.items ? billFigures(data.items, data.discount ?? Number(existing.discount), data.total) : null
    if (fig) Object.assign(data, { subtotal: fig.subtotal, taxAmount: fig.taxAmount, discount: fig.discount, total: fig.total })
    await tx.bill.update({
      where: { id },
      data: {
        contactId: data.contactId,
        billNumber: data.billNumber,
        status: data.status,
        billDate: data.billDate,
        dueDate: data.dueDate,
        notes: data.notes,
        currencyCode: data.currencyCode,
        ...(fig ? { subtotal: fig.subtotal, taxAmount: fig.taxAmount, discount: fig.discount, total: fig.total } : {}),
      },
    })
    if (fig) {
      await tx.billItem.deleteMany({ where: { billId: id } })
      await tx.billItem.createMany({ data: billItemRows(id, fig.lines) })
    }
  })

  await postToLedger(tenantId, { kind: "bill", id })

  revalidatePath("/finance/bills")
  revalidatePath(`/finance/bills/${id}`)
  revalidatePath("/finance/payable")

  // ─── LEDGER INTEGRATION (AP) ───
  if (data.status !== "DRAFT" && data.contactId) {
    try {
        const newTotal = -Math.abs(data.total || 0)
        
        const entry = await prisma.ledgerEntry.findFirst({
            where: { referenceId: id, tenantId }
        })

        if (entry) {
            const oldAmount = Number(entry.amount)
            if (entry.contactId !== data.contactId) {
                // Vendor changed: take the old amount off the previous vendor and post the new total to the new one
                await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
                    await tx.contact.update({
                        where: { id: entry.contactId, tenantId },
                        data: { balance: { decrement: oldAmount } }
                    })
                    await tx.contact.update({
                        where: { id: data.contactId, tenantId },
                        data: { balance: { increment: newTotal } }
                    })
                    await tx.ledgerEntry.update({
                        where: { id: entry.id },
                        data: { amount: newTotal, contactId: data.contactId }
                    })
                })
            } else if (newTotal !== oldAmount) {
                await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
                    await tx.contact.update({
                        where: { id: entry.contactId, tenantId },
                        data: { balance: { increment: newTotal - oldAmount } }
                    })
                    await tx.ledgerEntry.update({
                        where: { id: entry.id },
                        data: { amount: newTotal }
                    })
                })
            }
        } else {
            // Create if missing
            await recordTransaction({
                contactId: data.contactId,
                type: "INVOICE",
                amount: newTotal,
                referenceId: id,
                description: `Bill ${data.billNumber} updated`,
                date: data.billDate || new Date()
            })
        }
    } catch (ledgerError) {
        console.error("Ledger update failed for bill:", ledgerError)
    }
  }
}

/**
 * Delete a bill
 */
export async function deleteBill(id: string): Promise<{ error: string | null }> {
  try {
    const tenantId = await getTenantManagerId(MODULE)
    const billInfo = await prisma.bill.findFirst({ where: { id, tenantId }, select: { billNumber: true } })
    // Its payments are deleted with it (cascade); their journals are voided after
    const paymentIds: string[] = (await prisma.payment.findMany({ where: { billId: id, tenantId }, select: { id: true } })).map((p: { id: string }) => p.id)

    const { count } = await prisma.bill.deleteMany({ where: { id, tenantId } })
    if (count === 0) return { error: "Bill not found" }

    // ─── LEDGER INTEGRATION (AP) ───
    try {
        const entry = await prisma.ledgerEntry.findFirst({
            where: { referenceId: id, tenantId }
        })
        
        if (entry) {
            await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
                // Adjust balance: CurrentBalance - EntryAmount
                // Since Bill amount was negative, decrementing it will increase the balance back.
                await tx.contact.update({
                    where: { id: entry.contactId },
                    data: { balance: { decrement: entry.amount } }
                })
                // Delete entry
                await tx.ledgerEntry.delete({ where: { id: entry.id } })
            })
        }
    } catch (ledgerError) {
        console.error("Ledger cleanup failed for bill:", ledgerError)
    }

    await postToLedger(tenantId, { kind: "bill", id })
    for (const paymentId of paymentIds) await postToLedger(tenantId, { kind: "payment", id: paymentId })
    await logTenantAudit(tenantId, "BILL_DELETED", { target: { type: "BILL", id }, metadata: { billNumber: billInfo?.billNumber ?? null, paymentsRemoved: paymentIds.length } })

    revalidatePath("/finance/bills")
    revalidatePath("/finance/payable")
    return { error: null }
  } catch (err: any) {
    return { error: err.message || "Failed to delete bill" }
  }
}

/**
 * Update bill status manually
 */
export async function updateBillStatus(id: string, status: BillStatus) {
  const tenantId = await getTenantManagerId(MODULE)

  const { count } = await prisma.bill.updateMany({ where: { id, tenantId }, data: { status } })
  if (count === 0) {
    throw new Error("Failed to update bill status")
  }
  await postToLedger(tenantId, { kind: "bill", id })

  revalidatePath("/finance/bills")
  revalidatePath(`/finance/bills/${id}`)
}

/**
 * Fetch vendors for the bill form
 */
export async function getVendors(limit: number = 100) {
  const tenantId = await getTenantId(MODULE)
  const where = { tenantId, isActive: true }
  const [rows, total] = await Promise.all([
    prisma.contact.findMany({ where, orderBy: { displayName: "asc" }, take: limit }),
    prisma.contact.count({ where }),
  ])
  return { data: rows.map((c) => pick(toRow("Contact", c), ["id", "display_name", "company_name", "pan", "type"])), total }
}

/**
 * Fetch products for the bill form
 */
export async function getProducts(limit: number = 100) {
  const tenantId = await getTenantId(MODULE)

  // Prisma knows the live column mapping (the raw "unit_price" select failed on the live table)
  const where = { tenantId, isActive: true }
  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: { id: true, name: true, sku: true, unitPrice: true, hsnSacCode: true },
      orderBy: { name: "asc" },
      take: limit,
    }),
    prisma.product.count({ where }),
  ])
  const data = rows.map((p: { id: string; name: string; sku: string | null; unitPrice: unknown; hsnSacCode: string | null }) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    unit_price: Number(p.unitPrice || 0),
    hsn_sac_code: p.hsnSacCode,
  }))
  return { data, total }
}
