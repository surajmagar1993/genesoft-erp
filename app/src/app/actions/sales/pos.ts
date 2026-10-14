"use server"

import { prisma } from "@/lib/prisma"
import { postToLedger } from "@/lib/ledger"
import { deductStockForSale } from "@/lib/stock"
import { createClient } from "@/lib/supabase/server"
import { getTenantTaxContext, invoiceItemTaxColumns, productTaxRate } from "@/lib/tenant-tax"
import { getTenantId, getTenantWriterId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"
import type {
  POSProductItem,
  POSTransactionData,
  POSSessionRecord,
  POSSaleResult,
} from "./pos-types"

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

function dec(v: unknown): number {
  if (v === null || v === undefined) return 0
  return Number(v)
}

// ────────────────────────────────────────────
// Products for POS Grid
// ────────────────────────────────────────────

export async function getPOSProducts(): Promise<POSProductItem[]> {
  const tenantId = await getTenantId()
  const defaultRate = (await getTenantTaxContext(tenantId)).regime.defaultRate

  const products = await prisma.product.findMany({
    where: { tenantId, isActive: true },
    select: {
      id: true,
      name: true,
      sku: true,
      category: true,
      unitPrice: true,
      currency: true,
      unit: true,
      hsnSacCode: true,
      stockQty: true,
      imageUrl: true,
      type: true,
      customAttributes: true,
      taxGroup: { select: { taxRates: { select: { name: true, rate: true, isActive: true } } } },
    },
    orderBy: { name: "asc" },
  })

  return products.map((p: any) => {
    const attrs = (typeof p.customAttributes === "object" && p.customAttributes !== null) ? p.customAttributes : {}
    const barcode = (attrs as any).barcode || p.sku || null
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      barcode,
      category: p.category,
      unitPrice: dec(p.unitPrice),
      currency: p.currency,
      unit: p.unit,
      hsnSacCode: p.hsnSacCode,
      stockQty: dec(p.stockQty),
      taxRate: productTaxRate(p.taxGroup, defaultRate),
      imageUrl: p.imageUrl,
      type: p.type,
    }
  })
}

export async function searchPOSProducts(
  query: string
): Promise<POSProductItem[]> {
  const tenantId = await getTenantId()
  const defaultRate = (await getTenantTaxContext(tenantId)).regime.defaultRate

  const products = await prisma.product.findMany({
    where: {
      tenantId,
      isActive: true,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { sku: { contains: query, mode: "insensitive" } },
        { category: { contains: query, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      sku: true,
      category: true,
      unitPrice: true,
      currency: true,
      unit: true,
      hsnSacCode: true,
      stockQty: true,
      imageUrl: true,
      type: true,
      customAttributes: true,
      taxGroup: { select: { taxRates: { select: { name: true, rate: true, isActive: true } } } },
    },
    orderBy: { name: "asc" },
    take: 20,
  })

  return products.map((p: any) => {
    const attrs = (typeof p.customAttributes === "object" && p.customAttributes !== null) ? p.customAttributes : {}
    const barcode = (attrs as any).barcode || p.sku || null
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      barcode,
      category: p.category,
      unitPrice: dec(p.unitPrice),
      currency: p.currency,
      unit: p.unit,
      hsnSacCode: p.hsnSacCode,
      stockQty: dec(p.stockQty),
      taxRate: productTaxRate(p.taxGroup, defaultRate),
      imageUrl: p.imageUrl,
      type: p.type,
    }
  })
}

// ────────────────────────────────────────────
// Quick Walk-In Contact
// ────────────────────────────────────────────

export async function quickCreateWalkInContact(
  name: string,
  phone?: string
): Promise<{ id: string; displayName: string }> {
  const tenantId = await getTenantWriterId()

  const contact = await prisma.contact.create({
    data: {
      tenantId,
      displayName: name || "Walk-In Customer",
      firstName: name || "Walk-In",
      phone: phone || null,
      type: "INDIVIDUAL",
      customerGroup: "retail",
      tags: JSON.stringify(["walk-in", "pos"]),
    },
    select: { id: true, displayName: true },
  })

  return contact
}

// ────────────────────────────────────────────
// Create POS Sale (Invoice + Payment)
// ────────────────────────────────────────────

export async function createPOSSale(
  data: POSTransactionData
): Promise<POSSaleResult> {
  const supabase = await createClient()
  const tenantId = await getTenantWriterId()

  try {
    // 1. Resolve or create contact
    let contactId = data.contactId
    if (contactId && !(await prisma.contact.count({ where: { id: contactId, tenantId } }))) {
      return { success: false, error: "Customer not found" }
    }
    if (!contactId) {
      const walkIn = await quickCreateWalkInContact(
        data.customerName || "Walk-In Customer",
        data.customerPhone || undefined
      )
      contactId = walkIn.id
    }

    // 2. Generate invoice number
    const { data: tenant } = await supabase
      .from("tenants")
      .select("fiscal_year_start")
      .eq("id", tenantId)
      .single()

    const fiscalMonthStart = tenant?.fiscal_year_start || 4
    const now = new Date()
    let startYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    if (currentMonth < fiscalMonthStart) startYear -= 1
    const endYear = startYear + 1
    const fyPrefix = `${startYear}-${endYear.toString().slice(-2)}`

    const latestInvoice = await prisma.invoice.findFirst({
      where: {
        tenantId,
        invoiceNumber: { startsWith: `POS-${fyPrefix}-` },
      },
      orderBy: { invoiceNumber: "desc" },
      select: { invoiceNumber: true },
    })

    let nextSeq = 1
    if (latestInvoice && latestInvoice.invoiceNumber) {
      const parts = latestInvoice.invoiceNumber.split("-")
      const lastSeq = parseInt(parts[parts.length - 1], 10)
      if (!isNaN(lastSeq)) nextSeq = lastSeq + 1
    }

    const invoiceNumber = `POS-${fyPrefix}-${nextSeq.toString().padStart(4, "0")}`

    // 3. Price and tax on the server from the products' tax rates (never the browser's totals)
    const taxCtx = await getTenantTaxContext(tenantId)
    const productIds = [...new Set(data.items.map((i) => i.productId).filter(Boolean))]
    const products = await prisma.product.findMany({
      where: { tenantId, id: { in: productIds } },
      select: { id: true, unitPrice: true, taxGroup: { select: { taxRates: { select: { name: true, rate: true, isActive: true } } } } },
    })
    if (products.length !== productIds.length) return { success: false, error: "Product not found" }
    const productById = new Map(products.map((p: { id: string }) => [p.id, p]))
    const supplyType = taxCtx.regime.mode === "SINGLE" ? "single" : "intra" // walk-in counter sale
    const lines = data.items.map((item) => {
      const product = productById.get(item.productId) as { unitPrice: unknown; taxGroup: never } | undefined
      const qty = Number(item.qty)
      if (!(qty > 0)) throw new Error("Quantity must be greater than zero")
      const unitPrice = product ? Number(product.unitPrice) : Number(item.unitPrice)
      const rate = productTaxRate(product?.taxGroup, taxCtx.regime.defaultRate)
      return { item, qty, unitPrice, columns: invoiceItemTaxColumns(qty, unitPrice, rate, supplyType) }
    })
    const subtotal = Math.round(lines.reduce((s, l) => s + l.qty * l.unitPrice, 0) * 100) / 100
    const taxAmount = Math.round(lines.reduce((s, l) => s + l.columns.lineTotal - l.qty * l.unitPrice, 0) * 100) / 100
    const discount = Math.max(0, Number((data as { discount?: number }).discount || 0))
    const total = Math.round((subtotal + taxAmount - discount) * 100) / 100

    const invoice = await prisma.invoice.create({
      data: {
        tenantId,
        contactId,
        invoiceNumber,
        type: "TAX_INVOICE",
        status: "PAID",
        invoiceDate: now,
        billTo: {
          name: data.customerName || "Walk-In Customer",
          email: "",
          posTerminal: true,
          paymentMethod: data.paymentMethod,
        },
        subtotal,
        taxAmount,
        discount,
        total,
        currencyCode: taxCtx.currency,
        notes: data.notes || `POS Sale • ${data.paymentMethod}`,
        terms: "Immediate walk-in sale. Thank you for your business!",
        items: {
          create: lines.map(({ item, qty, unitPrice, columns }) => ({
            productId: item.productId || null,
            description: item.name,
            hsnSacCode: item.hsnSacCode || null,
            quantity: qty,
            unitPrice,
            ...columns,
          })),
        },
      },
    })

    // 4. Record Payment via Prisma
    const paymentMethodMap: Record<string, any> = {
      CASH: "CASH",
      CARD: "CREDIT_CARD",
      UPI: "UPI",
      OTHER: "OTHER",
    }

    const posPayment = await prisma.payment.create({
      data: {
        tenantId,
        invoiceId: invoice.id,
        contactId,
        amount: total,
        paymentDate: now,
        paymentMethod: paymentMethodMap[data.paymentMethod] || "CASH",
        type: "INBOUND",
        reference: `POS-${invoiceNumber}`,
        currencyCode: taxCtx.currency,
      },
    })

    // 6. Update POS session totals if active
    if (data.sessionId) {
      await prisma.pOSSession.updateMany({
        where: { id: data.sessionId, tenantId },
        data: {
          totalSales: { increment: total },
          totalTx: { increment: 1 },
        },
      })
    }

    await postToLedger(tenantId, { kind: "invoice", id: invoice.id })
    await postToLedger(tenantId, { kind: "payment", id: posPayment.id })

    // Sold goods leave stock
    await deductStockForSale(prisma, tenantId, lines.map((l) => ({ productId: l.item.productId, quantity: l.qty })), invoiceNumber)

    revalidatePath("/sales/invoices")
    revalidatePath("/sales/pos")

    return {
      success: true,
      invoiceId: invoice.id,
      invoiceNumber,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("POS sale error:", message)
    return { success: false, error: message }
  }
}

// ────────────────────────────────────────────
// POS Session Management
// ────────────────────────────────────────────

export async function getActivePOSSession(): Promise<POSSessionRecord | null> {
  const tenantId = await getTenantId()

  const session = await prisma.pOSSession.findFirst({
    where: { tenantId, status: "OPEN" },
    orderBy: { openedAt: "desc" },
  })

  if (!session) return null

  return {
    id: session.id,
    openedBy: session.openedBy,
    openedAt: session.openedAt.toISOString(),
    closedAt: session.closedAt?.toISOString() ?? null,
    openingCash: dec(session.openingCash),
    closingCash: session.closingCash ? dec(session.closingCash) : null,
    totalSales: dec(session.totalSales),
    totalTx: session.totalTx,
    status: session.status,
    notes: session.notes,
  }
}

export async function openPOSSession(
  openingCash: number,
  staffName: string
): Promise<POSSessionRecord> {
  const tenantId = await getTenantWriterId()

  // Close any existing open sessions
  await prisma.pOSSession.updateMany({
    where: { tenantId, status: "OPEN" },
    data: { status: "CLOSED", closedAt: new Date() },
  })

  const session = await prisma.pOSSession.create({
    data: {
      tenantId,
      openedBy: staffName,
      openingCash,
    },
  })

  return {
    id: session.id,
    openedBy: session.openedBy,
    openedAt: session.openedAt.toISOString(),
    closedAt: null,
    openingCash: dec(session.openingCash),
    closingCash: null,
    totalSales: 0,
    totalTx: 0,
    status: "OPEN",
    notes: null,
  }
}

export async function closePOSSession(
  sessionId: string,
  closingCash: number,
  notes?: string
): Promise<{
  success: boolean
  variance?: number
}> {
  const tenantId = await getTenantWriterId()

  const session = await prisma.pOSSession.findFirst({
    where: { id: sessionId, tenantId },
  })

  if (!session) return { success: false }

  const expectedCash =
    dec(session.openingCash) + dec(session.totalSales)
  const variance = closingCash - expectedCash

  await prisma.pOSSession.update({
    where: { id: sessionId },
    data: {
      closedAt: new Date(),
      closingCash,
      notes: notes || null,
      status: "CLOSED",
    },
  })

  return { success: true, variance }
}

// ────────────────────────────────────────────
// Customer Search for POS
// ────────────────────────────────────────────

export async function searchPOSCustomers(query: string) {
  const tenantId = await getTenantId()

  const contacts = await prisma.contact.findMany({
    where: {
      tenantId,
      isActive: true,
      OR: [
        { displayName: { contains: query, mode: "insensitive" } },
        { phone: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      displayName: true,
      phone: true,
      email: true,
      customerGroup: true,
    },
    take: 10,
    orderBy: { displayName: "asc" },
  })

  return contacts
}
