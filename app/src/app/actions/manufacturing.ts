"use server"

import { prisma } from "@/lib/prisma"
import { getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"
import {
    BOMStatus,
    WorkOrderStatus,
    WorkOrderPriority,
    QCStatus,
    StockMovementType
} from "@prisma/client"

export interface BOMItemRecord {
    id: string
    bomId: string
    productId: string
    productName: string
    productSku: string | null
    quantity: number
    unit: string
    unitCost: number
    totalCost: number
    scrapPercentage: number
    notes: string | null
}

export interface BOMRecord {
    id: string
    bomNumber: string
    name: string
    productId: string
    productName: string
    productSku: string | null
    quantity: number
    unit: string
    version: string
    status: BOMStatus
    laborCost: number
    overheadCost: number
    estimatedTotalCost: number
    notes: string | null
    itemsCount: number
    items: BOMItemRecord[]
    createdAt: Date
}

export interface WorkOrderRecord {
    id: string
    orderNumber: string
    bomId: string
    bomNumber: string
    bomName: string
    productId: string
    productName: string
    productSku: string | null
    plannedQuantity: number
    producedQuantity: number
    scrapQuantity: number
    sourceWarehouseId: string
    sourceWarehouseName: string
    targetWarehouseId: string
    targetWarehouseName: string
    startDate: Date | null
    dueDate: Date
    completedAt: Date | null
    status: WorkOrderStatus
    priority: WorkOrderPriority
    assignedTo: string | null
    estimatedTotalCost: number
    actualTotalCost: number
    notes: string | null
    qcInspectionsCount: number
    createdAt: Date
}

export interface QualityInspectionRecord {
    id: string
    workOrderId: string
    workOrderNumber: string
    inspectionNumber: string
    productName: string
    inspectedQuantity: number
    passedQuantity: number
    failedQuantity: number
    status: QCStatus
    defectReason: string | null
    inspectorName: string | null
    notes: string | null
    inspectedAt: Date
}

export interface ManufacturingOverviewData {
    telemetry: {
        activeWorkOrders: number
        productionYieldRate: number
        completedThisMonth: number
        totalBOMs: number
    }
    workOrders: WorkOrderRecord[]
    boms: BOMRecord[]
    inspections: QualityInspectionRecord[]
    availableProducts: {
        id: string
        name: string
        sku: string | null
        unit: string
        unitPrice: number
        stockQty: number
    }[]
    availableWarehouses: {
        id: string
        name: string
        code: string
    }[]
}

/**
 * Get unified manufacturing and MRP overview telemetry, work orders, BOMs, and QC records
 */
export async function getManufacturingOverview(): Promise<ManufacturingOverviewData> {
    const tenantId = await getTenantId()
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [bomsRaw, workOrdersRaw, inspectionsRaw, productsRaw, warehousesRaw] = await Promise.all([
        prisma.billOfMaterials.findMany({
            where: { tenantId },
            include: {
                product: true,
                items: {
                    include: {
                        product: true
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        }),
        prisma.workOrder.findMany({
            where: { tenantId },
            include: {
                bom: true,
                product: true,
                sourceWarehouse: true,
                targetWarehouse: true,
                _count: { select: { qcInspections: true } }
            },
            orderBy: { createdAt: "desc" }
        }),
        prisma.qualityInspection.findMany({
            where: { tenantId },
            include: {
                workOrder: {
                    include: {
                        product: true
                    }
                }
            },
            orderBy: { inspectedAt: "desc" },
            take: 50
        }),
        prisma.product.findMany({
            where: { tenantId, isActive: true },
            select: {
                id: true,
                name: true,
                sku: true,
                unit: true,
                unitPrice: true,
                stockQty: true
            },
            orderBy: { name: "asc" }
        }),
        prisma.warehouse.findMany({
            where: { tenantId, isActive: true },
            select: {
                id: true,
                name: true,
                code: true
            },
            orderBy: { name: "asc" }
        })
    ])

    // Format BOMs
    const boms: BOMRecord[] = (bomsRaw as any[]).map((b: any) => ({
        id: b.id,
        bomNumber: b.bomNumber,
        name: b.name,
        productId: b.productId,
        productName: b.product.name,
        productSku: b.product.sku,
        quantity: Number(b.quantity),
        unit: b.unit,
        version: b.version,
        status: b.status,
        laborCost: Number(b.laborCost),
        overheadCost: Number(b.overheadCost),
        estimatedTotalCost: Number(b.estimatedTotalCost),
        notes: b.notes,
        itemsCount: b.items.length,
        items: b.items.map((item: any) => ({
            id: item.id,
            bomId: item.bomId,
            productId: item.productId,
            productName: item.product.name,
            productSku: item.product.sku,
            quantity: Number(item.quantity),
            unit: item.unit,
            unitCost: Number(item.unitCost),
            totalCost: Number(item.totalCost),
            scrapPercentage: Number(item.scrapPercentage),
            notes: item.notes
        })),
        createdAt: b.createdAt
    }))

    // Format Work Orders
    const workOrders: WorkOrderRecord[] = (workOrdersRaw as any[]).map((w: any) => ({
        id: w.id,
        orderNumber: w.orderNumber,
        bomId: w.bomId,
        bomNumber: w.bom.bomNumber,
        bomName: w.bom.name,
        productId: w.productId,
        productName: w.product.name,
        productSku: w.product.sku,
        plannedQuantity: Number(w.plannedQuantity),
        producedQuantity: Number(w.producedQuantity),
        scrapQuantity: Number(w.scrapQuantity),
        sourceWarehouseId: w.sourceWarehouseId,
        sourceWarehouseName: w.sourceWarehouse.name,
        targetWarehouseId: w.targetWarehouseId,
        targetWarehouseName: w.targetWarehouse.name,
        startDate: w.startDate,
        dueDate: w.dueDate,
        completedAt: w.completedAt,
        status: w.status,
        priority: w.priority,
        assignedTo: w.assignedTo,
        estimatedTotalCost: Number(w.estimatedTotalCost),
        actualTotalCost: Number(w.actualTotalCost),
        notes: w.notes,
        qcInspectionsCount: w._count.qcInspections,
        createdAt: w.createdAt
    }))

    // Format Inspections
    const inspections: QualityInspectionRecord[] = (inspectionsRaw as any[]).map((qc: any) => ({
        id: qc.id,
        workOrderId: qc.workOrderId,
        workOrderNumber: qc.workOrder.orderNumber,
        inspectionNumber: qc.inspectionNumber,
        productName: qc.workOrder.product.name,
        inspectedQuantity: Number(qc.inspectedQuantity),
        passedQuantity: Number(qc.passedQuantity),
        failedQuantity: Number(qc.failedQuantity),
        status: qc.status,
        defectReason: qc.defectReason,
        inspectorName: qc.inspectorName,
        notes: qc.notes,
        inspectedAt: qc.inspectedAt
    }))

    // Telemetry
    const activeWorkOrders = workOrders.filter(w =>
        w.status === "PLANNED" || w.status === "CONFIRMED" || w.status === "IN_PROGRESS" || w.status === "QUALITY_CHECK"
    ).length

    const completedThisMonth = workOrders.filter(w =>
        w.status === "COMPLETED" && w.completedAt && new Date(w.completedAt) >= startOfMonth
    ).length

    const totalProduced = workOrders.reduce((sum, w) => sum + w.producedQuantity, 0)
    const totalScrap = workOrders.reduce((sum, w) => sum + w.scrapQuantity, 0)
    const productionYieldRate = (totalProduced + totalScrap > 0)
        ? Math.round((totalProduced / (totalProduced + totalScrap)) * 100)
        : 100

    return {
        telemetry: {
            activeWorkOrders,
            productionYieldRate,
            completedThisMonth,
            totalBOMs: boms.length
        },
        workOrders,
        boms,
        inspections,
        availableProducts: (productsRaw as any[]).map((p: any) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            unit: p.unit,
            unitPrice: Number(p.unitPrice),
            stockQty: Number(p.stockQty)
        })),
        availableWarehouses: (warehousesRaw as any[]).map((wh: any) => ({
            id: wh.id,
            name: wh.name,
            code: wh.code
        }))
    }
}

/**
 * Create a new Bill of Materials (BOM) recipe
 */
export async function createBOM(input: {
    name: string
    productId: string
    quantity: number
    unit?: string
    version?: string
    laborCost?: number
    overheadCost?: number
    notes?: string
    items: {
        productId: string
        quantity: number
        unit?: string
        unitCost: number
        scrapPercentage?: number
        notes?: string
    }[]
}) {
    const tenantId = await getTenantId()
    const count = await prisma.billOfMaterials.count({ where: { tenantId } })
    const currentYear = new Date().getFullYear()
    const bomNumber = `BOM-${currentYear}-${String(count + 1).padStart(3, "0")}`

    const laborCost = input.laborCost || 0
    const overheadCost = input.overheadCost || 0

    // Compute component costs
    let componentTotalSum = 0
    const processedItems = input.items.map(item => {
        const scrapPct = item.scrapPercentage || 0
        const effectiveQty = item.quantity * (1 + scrapPct / 100)
        const itemTotal = effectiveQty * item.unitCost
        componentTotalSum += itemTotal

        return {
            productId: item.productId,
            quantity: item.quantity,
            unit: item.unit || "Nos",
            unitCost: item.unitCost,
            totalCost: itemTotal,
            scrapPercentage: scrapPct,
            notes: item.notes
        }
    })

    const estimatedTotalCost = componentTotalSum + laborCost + overheadCost

    const bom = await prisma.billOfMaterials.create({
        data: {
            tenantId,
            bomNumber,
            name: input.name,
            productId: input.productId,
            quantity: input.quantity,
            unit: input.unit || "Nos",
            version: input.version || "1.0",
            status: "ACTIVE",
            laborCost,
            overheadCost,
            estimatedTotalCost,
            notes: input.notes,
            items: {
                create: processedItems
            }
        }
    })

    revalidatePath("/manufacturing")
    return { success: true, bomId: bom.id, bomNumber: bom.bomNumber }
}

/**
 * Update BOM status
 */
export async function updateBOMStatus(bomId: string, status: BOMStatus) {
    const tenantId = await getTenantId()

    await prisma.billOfMaterials.update({
        where: { id: bomId, tenantId },
        data: { status }
    })

    revalidatePath("/manufacturing")
    return { success: true }
}

/**
 * Create a new Work Order / Production Order
 */
export async function createWorkOrder(input: {
    bomId: string
    plannedQuantity: number
    sourceWarehouseId: string
    targetWarehouseId: string
    dueDate: string
    startDate?: string
    priority?: WorkOrderPriority
    assignedTo?: string
    notes?: string
}) {
    const tenantId = await getTenantId()
    const now = new Date()
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`
    const count = await prisma.workOrder.count({ where: { tenantId } })
    const orderNumber = `WO-${yearMonth}-${String(count + 1).padStart(3, "0")}`

    const bom = await prisma.billOfMaterials.findUnique({
        where: { id: input.bomId, tenantId },
        include: { items: true }
    })

    if (!bom) throw new Error("Bill of Materials not found")

    const bomQty = Number(bom.quantity) || 1
    const costPerFinishedUnit = Number(bom.estimatedTotalCost) / bomQty
    const estimatedTotalCost = costPerFinishedUnit * input.plannedQuantity

    // Check stock availability warning
    const shortages: string[] = []
    for (const item of bom.items) {
        const requiredQty = (Number(item.quantity) * (1 + Number(item.scrapPercentage) / 100)) * (input.plannedQuantity / bomQty)
        const stock = await prisma.warehouseStock.findUnique({
            where: {
                warehouseId_productId: {
                    warehouseId: input.sourceWarehouseId,
                    productId: item.productId
                }
            }
        })
        const available = stock ? Number(stock.quantity) : 0
        if (available < requiredQty) {
            shortages.push(`Component needs ${requiredQty.toFixed(1)}, but only ${available.toFixed(1)} available in source depot.`)
        }
    }

    const workOrder = await prisma.workOrder.create({
        data: {
            tenantId,
            orderNumber,
            bomId: input.bomId,
            productId: bom.productId,
            plannedQuantity: input.plannedQuantity,
            sourceWarehouseId: input.sourceWarehouseId,
            targetWarehouseId: input.targetWarehouseId,
            startDate: input.startDate ? new Date(input.startDate) : null,
            dueDate: new Date(input.dueDate),
            status: "PLANNED",
            priority: input.priority || "MEDIUM",
            assignedTo: input.assignedTo,
            estimatedTotalCost,
            notes: input.notes
        }
    })

    revalidatePath("/manufacturing")
    return {
        success: true,
        workOrderId: workOrder.id,
        orderNumber: workOrder.orderNumber,
        hasShortages: shortages.length > 0,
        shortages
    }
}

/**
 * Update Work Order status with automated raw material consumption & stock increment on completion
 */
export async function updateWorkOrderStatus(
    workOrderId: string,
    newStatus: WorkOrderStatus,
    producedQuantity?: number,
    scrapQuantity?: number,
    notes?: string
) {
    const tenantId = await getTenantId()

    const order = await prisma.workOrder.findUnique({
        where: { id: workOrderId, tenantId },
        include: {
            bom: {
                include: { items: true }
            }
        }
    })

    if (!order) throw new Error("Work Order not found")

    // If marking as completed, execute inventory consumption & addition
    if (newStatus === "COMPLETED") {
        const finalProduced = producedQuantity !== undefined ? producedQuantity : Number(order.plannedQuantity)
        const finalScrap = scrapQuantity || 0
        const totalUnitsBatch = finalProduced + finalScrap
        const bomQty = Number(order.bom.quantity) || 1

        await prisma.$transaction(async (tx: any) => {
            // 1. Consume Raw Materials from Source Warehouse
            for (const item of order.bom.items) {
                const itemQtyPerBatch = Number(item.quantity)
                const scrapAllowance = 1 + Number(item.scrapPercentage) / 100
                const consumeQty = Math.round((itemQtyPerBatch * scrapAllowance * (totalUnitsBatch / bomQty)) * 10000) / 10000

                // Get current stock
                const stock = await tx.warehouseStock.findUnique({
                    where: {
                        warehouseId_productId: {
                            warehouseId: order.sourceWarehouseId,
                            productId: item.productId
                        }
                    }
                })

                const currentQty = stock ? Number(stock.quantity) : 0
                const updatedQty = currentQty - consumeQty

                if (stock) {
                    await tx.warehouseStock.update({
                        where: { id: stock.id },
                        data: { quantity: updatedQty }
                    })
                } else {
                    await tx.warehouseStock.create({
                        data: {
                            tenantId,
                            warehouseId: order.sourceWarehouseId,
                            productId: item.productId,
                            quantity: updatedQty
                        }
                    })
                }

                // Record Outbound Stock Movement
                await tx.stockMovement.create({
                    data: {
                        tenantId,
                        productId: item.productId,
                        warehouseId: order.sourceWarehouseId,
                        type: "OUT",
                        quantity: consumeQty,
                        previousQty: currentQty,
                        newQty: updatedQty,
                        reason: `Work Order Consumption: ${order.orderNumber}`,
                        referenceNo: order.orderNumber,
                        performedBy: "MRP Engine"
                    }
                })
            }

            // 2. Replenish Finished Goods into Target Warehouse
            const fgStock = await tx.warehouseStock.findUnique({
                where: {
                    warehouseId_productId: {
                        warehouseId: order.targetWarehouseId,
                        productId: order.productId
                    }
                }
            })

            const fgCurrentQty = fgStock ? Number(fgStock.quantity) : 0
            const fgNewQty = fgCurrentQty + finalProduced

            if (fgStock) {
                await tx.warehouseStock.update({
                    where: { id: fgStock.id },
                    data: { quantity: fgNewQty }
                })
            } else {
                await tx.warehouseStock.create({
                    data: {
                        tenantId,
                        warehouseId: order.targetWarehouseId,
                        productId: order.productId,
                        quantity: fgNewQty
                    }
                })
            }

            // Update master product stockQty counter
            await tx.product.update({
                where: { id: order.productId },
                data: {
                    stockQty: { increment: finalProduced }
                }
            })

            // Record Inbound Stock Movement
            await tx.stockMovement.create({
                data: {
                    tenantId,
                    productId: order.productId,
                    warehouseId: order.targetWarehouseId,
                    type: "IN",
                    quantity: finalProduced,
                    previousQty: fgCurrentQty,
                    newQty: fgNewQty,
                    reason: `Finished Goods Production: ${order.orderNumber}`,
                    referenceNo: order.orderNumber,
                    performedBy: "MRP Engine"
                }
            })

            // 3. Mark Work Order Completed
            await tx.workOrder.update({
                where: { id: workOrderId },
                data: {
                    status: "COMPLETED",
                    producedQuantity: finalProduced,
                    scrapQuantity: finalScrap,
                    completedAt: new Date(),
                    actualTotalCost: (Number(order.estimatedTotalCost) / Number(order.plannedQuantity)) * finalProduced,
                    notes: notes || order.notes
                }
            })
        })
    } else {
        // Standard status update
        await prisma.workOrder.update({
            where: { id: workOrderId },
            data: {
                status: newStatus,
                ...(producedQuantity !== undefined ? { producedQuantity } : {}),
                ...(scrapQuantity !== undefined ? { scrapQuantity } : {}),
                ...(notes ? { notes } : {})
            }
        })
    }

    revalidatePath("/manufacturing")
    revalidatePath("/inventory")
    return { success: true }
}

/**
 * Record a Quality Inspection (QC)
 */
export async function recordQualityInspection(workOrderId: string, input: {
    inspectedQuantity: number
    passedQuantity: number
    failedQuantity: number
    defectReason?: string
    inspectorName?: string
    notes?: string
}) {
    const tenantId = await getTenantId()
    const now = new Date()
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`
    const count = await prisma.qualityInspection.count({ where: { tenantId } })
    const inspectionNumber = `QC-${yearMonth}-${String(count + 1).padStart(3, "0")}`

    let status: QCStatus = "PASSED"
    if (input.failedQuantity > 0 && input.passedQuantity > 0) {
        status = "CONDITIONALLY_PASSED"
    } else if (input.failedQuantity > 0 && input.passedQuantity === 0) {
        status = "FAILED"
    }

    const inspection = await prisma.qualityInspection.create({
        data: {
            tenantId,
            workOrderId,
            inspectionNumber,
            inspectedQuantity: input.inspectedQuantity,
            passedQuantity: input.passedQuantity,
            failedQuantity: input.failedQuantity,
            status,
            defectReason: input.defectReason,
            inspectorName: input.inspectorName || "QA Specialist",
            notes: input.notes
        }
    })

    revalidatePath("/manufacturing")
    return { success: true, inspectionNumber, status }
}
