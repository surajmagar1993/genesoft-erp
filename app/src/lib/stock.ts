import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

type Db = Prisma.TransactionClient | typeof prisma

/** The warehouse sales are taken from: the business's default, else its first active one. */
export async function defaultWarehouseId(db: Db, tenantId: string): Promise<string | null> {
    const w = await db.warehouse.findFirst({
        where: { tenantId, isActive: true },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        select: { id: true },
    })
    return w?.id ?? null
}

/**
 * Takes sold goods out of stock: lowers the product's stock and its stock in
 * the warehouse, and records an OUT movement. Services are skipped. A sale
 * is never blocked by low stock (stock may go negative and show as a shortage).
 */
export async function deductStockForSale(
    db: Db,
    tenantId: string,
    lines: { productId: string | null | undefined; quantity: number }[],
    reference: string,
    warehouseId?: string | null
): Promise<void> {
    const wanted = lines.filter((l) => l.productId && Number(l.quantity) > 0) as { productId: string; quantity: number }[]
    if (wanted.length === 0) return
    const products: { id: string; type: string }[] = await db.product.findMany({
        where: { tenantId, id: { in: [...new Set(wanted.map((l) => l.productId))] } },
        select: { id: true, type: true },
    })
    const goods = new Set(products.filter((p) => p.type === "PRODUCT").map((p) => p.id))
    const warehouse = warehouseId ?? (await defaultWarehouseId(db, tenantId))

    for (const line of wanted) {
        if (!goods.has(line.productId)) continue
        const qty = Number(line.quantity)
        await db.product.updateMany({ where: { id: line.productId, tenantId }, data: { stockQty: { decrement: qty } } })
        if (!warehouse) continue
        const stock = await db.warehouseStock.findFirst({ where: { tenantId, warehouseId: warehouse, productId: line.productId } })
        const previousQty = stock ? Number(stock.quantity) : 0
        const newQty = previousQty - qty
        if (stock) await db.warehouseStock.update({ where: { id: stock.id }, data: { quantity: newQty } })
        else await db.warehouseStock.create({ data: { tenantId, warehouseId: warehouse, productId: line.productId, quantity: newQty } })
        await db.stockMovement.create({
            data: {
                tenantId,
                productId: line.productId,
                warehouseId: warehouse,
                type: "OUT",
                quantity: qty,
                previousQty,
                newQty,
                reason: `Sale ${reference}`,
                referenceNo: reference,
                performedBy: "Sales",
            },
        })
    }
}

const LIVE_INVOICE = ["SENT", "VIEWED", "PARTIALLY_PAID", "PAID", "OVERDUE"]

/**
 * Makes an invoice's stock movements match its current lines (like the
 * ledger sync): an issued tax invoice takes its goods out of stock; editing
 * it moves only the difference; cancelling, deleting or turning it back to
 * draft puts the goods back. Movements are matched by the invoice number
 * (referenceNo) and a "Sale" reason, so POS sales (which record the same way)
 * are never counted twice. Pass the number explicitly for a deleted invoice.
 */
export async function syncInvoiceStock(tenantId: string, ref: { invoiceId?: string; invoiceNumber?: string }): Promise<void> {
    const inv = ref.invoiceId
        ? await prisma.invoice.findFirst({
              where: { id: ref.invoiceId, tenantId },
              select: { invoiceNumber: true, status: true, type: true, items: { select: { productId: true, quantity: true } } },
          })
        : null
    const number = inv?.invoiceNumber ?? ref.invoiceNumber
    if (!number) return
    const live = inv && LIVE_INVOICE.includes(inv.status) && (inv.type === "TAX_INVOICE" || inv.type === "DEBIT_NOTE")

    const target = new Map<string, number>()
    if (live) {
        for (const i of inv.items as { productId: string | null; quantity: unknown }[]) {
            if (i.productId) target.set(i.productId, (target.get(i.productId) || 0) + Number(i.quantity))
        }
    }

    const moves: { productId: string; warehouseId: string; type: string; quantity: unknown }[] = await prisma.stockMovement.findMany({
        where: { tenantId, referenceNo: number, reason: { startsWith: "Sale" } },
        select: { productId: true, warehouseId: true, type: true, quantity: true },
        orderBy: { createdAt: "asc" },
    })
    const current = new Map<string, number>()
    const lastWarehouse = new Map<string, string>()
    for (const m of moves) {
        current.set(m.productId, (current.get(m.productId) || 0) + (m.type === "OUT" ? 1 : -1) * Number(m.quantity))
        if (m.type === "OUT") lastWarehouse.set(m.productId, m.warehouseId)
    }

    const toDeduct: { productId: string; quantity: number }[] = []
    for (const productId of new Set([...target.keys(), ...current.keys()])) {
        const diff = Math.round(((target.get(productId) || 0) - (current.get(productId) || 0)) * 100) / 100
        if (diff > 0) toDeduct.push({ productId, quantity: diff })
        else if (diff < 0) await restoreStock(tenantId, productId, -diff, number, lastWarehouse.get(productId) ?? null)
    }
    if (toDeduct.length) await deductStockForSale(prisma, tenantId, toDeduct, number)
}

/** Puts goods back (sale cancelled, deleted or reduced) with an IN movement. */
async function restoreStock(tenantId: string, productId: string, qty: number, reference: string, warehouseId: string | null) {
    await prisma.product.updateMany({ where: { id: productId, tenantId }, data: { stockQty: { increment: qty } } })
    const warehouse = warehouseId ?? (await defaultWarehouseId(prisma, tenantId))
    if (!warehouse) return
    const stock = await prisma.warehouseStock.findFirst({ where: { tenantId, warehouseId: warehouse, productId } })
    const previousQty = stock ? Number(stock.quantity) : 0
    const newQty = previousQty + qty
    if (stock) await prisma.warehouseStock.update({ where: { id: stock.id }, data: { quantity: newQty } })
    else await prisma.warehouseStock.create({ data: { tenantId, warehouseId: warehouse, productId, quantity: newQty } })
    await prisma.stockMovement.create({
        data: { tenantId, productId, warehouseId: warehouse, type: "IN", quantity: qty, previousQty, newQty, reason: `Sale reversal ${reference}`, referenceNo: reference, performedBy: "Sales" },
    })
}

/** For actions: never fails the action; problems go to System Logs. */
export async function postInvoiceStock(tenantId: string, ref: { invoiceId?: string; invoiceNumber?: string }): Promise<void> {
    try {
        await syncInvoiceStock(tenantId, ref)
    } catch (err) {
        const { reportError } = await import("@/lib/error-reporting")
        await reportError({ source: "server", kind: "stock", path: "stock:invoice", message: `Stock update failed for invoice ${ref.invoiceNumber ?? ref.invoiceId}: ${err instanceof Error ? err.message : String(err)}`, stack: err instanceof Error ? err.stack : undefined })
    }
}
