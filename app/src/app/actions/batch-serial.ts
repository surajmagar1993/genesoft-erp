"use server"

import { prisma } from "@/lib/prisma"
import { getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"
import { BatchStatus, SerialStatus, StockMovementType } from "@prisma/client"
import { addMonths, isBefore, addDays } from "date-fns"

export interface BatchItem {
    id: string
    productId: string
    productName: string
    productSku: string | null
    warehouseId: string
    warehouseName: string
    warehouseCode: string
    batchNumber: string
    initialQty: number
    currentQty: number
    manufacturingDate: Date | null
    expiryDate: Date | null
    status: BatchStatus
    costPrice: number | null
    supplierBatchNo: string | null
    notes: string | null
    createdAt: Date
    updatedAt: Date
    serialCount: number
    daysToExpiry: number | null
}

export interface SerialItem {
    id: string
    productId: string
    productName: string
    productSku: string | null
    warehouseId: string | null
    warehouseName: string | null
    warehouseCode: string | null
    batchId: string | null
    batchNumber: string | null
    serialNumber: string
    status: SerialStatus
    purchaseOrderId: string | null
    poNumber: string | null
    warrantyMonths: number | null
    warrantyExpiry: Date | null
    notes: string | null
    createdAt: Date
    updatedAt: Date
}

export interface BatchSerialTelemetry {
    totalBatches: number
    activeBatches: number
    expiringSoonBatches: number
    expiredBatches: number
    recalledBatches: number
    totalSerials: number
    availableSerials: number
    allocatedSerials: number
    soldSerials: number
    defectiveSerials: number
    maintenanceSerials: number
}

export interface BatchSerialOverviewData {
    telemetry: BatchSerialTelemetry
    batches: BatchItem[]
    serials: SerialItem[]
    products: {
        id: string
        name: string
        sku: string | null
        barcode: string | null
        unit: string
        stockQty: number
    }[]
    warehouses: {
        id: string
        name: string
        code: string
    }[]
}

export interface TraceabilityAuditResult {
    found: boolean
    type?: "BATCH" | "SERIAL"
    batch?: BatchItem & {
        serialsList?: SerialItem[]
    }
    serial?: SerialItem & {
        batchDetails?: BatchItem | null
    }
    product?: {
        id: string
        name: string
        sku: string | null
        barcode: string | null
        category: string | null
        stockQty: number
    } | null
    movements?: {
        id: string
        type: string
        quantity: number
        reason: string | null
        referenceNo: string | null
        warehouseName: string
        createdAt: Date
    }[]
}

/**
 * Retrieves the comprehensive Batch & Serial Number roster, telemetry, and dropdown dependencies.
 */
export async function getBatchSerialOverview(): Promise<BatchSerialOverviewData> {
    const tenantId = await getTenantId()
    const now = new Date()
    const thirtyDaysAhead = addDays(now, 30)

    const [rawBatches, rawSerials, products, warehouses] = await Promise.all([
        prisma.productBatch.findMany({
            where: { tenantId },
            include: {
                product: {
                    select: { id: true, name: true, sku: true }
                },
                warehouse: {
                    select: { id: true, name: true, code: true }
                },
                _count: {
                    select: { serials: true }
                }
            },
            orderBy: [{ expiryDate: "asc" }, { createdAt: "desc" }]
        }),
        prisma.productSerial.findMany({
            where: { tenantId },
            include: {
                product: {
                    select: { id: true, name: true, sku: true }
                },
                warehouse: {
                    select: { id: true, name: true, code: true }
                },
                batch: {
                    select: { id: true, batchNumber: true }
                },
                purchaseOrder: {
                    select: { id: true, orderNumber: true }
                }
            },
            orderBy: { createdAt: "desc" },
            take: 250 // reasonable upper bound for responsive ledger
        }),
        prisma.product.findMany({
            where: { tenantId, type: "PRODUCT", isActive: true },
            select: { id: true, name: true, sku: true, customAttributes: true, unit: true, stockQty: true },
            orderBy: { name: "asc" }
        }),
        prisma.warehouse.findMany({
            where: { tenantId, isActive: true },
            select: { id: true, name: true, code: true },
            orderBy: { name: "asc" }
        })
    ])

    let activeBatches = 0
    let expiringSoonBatches = 0
    let expiredBatches = 0
    let recalledBatches = 0

    const batches: BatchItem[] = rawBatches.map((b: any) => {
        let daysToExpiry: number | null = null
        if (b.expiryDate) {
            const diffTime = new Date(b.expiryDate).getTime() - now.getTime()
            daysToExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        }

        // Count telemetry
        if (b.status === "ACTIVE") {
            activeBatches++
            if (b.expiryDate && isBefore(new Date(b.expiryDate), thirtyDaysAhead) && Number(b.currentQty) > 0) {
                expiringSoonBatches++
            }
        }
        if (b.status === "EXPIRED" || (b.expiryDate && isBefore(new Date(b.expiryDate), now) && Number(b.currentQty) > 0)) {
            expiredBatches++
        }
        if (b.status === "RECALLED") {
            recalledBatches++
        }

        return {
            id: b.id,
            productId: b.productId,
            productName: b.product.name,
            productSku: b.product.sku,
            warehouseId: b.warehouseId,
            warehouseName: b.warehouse.name,
            warehouseCode: b.warehouse.code,
            batchNumber: b.batchNumber,
            initialQty: Number(b.initialQty),
            currentQty: Number(b.currentQty),
            manufacturingDate: b.manufacturingDate,
            expiryDate: b.expiryDate,
            status: b.status,
            costPrice: b.costPrice ? Number(b.costPrice) : null,
            supplierBatchNo: b.supplierBatchNo,
            notes: b.notes,
            createdAt: b.createdAt,
            updatedAt: b.updatedAt,
            serialCount: b._count.serials,
            daysToExpiry
        }
    })

    let availableSerials = 0
    let allocatedSerials = 0
    let soldSerials = 0
    let defectiveSerials = 0
    let maintenanceSerials = 0

    const serials: SerialItem[] = rawSerials.map((s: any) => {
        if (s.status === "AVAILABLE") availableSerials++
        else if (s.status === "ALLOCATED") allocatedSerials++
        else if (s.status === "SOLD") soldSerials++
        else if (s.status === "DEFECTIVE") defectiveSerials++
        else if (s.status === "MAINTENANCE") maintenanceSerials++

        return {
            id: s.id,
            productId: s.productId,
            productName: s.product.name,
            productSku: s.product.sku,
            warehouseId: s.warehouseId,
            warehouseName: s.warehouse?.name || null,
            warehouseCode: s.warehouse?.code || null,
            batchId: s.batchId,
            batchNumber: s.batch?.batchNumber || null,
            serialNumber: s.serialNumber,
            status: s.status,
            purchaseOrderId: s.purchaseOrderId,
            poNumber: s.purchaseOrder?.orderNumber || null,
            warrantyMonths: s.warrantyMonths,
            warrantyExpiry: s.warrantyExpiry,
            notes: s.notes,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt
        }
    })

    return {
        telemetry: {
            totalBatches: batches.length,
            activeBatches,
            expiringSoonBatches,
            expiredBatches,
            recalledBatches,
            totalSerials: serials.length,
            availableSerials,
            allocatedSerials,
            soldSerials,
            defectiveSerials,
            maintenanceSerials
        },
        batches,
        serials,
        products: products.map((p: any) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            barcode: (p.customAttributes as any)?.barcode || p.sku || null,
            unit: p.unit,
            stockQty: Number(p.stockQty)
        })),
        warehouses
    }
}

/**
 * Creates a new Product Lot / Batch entry with quantity and optional manufacturing / expiry dates.
 */
export async function createBatch(data: {
    productId: string
    warehouseId: string
    batchNumber: string
    initialQty: number
    manufacturingDate?: string | null
    expiryDate?: string | null
    costPrice?: number | null
    supplierBatchNo?: string | null
    notes?: string | null
}) {
    const tenantId = await getTenantId()

    if (!data.productId || !data.warehouseId || !data.batchNumber.trim()) {
        throw new Error("Product, Warehouse, and Batch Number are required fields.")
    }

    if (data.initialQty < 0) {
        throw new Error("Initial lot quantity cannot be negative.")
    }

    const cleanBatchNo = data.batchNumber.trim().toUpperCase()

    // Check for duplicate batch number under tenant + product
    const existing = await prisma.productBatch.findFirst({
        where: {
            tenantId,
            productId: data.productId,
            batchNumber: cleanBatchNo
        }
    })

    if (existing) {
        throw new Error(`Batch '${cleanBatchNo}' already exists for this product. Use a unique lot identifier.`)
    }

    const mfgDate = data.manufacturingDate ? new Date(data.manufacturingDate) : null
    const expDate = data.expiryDate ? new Date(data.expiryDate) : null

    if (mfgDate && expDate && isBefore(expDate, mfgDate)) {
        throw new Error("Expiry date cannot precede manufacturing date.")
    }

    // Determine initial status based on date
    let status: BatchStatus = BatchStatus.ACTIVE
    if (expDate && isBefore(expDate, new Date())) {
        status = BatchStatus.EXPIRED
    }

    const batch = await prisma.$transaction(async (tx: any) => {
        const created = await tx.productBatch.create({
            data: {
                tenantId,
                productId: data.productId,
                warehouseId: data.warehouseId,
                batchNumber: cleanBatchNo,
                initialQty: data.initialQty,
                currentQty: data.initialQty,
                manufacturingDate: mfgDate,
                expiryDate: expDate,
                status,
                costPrice: data.costPrice != null ? data.costPrice : null,
                supplierBatchNo: data.supplierBatchNo?.trim() || null,
                notes: data.notes?.trim() || null
            }
        })

        // Also record a stock movement log for lot intake if quantity > 0
        if (data.initialQty > 0) {
            const product = await tx.product.findUnique({
                where: { id: data.productId },
                select: { stockQty: true }
            })

            const currentProductStock = product ? Number(product.stockQty) : 0
            const newStock = currentProductStock + data.initialQty

            // Upsert warehouse stock
            await tx.warehouseStock.upsert({
                where: {
                    warehouseId_productId: {
                        warehouseId: data.warehouseId,
                        productId: data.productId
                    }
                },
                update: {
                    quantity: { increment: data.initialQty }
                },
                create: {
                    tenantId,
                    warehouseId: data.warehouseId,
                    productId: data.productId,
                    quantity: data.initialQty,
                    reorderPoint: 10
                }
            })

            // Update master product stock
            await tx.product.update({
                where: { id: data.productId },
                data: { stockQty: newStock }
            })

            // Log movement
            await tx.stockMovement.create({
                data: {
                    tenantId,
                    productId: data.productId,
                    warehouseId: data.warehouseId,
                    type: StockMovementType.IN,
                    quantity: data.initialQty,
                    previousQty: currentProductStock,
                    newQty: newStock,
                    reason: `Lot Receipt / Registration [Batch: ${cleanBatchNo}]`,
                    referenceNo: cleanBatchNo
                }
            })
        }

        return created
    })

    revalidatePath("/inventory")
    return { success: true, batchId: batch.id }
}

/**
 * Updates batch properties (status, notes, expiryDate).
 */
export async function updateBatch(
    id: string,
    data: {
        status?: BatchStatus
        notes?: string | null
        expiryDate?: string | null
    }
) {
    const tenantId = await getTenantId()

    const existing = await prisma.productBatch.findFirst({
        where: { id, tenantId }
    })

    if (!existing) {
        throw new Error("Batch record not found or access denied.")
    }

    const updateData: any = {}
    if (data.status) updateData.status = data.status
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null
    if (data.expiryDate !== undefined) {
        updateData.expiryDate = data.expiryDate ? new Date(data.expiryDate) : null
    }

    await prisma.productBatch.update({
        where: { id },
        data: updateData
    })

    revalidatePath("/inventory")
    return { success: true }
}

/**
 * Adjusts batch current quantity with reason and logs stock movement audit.
 */
export async function adjustBatchQty(id: string, deltaQty: number, reason: string) {
    const tenantId = await getTenantId()

    if (!deltaQty || isNaN(deltaQty)) {
        throw new Error("Valid adjustment quantity delta is required.")
    }

    if (!reason.trim()) {
        throw new Error("Adjustment reason is required for compliance audit.")
    }

    const batch = await prisma.productBatch.findFirst({
        where: { id, tenantId },
        include: { product: true }
    })

    if (!batch) {
        throw new Error("Batch not found.")
    }

    const prevQty = Number(batch.currentQty)
    const newQty = prevQty + deltaQty

    if (newQty < 0) {
        throw new Error(`Cannot reduce batch stock by ${Math.abs(deltaQty)}. Current quantity is ${prevQty}.`)
    }

    await prisma.$transaction(async (tx: any) => {
        let newStatus = batch.status
        if (newQty === 0 && batch.status === BatchStatus.ACTIVE) {
            newStatus = BatchStatus.DEPLETED
        } else if (newQty > 0 && batch.status === BatchStatus.DEPLETED) {
            newStatus = BatchStatus.ACTIVE
        }

        await tx.productBatch.update({
            where: { id },
            data: {
                currentQty: newQty,
                status: newStatus
            }
        })

        // Adjust warehouse stock
        await tx.warehouseStock.upsert({
            where: {
                warehouseId_productId: {
                    warehouseId: batch.warehouseId,
                    productId: batch.productId
                }
            },
            update: {
                quantity: { increment: deltaQty }
            },
            create: {
                tenantId,
                warehouseId: batch.warehouseId,
                productId: batch.productId,
                quantity: deltaQty > 0 ? deltaQty : 0,
                reorderPoint: 10
            }
        })

        // Adjust master product stock
        const masterStock = Number(batch.product.stockQty)
        const updatedMasterStock = Math.max(0, masterStock + deltaQty)

        await tx.product.update({
            where: { id: batch.productId },
            data: { stockQty: updatedMasterStock }
        })

        // Record movement audit
        await tx.stockMovement.create({
            data: {
                tenantId,
                productId: batch.productId,
                warehouseId: batch.warehouseId,
                type: deltaQty > 0 ? StockMovementType.ADJUSTMENT : StockMovementType.DAMAGE,
                quantity: Math.abs(deltaQty),
                previousQty: masterStock,
                newQty: updatedMasterStock,
                reason: `Batch ${batch.batchNumber} Adjustment: ${reason.trim()}`,
                referenceNo: batch.batchNumber
            }
        })
    })

    revalidatePath("/inventory")
    return { success: true, newQty }
}

/**
 * Initiates an emergency product recall on a specific lot number.
 */
export async function recallBatch(id: string, recallReason: string) {
    const tenantId = await getTenantId()

    if (!recallReason.trim()) {
        throw new Error("Reason is required when triggering a lot recall.")
    }

    const batch = await prisma.productBatch.findFirst({
        where: { id, tenantId }
    })

    if (!batch) {
        throw new Error("Batch not found.")
    }

    const timestamp = new Date().toISOString().split("T")[0]
    const updatedNotes = batch.notes
        ? `${batch.notes}\n[RECALLED ${timestamp}]: ${recallReason.trim()}`
        : `[RECALLED ${timestamp}]: ${recallReason.trim()}`

    await prisma.productBatch.update({
        where: { id },
        data: {
            status: BatchStatus.RECALLED,
            notes: updatedNotes
        }
    })

    revalidatePath("/inventory")
    return { success: true }
}

/**
 * Creates a single serial number asset registration.
 */
export async function createSerial(data: {
    productId: string
    warehouseId?: string | null
    batchId?: string | null
    serialNumber: string
    warrantyMonths?: number | null
    purchaseOrderId?: string | null
    notes?: string | null
}) {
    const tenantId = await getTenantId()

    if (!data.productId || !data.serialNumber.trim()) {
        throw new Error("Product and Serial Number are required.")
    }

    const cleanSN = data.serialNumber.trim().toUpperCase()

    // Check for duplicate
    const existing = await prisma.productSerial.findFirst({
        where: {
            tenantId,
            productId: data.productId,
            serialNumber: cleanSN
        }
    })

    if (existing) {
        throw new Error(`Serial Number '${cleanSN}' is already registered for this product.`)
    }

    let warrantyExpiry: Date | null = null
    if (data.warrantyMonths && data.warrantyMonths > 0) {
        warrantyExpiry = addMonths(new Date(), data.warrantyMonths)
    }

    const serial = await prisma.productSerial.create({
        data: {
            tenantId,
            productId: data.productId,
            warehouseId: data.warehouseId || null,
            batchId: data.batchId || null,
            serialNumber: cleanSN,
            status: SerialStatus.AVAILABLE,
            purchaseOrderId: data.purchaseOrderId || null,
            warrantyMonths: data.warrantyMonths || null,
            warrantyExpiry,
            notes: data.notes?.trim() || null
        }
    })

    revalidatePath("/inventory")
    return { success: true, serialId: serial.id }
}

/**
 * Bulk registers serial numbers, either from explicit list or sequential range generator (e.g. SN-0001 to SN-0050).
 */
export async function createSerialsBulk(data: {
    productId: string
    warehouseId?: string | null
    batchId?: string | null
    serialNumbers?: string[]
    prefix?: string
    startNumber?: number
    count?: number
    padLength?: number
    warrantyMonths?: number | null
    notes?: string | null
}) {
    const tenantId = await getTenantId()

    if (!data.productId) {
        throw new Error("Product is required for serial registration.")
    }

    let serialsToCreate: string[] = []

    if (data.serialNumbers && Array.isArray(data.serialNumbers) && data.serialNumbers.length > 0) {
        serialsToCreate = data.serialNumbers
            .map((s) => s.trim().toUpperCase())
            .filter((s) => s.length > 0)
    } else if (data.count && data.count > 0) {
        const prefix = data.prefix ? data.prefix.trim().toUpperCase() : "SN-"
        const start = data.startNumber || 1
        const pad = data.padLength || 4
        const count = Math.min(data.count, 500) // limit bulk size to 500 per call

        for (let i = 0; i < count; i++) {
            const numStr = String(start + i).padStart(pad, "0")
            serialsToCreate.push(`${prefix}${numStr}`)
        }
    }

    if (serialsToCreate.length === 0) {
        throw new Error("No valid serial numbers generated or provided.")
    }

    // Deduplicate in input set
    serialsToCreate = Array.from(new Set(serialsToCreate))

    // Check existing
    const existing = await prisma.productSerial.findMany({
        where: {
            tenantId,
            productId: data.productId,
            serialNumber: { in: serialsToCreate }
        },
        select: { serialNumber: true }
    })

    const existingSet = new Set(existing.map((e: any) => e.serialNumber))
    const uniqueSerials = serialsToCreate.filter((s) => !existingSet.has(s))

    if (uniqueSerials.length === 0) {
        throw new Error("All specified serial numbers already exist in the system.")
    }

    let warrantyExpiry: Date | null = null
    if (data.warrantyMonths && data.warrantyMonths > 0) {
        warrantyExpiry = addMonths(new Date(), data.warrantyMonths)
    }

    await prisma.productSerial.createMany({
        data: uniqueSerials.map((sn) => ({
            tenantId,
            productId: data.productId,
            warehouseId: data.warehouseId || null,
            batchId: data.batchId || null,
            serialNumber: sn,
            status: SerialStatus.AVAILABLE,
            warrantyMonths: data.warrantyMonths || null,
            warrantyExpiry,
            notes: data.notes?.trim() || null
        })),
        skipDuplicates: true
    })

    revalidatePath("/inventory")
    return {
        success: true,
        createdCount: uniqueSerials.length,
        skippedCount: serialsToCreate.length - uniqueSerials.length
    }
}

/**
 * Updates a serial number's lifecycle status (AVAILABLE, ALLOCATED, SOLD, DEFECTIVE, MAINTENANCE, RETURNED).
 */
export async function updateSerialStatus(id: string, status: SerialStatus, notes?: string | null) {
    const tenantId = await getTenantId()

    const serial = await prisma.productSerial.findFirst({
        where: { id, tenantId }
    })

    if (!serial) {
        throw new Error("Serial number not found or unauthorized.")
    }

    const updateData: any = { status }
    if (notes !== undefined) {
        updateData.notes = notes?.trim() || null
    }

    await prisma.productSerial.update({
        where: { id },
        data: updateData
    })

    revalidatePath("/inventory")
    return { success: true }
}

/**
 * Universal Traceability Investigator: locates full provenance chain by Lot # or Serial #.
 */
export async function getTraceabilityAudit(query: string): Promise<TraceabilityAuditResult> {
    const tenantId = await getTenantId()
    const cleanQuery = query.trim().toUpperCase()

    if (!cleanQuery) {
        return { found: false }
    }

    // 1. Try finding as serial number
    const serial = await prisma.productSerial.findFirst({
        where: {
            tenantId,
            serialNumber: cleanQuery
        },
        include: {
            product: true,
            warehouse: true,
            batch: {
                include: {
                    warehouse: true
                }
            },
            purchaseOrder: true
        }
    })

    if (serial) {
        // Fetch recent movements for product
        const movements = await prisma.stockMovement.findMany({
            where: {
                tenantId,
                productId: serial.productId
            },
            include: {
                sourceWarehouse: true
            },
            orderBy: { createdAt: "desc" },
            take: 10
        })

        return {
            found: true,
            type: "SERIAL",
            serial: {
                id: serial.id,
                productId: serial.productId,
                productName: serial.product.name,
                productSku: serial.product.sku,
                warehouseId: serial.warehouseId,
                warehouseName: serial.warehouse?.name || null,
                warehouseCode: serial.warehouse?.code || null,
                batchId: serial.batchId,
                batchNumber: serial.batch?.batchNumber || null,
                serialNumber: serial.serialNumber,
                status: serial.status,
                purchaseOrderId: serial.purchaseOrderId,
                poNumber: serial.purchaseOrder?.orderNumber || null,
                warrantyMonths: serial.warrantyMonths,
                warrantyExpiry: serial.warrantyExpiry,
                notes: serial.notes,
                createdAt: serial.createdAt,
                updatedAt: serial.updatedAt,
                batchDetails: serial.batch
                    ? {
                          id: serial.batch.id,
                          productId: serial.batch.productId,
                          productName: serial.product.name,
                          productSku: serial.product.sku,
                          warehouseId: serial.batch.warehouseId,
                          warehouseName: serial.batch.warehouse.name,
                          warehouseCode: serial.batch.warehouse.code,
                          batchNumber: serial.batch.batchNumber,
                          initialQty: Number(serial.batch.initialQty),
                          currentQty: Number(serial.batch.currentQty),
                          manufacturingDate: serial.batch.manufacturingDate,
                          expiryDate: serial.batch.expiryDate,
                          status: serial.batch.status,
                          costPrice: serial.batch.costPrice ? Number(serial.batch.costPrice) : null,
                          supplierBatchNo: serial.batch.supplierBatchNo,
                          notes: serial.batch.notes,
                          createdAt: serial.batch.createdAt,
                          updatedAt: serial.batch.updatedAt,
                          serialCount: 0,
                          daysToExpiry: null
                      }
                    : null
            },
            product: {
                id: serial.product.id,
                name: serial.product.name,
                sku: serial.product.sku,
                barcode: (serial.product.customAttributes as any)?.barcode || serial.product.sku || null,
                category: serial.product.category,
                stockQty: Number(serial.product.stockQty)
            },
            movements: movements.map((m: any) => ({
                id: m.id,
                type: m.type,
                quantity: Number(m.quantity),
                reason: m.reason,
                referenceNo: m.referenceNo,
                warehouseName: m.sourceWarehouse.name,
                createdAt: m.createdAt
            }))
        }
    }

    // 2. Try finding as batch / lot number
    const batch = await prisma.productBatch.findFirst({
        where: {
            tenantId,
            batchNumber: cleanQuery
        },
        include: {
            product: true,
            warehouse: true,
            serials: {
                include: {
                    warehouse: true,
                    purchaseOrder: true
                },
                take: 50
            },
            _count: {
                select: { serials: true }
            }
        }
    })

    if (batch) {
        const movements = await prisma.stockMovement.findMany({
            where: {
                tenantId,
                productId: batch.productId,
                OR: [{ referenceNo: batch.batchNumber }, { reason: { contains: batch.batchNumber } }]
            },
            include: {
                sourceWarehouse: true
            },
            orderBy: { createdAt: "desc" },
            take: 15
        })

        return {
            found: true,
            type: "BATCH",
            batch: {
                id: batch.id,
                productId: batch.productId,
                productName: batch.product.name,
                productSku: batch.product.sku,
                warehouseId: batch.warehouseId,
                warehouseName: batch.warehouse.name,
                warehouseCode: batch.warehouse.code,
                batchNumber: batch.batchNumber,
                initialQty: Number(batch.initialQty),
                currentQty: Number(batch.currentQty),
                manufacturingDate: batch.manufacturingDate,
                expiryDate: batch.expiryDate,
                status: batch.status,
                costPrice: batch.costPrice ? Number(batch.costPrice) : null,
                supplierBatchNo: batch.supplierBatchNo,
                notes: batch.notes,
                createdAt: batch.createdAt,
                updatedAt: batch.updatedAt,
                serialCount: batch._count.serials,
                daysToExpiry: null,
                serialsList: batch.serials.map((s: any) => ({
                    id: s.id,
                    productId: s.productId,
                    productName: batch.product.name,
                    productSku: batch.product.sku,
                    warehouseId: s.warehouseId,
                    warehouseName: s.warehouse?.name || null,
                    warehouseCode: s.warehouse?.code || null,
                    batchId: s.batchId,
                    batchNumber: batch.batchNumber,
                    serialNumber: s.serialNumber,
                    status: s.status,
                    purchaseOrderId: s.purchaseOrderId,
                    poNumber: s.purchaseOrder?.orderNumber || null,
                    warrantyMonths: s.warrantyMonths,
                    warrantyExpiry: s.warrantyExpiry,
                    notes: s.notes,
                    createdAt: s.createdAt,
                    updatedAt: s.updatedAt
                }))
            },
            product: {
                id: batch.product.id,
                name: batch.product.name,
                sku: batch.product.sku,
                barcode: (batch.product.customAttributes as any)?.barcode || batch.product.sku || null,
                category: batch.product.category,
                stockQty: Number(batch.product.stockQty)
            },
            movements: movements.map((m: any) => ({
                id: m.id,
                type: m.type,
                quantity: Number(m.quantity),
                reason: m.reason,
                referenceNo: m.referenceNo,
                warehouseName: m.sourceWarehouse.name,
                createdAt: m.createdAt
            }))
        }
    }

    return { found: false }
}
