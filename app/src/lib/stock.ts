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
