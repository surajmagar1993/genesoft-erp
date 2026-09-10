"use server"

import { prisma } from "@/lib/prisma"
import { getTenantId } from "@/lib/get-tenant-id"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { StockMovementType } from "@prisma/client"

export interface WarehouseItem {
    id: string
    name: string
    code: string
    address: string | null
    city: string | null
    state: string | null
    country: string | null
    contactName: string | null
    contactPhone: string | null
    isDefault: boolean
    isActive: boolean
    createdAt: Date
    updatedAt: Date
    itemCount: number
    totalUnits: number
}

export interface InventoryProduct {
    id: string
    name: string
    sku: string | null
    category: string | null
    brand: string | null
    unit: string
    unitPrice: number
    currency: string
    stockQty: number
    isActive: boolean
    reorderPoint: number
    totalValue: number
    status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK"
    warehouseBreakdown: {
        warehouseId: string
        warehouseName: string
        warehouseCode: string
        quantity: number
        reorderPoint: number
    }[]
}

export interface StockMovementRecord {
    id: string
    productId: string
    productName: string
    productSku: string | null
    warehouseId: string
    warehouseName: string
    toWarehouseId: string | null
    toWarehouseName: string | null
    type: StockMovementType
    quantity: number
    previousQty: number
    newQty: number
    reason: string | null
    referenceNo: string | null
    performedBy: string | null
    createdAt: Date
}

export interface InventoryOverviewData {
    telemetry: {
        totalValuation: number
        totalUnits: number
        activeWarehousesCount: number
        lowStockItemsCount: number
        outOfStockCount: number
        totalProductsCount: number
    }
    warehouses: WarehouseItem[]
    products: InventoryProduct[]
    recentMovements: StockMovementRecord[]
}

/**
 * Ensures a tenant has at least one default warehouse provisioned.
 * Links existing products to this default warehouse automatically.
 */
async function ensureDefaultWarehouse(tenantId: string) {
    const existing = await prisma.warehouse.findFirst({
        where: { tenantId }
    })

    if (existing) return existing

    // Provision initial default warehouse
    const defaultWarehouse = await prisma.warehouse.create({
        data: {
            tenantId,
            name: "Central Logistics Hub",
            code: "WH-MAIN",
            address: "Main Logistics Facility, Sector 4",
            city: "Mumbai",
            state: "Maharashtra",
            country: "India",
            contactName: "Warehouse Supervisor",
            contactPhone: "+91 98200 12345",
            isDefault: true,
            isActive: true
        }
    })

    // Seed existing tenant products into this warehouse
    const products = await prisma.product.findMany({
        where: { tenantId, type: "PRODUCT" }
    })

    if (products.length > 0) {
        await prisma.warehouseStock.createMany({
            data: products.map((p: any) => ({
                tenantId,
                warehouseId: defaultWarehouse.id,
                productId: p.id,
                quantity: p.stockQty,
                reorderPoint: 10
            })),
            skipDuplicates: true
        })
    }

    return defaultWarehouse
}

/**
 * Retrieves the complete inventory overview, including telemetry, warehouse rosters,
 * SKU inventory levels, and recent audit movements.
 */
export async function getInventoryOverview(): Promise<InventoryOverviewData> {
    const tenantId = await getTenantId()
    await ensureDefaultWarehouse(tenantId)

    // 1. Fetch Warehouses
    const rawWarehouses = await prisma.warehouse.findMany({
        where: { tenantId },
        include: {
            warehouseStocks: {
                select: {
                    quantity: true
                }
            }
        },
        orderBy: [
            { isDefault: "desc" },
            { name: "asc" }
        ]
    })

    const warehouses: WarehouseItem[] = rawWarehouses.map((w: any) => {
        const totalUnits = w.warehouseStocks.reduce((sum: number, s: any) => sum + Number(s.quantity), 0)
        const itemCount = w.warehouseStocks.filter((s: any) => Number(s.quantity) > 0).length
        return {
            id: w.id,
            name: w.name,
            code: w.code,
            address: w.address,
            city: w.city,
            state: w.state,
            country: w.country,
            contactName: w.contactName,
            contactPhone: w.contactPhone,
            isDefault: w.isDefault,
            isActive: w.isActive,
            createdAt: w.createdAt,
            updatedAt: w.updatedAt,
            itemCount,
            totalUnits
        }
    })

    // 2. Fetch Products and warehouse stocks
    const rawProducts = await prisma.product.findMany({
        where: { tenantId, type: "PRODUCT" },
        include: {
            warehouseStocks: {
                include: {
                    warehouse: {
                        select: { id: true, name: true, code: true }
                    }
                }
            }
        },
        orderBy: { name: "asc" }
    })

    let totalValuation = 0
    let totalUnits = 0
    let lowStockCount = 0
    let outOfStockCount = 0

    const products: InventoryProduct[] = rawProducts.map((p: any) => {
        const unitPriceNum = Number(p.unitPrice)
        const stockQtyNum = Number(p.stockQty)
        const productValuation = stockQtyNum * unitPriceNum
        totalValuation += productValuation
        totalUnits += stockQtyNum

        // Calculate minimum reorder point across warehouses (or default to 10)
        const reorderPoint = p.warehouseStocks.length > 0 
            ? Math.min(...p.warehouseStocks.map((s: any) => Number(s.reorderPoint)))
            : 10

        let status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" = "IN_STOCK"
        if (stockQtyNum <= 0) {
            status = "OUT_OF_STOCK"
            outOfStockCount++
        } else if (stockQtyNum <= reorderPoint) {
            status = "LOW_STOCK"
            lowStockCount++
        }

        const warehouseBreakdown = p.warehouseStocks.map((ws: any) => ({
            warehouseId: ws.warehouseId,
            warehouseName: ws.warehouse.name,
            warehouseCode: ws.warehouse.code,
            quantity: Number(ws.quantity),
            reorderPoint: Number(ws.reorderPoint)
        }))

        return {
            id: p.id,
            name: p.name,
            sku: p.sku,
            category: p.category,
            brand: p.brand,
            unit: p.unit || "Nos",
            unitPrice: unitPriceNum,
            currency: p.currency || "INR",
            stockQty: stockQtyNum,
            isActive: p.isActive,
            reorderPoint,
            totalValue: productValuation,
            status,
            warehouseBreakdown
        }
    })

    // 3. Fetch Recent Stock Movements (last 50)
    const rawMovements = await prisma.stockMovement.findMany({
        where: { tenantId },
        include: {
            product: {
                select: { name: true, sku: true }
            },
            sourceWarehouse: {
                select: { name: true }
            },
            destinationWarehouse: {
                select: { name: true }
            }
        },
        orderBy: { createdAt: "desc" },
        take: 50
    })

    const recentMovements: StockMovementRecord[] = rawMovements.map((m: any) => ({
        id: m.id,
        productId: m.productId,
        productName: m.product?.name || "Unknown Product",
        productSku: m.product?.sku || null,
        warehouseId: m.warehouseId,
        warehouseName: m.sourceWarehouse?.name || "Unknown Warehouse",
        toWarehouseId: m.toWarehouseId,
        toWarehouseName: m.destinationWarehouse?.name || null,
        type: m.type,
        quantity: Number(m.quantity),
        previousQty: Number(m.previousQty),
        newQty: Number(m.newQty),
        reason: m.reason,
        referenceNo: m.referenceNo,
        performedBy: m.performedBy,
        createdAt: m.createdAt
    }))

    return {
        telemetry: {
            totalValuation,
            totalUnits,
            activeWarehousesCount: warehouses.filter(w => w.isActive).length,
            lowStockItemsCount: lowStockCount,
            outOfStockCount,
            totalProductsCount: products.length
        },
        warehouses,
        products,
        recentMovements
    }
}

/**
 * Creates a new warehouse storage facility.
 */
export async function createWarehouse(data: {
    name: string
    code: string
    address?: string
    city?: string
    state?: string
    country?: string
    contactName?: string
    contactPhone?: string
    isDefault?: boolean
}) {
    const tenantId = await getTenantId()
    const cleanCode = data.code.trim().toUpperCase()
    const cleanName = data.name.trim()

    if (!cleanName) throw new Error("Warehouse name is required")
    if (!cleanCode) throw new Error("Warehouse code is required")

    // Check code uniqueness within tenant
    const existing = await prisma.warehouse.findFirst({
        where: { tenantId, code: cleanCode }
    })
    if (existing) throw new Error(`Warehouse with code '${cleanCode}' already exists`)

    if (data.isDefault) {
        await prisma.warehouse.updateMany({
            where: { tenantId, isDefault: true },
            data: { isDefault: false }
        })
    }

    const newWarehouse = await prisma.warehouse.create({
        data: {
            tenantId,
            name: cleanName,
            code: cleanCode,
            address: data.address?.trim() || null,
            city: data.city?.trim() || null,
            state: data.state?.trim() || null,
            country: data.country?.trim() || "India",
            contactName: data.contactName?.trim() || null,
            contactPhone: data.contactPhone?.trim() || null,
            isDefault: Boolean(data.isDefault),
            isActive: true
        }
    })

    revalidatePath("/inventory")
    return { success: true, warehouse: newWarehouse }
}

/**
 * Updates an existing warehouse.
 */
export async function updateWarehouse(id: string, data: {
    name: string
    code: string
    address?: string
    city?: string
    state?: string
    country?: string
    contactName?: string
    contactPhone?: string
    isDefault?: boolean
    isActive?: boolean
}) {
    const tenantId = await getTenantId()
    const cleanCode = data.code.trim().toUpperCase()
    const cleanName = data.name.trim()

    if (!cleanName) throw new Error("Warehouse name is required")
    if (!cleanCode) throw new Error("Warehouse code is required")

    // Check if code collision with another warehouse
    const duplicate = await prisma.warehouse.findFirst({
        where: {
            tenantId,
            code: cleanCode,
            NOT: { id }
        }
    })
    if (duplicate) throw new Error(`Warehouse with code '${cleanCode}' is already used`)

    if (data.isDefault) {
        await prisma.warehouse.updateMany({
            where: { tenantId, isDefault: true, NOT: { id } },
            data: { isDefault: false }
        })
    }

    const updated = await prisma.warehouse.update({
        where: { id, tenantId },
        data: {
            name: cleanName,
            code: cleanCode,
            address: data.address?.trim() || null,
            city: data.city?.trim() || null,
            state: data.state?.trim() || null,
            country: data.country?.trim() || "India",
            contactName: data.contactName?.trim() || null,
            contactPhone: data.contactPhone?.trim() || null,
            isDefault: Boolean(data.isDefault),
            isActive: data.isActive !== undefined ? Boolean(data.isActive) : true
        }
    })

    revalidatePath("/inventory")
    return { success: true, warehouse: updated }
}

/**
 * Records a stock adjustment (IN, OUT, ADJUSTMENT, DAMAGE, RETURN) atomically.
 */
export async function adjustStock(data: {
    productId: string
    warehouseId: string
    type: StockMovementType
    quantity: number
    reorderPoint?: number
    reason?: string
    referenceNo?: string
}) {
    const tenantId = await getTenantId()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const performedBy = user?.email || "Super Admin"

    if (data.quantity <= 0) throw new Error("Quantity must be greater than 0")

    // Fetch current product
    const product = await prisma.product.findFirst({
        where: { id: data.productId, tenantId }
    })
    if (!product) throw new Error("Product not found")

    // Fetch or create warehouse stock record
    let warehouseStock = await prisma.warehouseStock.findUnique({
        where: {
            warehouseId_productId: {
                warehouseId: data.warehouseId,
                productId: data.productId
            }
        }
    })

    const prevWarehouseQty = warehouseStock ? Number(warehouseStock.quantity) : 0
    const prevProductQty = Number(product.stockQty)

    let newWarehouseQty = prevWarehouseQty
    let newProductQty = prevProductQty
    let movementQty = data.quantity

    switch (data.type) {
        case "IN":
        case "RETURN":
            newWarehouseQty = prevWarehouseQty + data.quantity
            newProductQty = prevProductQty + data.quantity
            break

        case "OUT":
        case "DAMAGE":
            if (prevWarehouseQty < data.quantity) {
                throw new Error(`Cannot dispatch ${data.quantity} units. Warehouse only has ${prevWarehouseQty} units available.`)
            }
            newWarehouseQty = prevWarehouseQty - data.quantity
            newProductQty = Math.max(0, prevProductQty - data.quantity)
            break

        case "ADJUSTMENT":
            // Direct physical count reconciliation
            movementQty = Math.abs(data.quantity - prevWarehouseQty)
            const delta = data.quantity - prevWarehouseQty
            newWarehouseQty = data.quantity
            newProductQty = Math.max(0, prevProductQty + delta)
            break

        default:
            throw new Error(`Unsupported adjustment type: ${data.type}`)
    }

    // Execute atomic transaction
    await prisma.$transaction([
        // 1. Update/Upsert Warehouse Stock
        prisma.warehouseStock.upsert({
            where: {
                warehouseId_productId: {
                    warehouseId: data.warehouseId,
                    productId: data.productId
                }
            },
            create: {
                tenantId,
                warehouseId: data.warehouseId,
                productId: data.productId,
                quantity: newWarehouseQty,
                reorderPoint: data.reorderPoint !== undefined ? data.reorderPoint : 10
            },
            update: {
                quantity: newWarehouseQty,
                reorderPoint: data.reorderPoint !== undefined ? data.reorderPoint : undefined
            }
        }),

        // 2. Update Product Aggregate Stock
        prisma.product.update({
            where: { id: data.productId },
            data: { stockQty: newProductQty }
        }),

        // 3. Record Movement Log
        prisma.stockMovement.create({
            data: {
                tenantId,
                productId: data.productId,
                warehouseId: data.warehouseId,
                type: data.type,
                quantity: movementQty,
                previousQty: prevWarehouseQty,
                newQty: newWarehouseQty,
                reason: data.reason?.trim() || null,
                referenceNo: data.referenceNo?.trim() || null,
                performedBy
            }
        })
    ])

    revalidatePath("/inventory")
    revalidatePath("/sales/products")
    return { success: true, newWarehouseQty, newProductQty }
}

/**
 * Transfers stock between two physical warehouses atomically.
 */
export async function transferStock(data: {
    productId: string
    fromWarehouseId: string
    toWarehouseId: string
    quantity: number
    reason?: string
    referenceNo?: string
}) {
    const tenantId = await getTenantId()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const performedBy = user?.email || "Super Admin"

    if (data.fromWarehouseId === data.toWarehouseId) {
        throw new Error("Source and destination warehouses cannot be the same")
    }
    if (data.quantity <= 0) {
        throw new Error("Transfer quantity must be greater than 0")
    }

    // Check source warehouse stock
    const sourceStock = await prisma.warehouseStock.findUnique({
        where: {
            warehouseId_productId: {
                warehouseId: data.fromWarehouseId,
                productId: data.productId
            }
        }
    })

    const sourceQty = sourceStock ? Number(sourceStock.quantity) : 0
    if (sourceQty < data.quantity) {
        throw new Error(`Insufficient stock in source warehouse. Available: ${sourceQty} units.`)
    }

    // Check destination warehouse stock
    const destStock = await prisma.warehouseStock.findUnique({
        where: {
            warehouseId_productId: {
                warehouseId: data.toWarehouseId,
                productId: data.productId
            }
        }
    })
    const destQty = destStock ? Number(destStock.quantity) : 0

    const newSourceQty = sourceQty - data.quantity
    const newDestQty = destQty + data.quantity

    // Execute atomic transfer transaction
    await prisma.$transaction([
        // 1. Decrement source warehouse stock
        prisma.warehouseStock.update({
            where: {
                warehouseId_productId: {
                    warehouseId: data.fromWarehouseId,
                    productId: data.productId
                }
            },
            data: { quantity: newSourceQty }
        }),

        // 2. Increment destination warehouse stock
        prisma.warehouseStock.upsert({
            where: {
                warehouseId_productId: {
                    warehouseId: data.toWarehouseId,
                    productId: data.productId
                }
            },
            create: {
                tenantId,
                warehouseId: data.toWarehouseId,
                productId: data.productId,
                quantity: newDestQty,
                reorderPoint: 10
            },
            update: { quantity: newDestQty }
        }),

        // 3. Log Transfer Stock Movement
        prisma.stockMovement.create({
            data: {
                tenantId,
                productId: data.productId,
                warehouseId: data.fromWarehouseId,
                toWarehouseId: data.toWarehouseId,
                type: "TRANSFER",
                quantity: data.quantity,
                previousQty: sourceQty,
                newQty: newSourceQty,
                reason: data.reason?.trim() || `Inter-warehouse transfer`,
                referenceNo: data.referenceNo?.trim() || null,
                performedBy
            }
        })
    ])

    revalidatePath("/inventory")
    return { success: true, newSourceQty, newDestQty }
}
