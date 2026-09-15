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
    barcode: string | null
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

        const customAttrs = (typeof p.customAttributes === "object" && p.customAttributes !== null) ? p.customAttributes : {}
        const barcode = (customAttrs as any).barcode || p.sku || null

        return {
            id: p.id,
            name: p.name,
            sku: p.sku,
            barcode,
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

// ────────────────────────────────────────────
// Barcode & QR Code Actions
// ────────────────────────────────────────────

export async function getProductByBarcode(code: string): Promise<{ product: any | null }> {
    const tenantId = await getTenantId()
    const clean = code.trim()
    if (!clean) return { product: null }

    // Direct lookup by SKU, serial number, or exact ID
    const directMatch = await prisma.product.findFirst({
        where: {
            tenantId,
            OR: [
                { sku: { equals: clean, mode: "insensitive" } },
                { serialNo: { equals: clean, mode: "insensitive" } },
                { modelNo: { equals: clean, mode: "insensitive" } },
            ]
        },
        include: {
            warehouseStocks: {
                include: {
                    warehouse: {
                        select: { id: true, name: true, code: true }
                    }
                }
            }
        }
    })

    let product = directMatch

    // Fallback: check customAttributes JSON or search all products
    if (!product) {
        const candidates = await prisma.product.findMany({
            where: { tenantId, isActive: true },
            include: {
                warehouseStocks: {
                    include: {
                        warehouse: { select: { id: true, name: true, code: true } }
                    }
                }
            },
            take: 250
        })

        product = candidates.find((p: any) => {
            const attrs = (typeof p.customAttributes === "object" && p.customAttributes !== null) ? p.customAttributes : {}
            const b = (attrs as any).barcode
            return b && String(b).toLowerCase() === clean.toLowerCase()
        }) || null
    }

    if (!product) return { product: null }

    const customAttrs = (typeof product.customAttributes === "object" && product.customAttributes !== null) ? product.customAttributes : {}
    const barcode = (customAttrs as any).barcode || product.sku || null

    return {
        product: {
            id: product.id,
            name: product.name,
            sku: product.sku,
            barcode,
            category: product.category,
            brand: product.brand,
            unit: product.unit || "Nos",
            unitPrice: Number(product.unitPrice),
            currency: product.currency || "INR",
            stockQty: Number(product.stockQty),
            isActive: product.isActive,
            warehouseBreakdown: product.warehouseStocks.map((ws: any) => ({
                warehouseId: ws.warehouseId,
                warehouseName: ws.warehouse.name,
                warehouseCode: ws.warehouse.code,
                quantity: Number(ws.quantity),
                reorderPoint: Number(ws.reorderPoint)
            }))
        }
    }
}

export async function quickScanAdjustStock(params: {
    productId: string
    warehouseId: string
    quantity: number
    type: "IN" | "OUT"
    reason: string
    referenceNo?: string
}) {
    return adjustStock({
        productId: params.productId,
        warehouseId: params.warehouseId,
        quantity: params.quantity,
        type: params.type,
        reason: params.reason,
        referenceNo: params.referenceNo
    })
}

// ── Inventory Reports & Valuation Engine ─────────────────────────────────────
export interface StockValuationItem {
    productId: string
    productName: string
    sku: string | null
    barcode: string | null
    category: string
    stockQty: number
    unit: string
    costPrice: number
    totalCostValue: number
    sellingPrice: number
    totalRetailValue: number
    potentialMarginAmount: number
    potentialMarginPercent: number
    status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK"
    warehouseAllocations: {
        warehouseId: string
        warehouseName: string
        warehouseCode: string
        quantity: number
    }[]
}

export interface StockVelocityItem {
    productId: string
    productName: string
    sku: string | null
    category: string
    currentStock: number
    totalInflow: number
    totalOutflow: number
    netChange: number
    movementCount: number
    turnoverVelocity: "FAST_MOVING" | "MODERATE" | "SLOW_MOVING" | "DEAD_STOCK"
}

export interface MultiDepotMatrixRow {
    productId: string
    productName: string
    sku: string | null
    category: string
    totalQty: number
    depotQuantities: Record<string, number>
}

export interface InventoryReportsResult {
    kpis: {
        totalAssetCostValue: number
        totalRetailValue: number
        potentialGrossProfit: number
        grossMarginPercent: number
        totalTrackedSKUs: number
        deficitSKUCount: number
    }
    valuationReport: StockValuationItem[]
    velocityReport: StockVelocityItem[]
    matrixReport: {
        warehouses: { id: string; name: string; code: string }[]
        rows: MultiDepotMatrixRow[]
    }
}

export async function getInventoryReportsData(
    timeRange: "30d" | "90d" | "365d" | "all" = "30d"
): Promise<InventoryReportsResult> {
    const tenantId = await getTenantId()

    try {
        const [products, warehouses, movements] = await Promise.all([
            prisma.product.findMany({
                where: { tenantId, isActive: true },
                include: {
                    warehouseStocks: {
                        include: { warehouse: true }
                    },
                    billItems: {
                        take: 1,
                        orderBy: { bill: { billDate: "desc" } },
                        select: { unitPrice: true }
                    }
                },
                orderBy: { name: "asc" }
            }),
            prisma.warehouse.findMany({
                where: { tenantId, isActive: true },
                orderBy: { name: "asc" }
            }),
            prisma.stockMovement.findMany({
                where: {
                    tenantId,
                    ...(timeRange !== "all" ? {
                        createdAt: {
                            gte: new Date(Date.now() - (timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 365) * 24 * 60 * 60 * 1000)
                        }
                    } : {})
                },
                select: {
                    productId: true,
                    type: true,
                    quantity: true,
                    createdAt: true
                }
            })
        ])

        const movementMap = new Map<string, { inflow: number; outflow: number; count: number }>()
        for (const m of movements) {
            const entry = movementMap.get(m.productId) || { inflow: 0, outflow: 0, count: 0 }
            const qty = Number(m.quantity)
            entry.count += 1
            if (m.type === "IN" || m.type === "RETURN") {
                entry.inflow += qty
            } else if (m.type === "OUT" || m.type === "DAMAGE") {
                entry.outflow += qty
            }
            movementMap.set(m.productId, entry)
        }

        let totalAssetCostValue = 0
        let totalRetailValue = 0
        let deficitSKUCount = 0

        const valuationReport: StockValuationItem[] = []
        const velocityReport: StockVelocityItem[] = []
        const matrixRows: MultiDepotMatrixRow[] = []

        for (const p of products) {
            const stockQty = Number(p.stockQty)
            const sellingPrice = Number(p.unitPrice)

            let costPrice = 0
            if (p.billItems && p.billItems.length > 0 && Number(p.billItems[0].unitPrice) > 0) {
                costPrice = Number(p.billItems[0].unitPrice)
            } else if (p.customAttributes && typeof p.customAttributes === "object" && (p.customAttributes as any).costPrice) {
                costPrice = Number((p.customAttributes as any).costPrice) || 0
            } else if (sellingPrice > 0) {
                costPrice = parseFloat((sellingPrice * 0.65).toFixed(2))
            }

            const totalCost = parseFloat((stockQty * costPrice).toFixed(2))
            const totalRetail = parseFloat((stockQty * sellingPrice).toFixed(2))
            const marginAmount = parseFloat((totalRetail - totalCost).toFixed(2))
            const marginPercent = totalRetail > 0 ? parseFloat(((marginAmount / totalRetail) * 100).toFixed(1)) : 0

            totalAssetCostValue += totalCost
            totalRetailValue += totalRetail

            const minReorder = p.warehouseStocks.reduce((sum: number, ws: any) => sum + Number(ws.reorderPoint || 0), 0)
            let status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" = "IN_STOCK"
            if (stockQty <= 0) {
                status = "OUT_OF_STOCK"
                deficitSKUCount += 1
            } else if (stockQty <= minReorder && minReorder > 0) {
                status = "LOW_STOCK"
                deficitSKUCount += 1
            }

            const warehouseAllocations = p.warehouseStocks.map((ws: any) => ({
                warehouseId: ws.warehouseId,
                warehouseName: ws.warehouse.name,
                warehouseCode: ws.warehouse.code,
                quantity: Number(ws.quantity)
            }))

            valuationReport.push({
                productId: p.id,
                productName: p.name,
                sku: p.sku,
                barcode: (p.customAttributes as any)?.barcode || null,
                category: p.category || "General",
                stockQty,
                unit: p.unit || "Nos",
                costPrice,
                totalCostValue: totalCost,
                sellingPrice,
                totalRetailValue: totalRetail,
                potentialMarginAmount: marginAmount,
                potentialMarginPercent: marginPercent,
                status,
                warehouseAllocations
            })

            const moves = movementMap.get(p.id) || { inflow: 0, outflow: 0, count: 0 }
            let turnoverVelocity: "FAST_MOVING" | "MODERATE" | "SLOW_MOVING" | "DEAD_STOCK" = "DEAD_STOCK"
            if (moves.outflow >= 50 || moves.count >= 15) {
                turnoverVelocity = "FAST_MOVING"
            } else if (moves.outflow >= 15 || moves.count >= 5) {
                turnoverVelocity = "MODERATE"
            } else if (moves.outflow > 0 || moves.inflow > 0) {
                turnoverVelocity = "SLOW_MOVING"
            } else {
                turnoverVelocity = "DEAD_STOCK"
            }

            velocityReport.push({
                productId: p.id,
                productName: p.name,
                sku: p.sku,
                category: p.category || "General",
                currentStock: stockQty,
                totalInflow: moves.inflow,
                totalOutflow: moves.outflow,
                netChange: moves.inflow - moves.outflow,
                movementCount: moves.count,
                turnoverVelocity
            })

            const depotMap: Record<string, number> = {}
            for (const w of warehouses) {
                const alloc = p.warehouseStocks.find((ws: any) => ws.warehouseId === w.id)
                depotMap[w.id] = alloc ? Number(alloc.quantity) : 0
            }
            matrixRows.push({
                productId: p.id,
                productName: p.name,
                sku: p.sku,
                category: p.category || "General",
                totalQty: stockQty,
                depotQuantities: depotMap
            })
        }

        const potentialGrossProfit = parseFloat((totalRetailValue - totalAssetCostValue).toFixed(2))
        const grossMarginPercent = totalRetailValue > 0 ? parseFloat(((potentialGrossProfit / totalRetailValue) * 100).toFixed(1)) : 0

        return {
            kpis: {
                totalAssetCostValue: parseFloat(totalAssetCostValue.toFixed(2)),
                totalRetailValue: parseFloat(totalRetailValue.toFixed(2)),
                potentialGrossProfit,
                grossMarginPercent,
                totalTrackedSKUs: products.length,
                deficitSKUCount
            },
            valuationReport,
            velocityReport,
            matrixReport: {
                warehouses: warehouses.map((w: any) => ({ id: w.id, name: w.name, code: w.code })),
                rows: matrixRows
            }
        }
    } catch (error: any) {
        console.error("Error in getInventoryReportsData:", error)
        return {
            kpis: {
                totalAssetCostValue: 0,
                totalRetailValue: 0,
                potentialGrossProfit: 0,
                grossMarginPercent: 0,
                totalTrackedSKUs: 0,
                deficitSKUCount: 0
            },
            valuationReport: [],
            velocityReport: [],
            matrixReport: {
                warehouses: [],
                rows: []
            }
        }
    }
}
