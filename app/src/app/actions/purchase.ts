"use server"

import { prisma } from "@/lib/prisma"
import { getTenantId } from "@/lib/get-tenant-id"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { PurchaseOrderStatus, StockMovementType } from "@prisma/client"

export interface PurchaseOrderItemRecord {
    id: string
    purchaseOrderId: string
    productId: string | null
    productName?: string
    productSku?: string | null
    description: string
    hsnSacCode: string | null
    quantity: number
    receivedQty: number
    unitPrice: number
    taxPercent: number
    taxAmount: number
    lineTotal: number
}

export interface PurchaseOrderRecord {
    id: string
    tenantId: string
    vendorId: string
    vendorName: string
    vendorEmail: string | null
    vendorPhone: string | null
    vendorGstin: string | null
    warehouseId: string | null
    warehouseName: string | null
    billId: string | null
    billNumber: string | null
    orderNumber: string
    status: PurchaseOrderStatus
    orderDate: Date
    expectedDeliveryDate: Date | null
    subtotal: number
    taxAmount: number
    discount: number
    total: number
    currencyCode: string
    notes: string | null
    terms: string | null
    createdAt: Date
    items: PurchaseOrderItemRecord[]
}

export interface VendorItem {
    id: string
    displayName: string
    companyName: string | null
    email: string | null
    phone: string | null
    gstin: string | null
    city: string | null
    state: string | null
    countryCode: string | null
    balance: number
    totalOrdersCount: number
}

export interface PurchaseOverviewData {
    telemetry: {
        totalProcurementSpend: number
        openOrdersCount: number
        pendingReceiptsCount: number
        activeVendorsCount: number
        receivedOrdersCount: number
    }
    orders: PurchaseOrderRecord[]
    vendors: VendorItem[]
    warehouses: { id: string; name: string; code: string }[]
    products: { id: string; name: string; sku: string | null; unitPrice: number; unit: string; hsnSacCode: string | null }[]
}

export interface PurchaseOrderItemInput {
    productId?: string
    description: string
    hsnSacCode?: string
    quantity: number
    unitPrice: number
    taxPercent: number
}

export interface CreatePurchaseOrderInput {
    vendorId: string
    warehouseId?: string
    expectedDeliveryDate?: string
    notes?: string
    terms?: string
    currencyCode?: string
    items: PurchaseOrderItemInput[]
}

/**
 * Retrieves the complete purchase overview, telemetry cards, vendor directory,
 * and available reference data for PO creation.
 */
export async function getPurchaseOverview(): Promise<PurchaseOverviewData> {
    const tenantId = await getTenantId()

    // 1. Fetch Purchase Orders with relations
    const rawOrders = await prisma.purchaseOrder.findMany({
        where: { tenantId },
        include: {
            vendor: {
                select: {
                    displayName: true,
                    companyName: true,
                    email: true,
                    phone: true,
                    gstin: true
                }
            },
            warehouse: {
                select: {
                    name: true
                }
            },
            bill: {
                select: {
                    billNumber: true
                }
            },
            items: {
                include: {
                    product: {
                        select: {
                            name: true,
                            sku: true
                        }
                    }
                }
            }
        },
        orderBy: { createdAt: "desc" }
    })

    let totalSpend = 0
    let openOrdersCount = 0
    let pendingReceiptsCount = 0
    let receivedOrdersCount = 0

    const orders: PurchaseOrderRecord[] = rawOrders.map((o: any) => {
        const totalNum = Number(o.total)
        if (o.status === "APPROVED" || o.status === "RECEIVED" || o.status === "PARTIALLY_RECEIVED") {
            totalSpend += totalNum
        }
        if (o.status === "DRAFT" || o.status === "SENT" || o.status === "APPROVED") {
            openOrdersCount++
        }
        if (o.status === "APPROVED" || o.status === "PARTIALLY_RECEIVED") {
            pendingReceiptsCount++
        }
        if (o.status === "RECEIVED") {
            receivedOrdersCount++
        }

        const items: PurchaseOrderItemRecord[] = o.items.map((i: any) => ({
            id: i.id,
            purchaseOrderId: i.purchaseOrderId,
            productId: i.productId,
            productName: i.product?.name || i.description,
            productSku: i.product?.sku || null,
            description: i.description,
            hsnSacCode: i.hsnSacCode,
            quantity: Number(i.quantity),
            receivedQty: Number(i.receivedQty),
            unitPrice: Number(i.unitPrice),
            taxPercent: Number(i.taxPercent),
            taxAmount: Number(i.taxAmount),
            lineTotal: Number(i.lineTotal)
        }))

        return {
            id: o.id,
            tenantId: o.tenantId,
            vendorId: o.vendorId,
            vendorName: o.vendor?.companyName || o.vendor?.displayName || "Unknown Supplier",
            vendorEmail: o.vendor?.email || null,
            vendorPhone: o.vendor?.phone || null,
            vendorGstin: o.vendor?.gstin || null,
            warehouseId: o.warehouseId,
            warehouseName: o.warehouse?.name || null,
            billId: o.billId,
            billNumber: o.bill?.billNumber || null,
            orderNumber: o.orderNumber,
            status: o.status,
            orderDate: o.orderDate,
            expectedDeliveryDate: o.expectedDeliveryDate,
            subtotal: Number(o.subtotal),
            taxAmount: Number(o.taxAmount),
            discount: Number(o.discount),
            total: totalNum,
            currencyCode: o.currencyCode,
            notes: o.notes,
            terms: o.terms,
            createdAt: o.createdAt,
            items
        }
    })

    // 2. Fetch Vendors (Contacts flagged as vendor or having purchase orders/bills)
    const rawVendors = await prisma.contact.findMany({
        where: {
            tenantId,
            OR: [
                { customerGroup: "vendor" },
                { purchaseOrders: { some: {} } },
                { bills: { some: {} } }
            ]
        },
        include: {
            _count: {
                select: { purchaseOrders: true }
            }
        },
        orderBy: { displayName: "asc" }
    })

    const vendors: VendorItem[] = rawVendors.map((v: any) => {
        const billing = (v.billingAddress as any) || {}
        return {
            id: v.id,
            displayName: v.displayName,
            companyName: v.companyName,
            email: v.email,
            phone: v.phone || v.mobile,
            gstin: v.gstin,
            city: billing.city || null,
            state: billing.state || null,
            countryCode: v.countryCode,
            balance: Number(v.balance),
            totalOrdersCount: v._count.purchaseOrders
        }
    })

    // 3. Reference Warehouses
    const rawWarehouses = await prisma.warehouse.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true, code: true },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }]
    })

    // 4. Reference Products (catalog)
    const rawProducts = await prisma.product.findMany({
        where: { tenantId, type: "PRODUCT", isActive: true },
        select: { id: true, name: true, sku: true, unitPrice: true, unit: true, hsnSacCode: true },
        orderBy: { name: "asc" }
    })

    const products = rawProducts.map((p: any) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        unitPrice: Number(p.unitPrice),
        unit: p.unit || "Nos",
        hsnSacCode: p.hsnSacCode
    }))

    return {
        telemetry: {
            totalProcurementSpend: totalSpend,
            openOrdersCount,
            pendingReceiptsCount,
            activeVendorsCount: vendors.length,
            receivedOrdersCount
        },
        orders,
        vendors,
        warehouses: rawWarehouses,
        products
    }
}

/**
 * Creates a new supplier / vendor in the system.
 */
export async function createVendor(data: {
    companyName?: string
    displayName: string
    email?: string
    phone?: string
    gstin?: string
    city?: string
    state?: string
    countryCode?: string
}) {
    const tenantId = await getTenantId()

    const cleanDisplayName = data.displayName?.trim() || data.companyName?.trim()
    if (!cleanDisplayName) throw new Error("Supplier name is required")

    const newVendor = await prisma.contact.create({
        data: {
            tenantId,
            displayName: cleanDisplayName,
            companyName: data.companyName?.trim() || null,
            email: data.email?.trim() || null,
            phone: data.phone?.trim() || null,
            gstin: data.gstin?.trim()?.toUpperCase() || null,
            countryCode: data.countryCode || "IN",
            customerGroup: "vendor",
            tags: ["vendor", "supplier"],
            billingAddress: {
                city: data.city?.trim() || "",
                state: data.state?.trim() || "",
                country: data.countryCode || "India"
            }
        }
    })

    revalidatePath("/purchase")
    return { success: true, vendor: newVendor }
}

/**
 * Creates a new Purchase Order with calculated totals and line items.
 */
export async function createPurchaseOrder(data: CreatePurchaseOrderInput) {
    const tenantId = await getTenantId()

    if (!data.vendorId) throw new Error("Vendor selection is required")
    if (!data.items || data.items.length === 0) throw new Error("At least one purchase line item is required")

    // Generate consecutive PO number: PO-YYYY-XXXX
    const currentYear = new Date().getFullYear()
    const count = await prisma.purchaseOrder.count({
        where: { tenantId }
    })
    const orderNumber = `PO-${currentYear}-${String(count + 1).padStart(4, "0")}`

    let subtotal = 0
    let totalTax = 0

    const lineItemsData = data.items.map(item => {
        const qty = Number(item.quantity)
        const price = Number(item.unitPrice)
        const taxPct = Number(item.taxPercent || 0)

        if (qty <= 0) throw new Error("Item quantity must be greater than 0")
        if (price < 0) throw new Error("Item unit price cannot be negative")

        const lineBase = qty * price
        const lineTax = lineBase * (taxPct / 100)
        const lineTotal = lineBase + lineTax

        subtotal += lineBase
        totalTax += lineTax

        return {
            productId: item.productId || null,
            description: item.description.trim(),
            hsnSacCode: item.hsnSacCode?.trim() || null,
            quantity: qty,
            receivedQty: 0,
            unitPrice: price,
            taxPercent: taxPct,
            taxAmount: lineTax,
            lineTotal: lineTotal
        }
    })

    const grandTotal = subtotal + totalTax

    const newOrder = await prisma.purchaseOrder.create({
        data: {
            tenantId,
            vendorId: data.vendorId,
            warehouseId: data.warehouseId || null,
            orderNumber,
            status: "DRAFT",
            expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null,
            subtotal,
            taxAmount: totalTax,
            discount: 0,
            total: grandTotal,
            currencyCode: data.currencyCode || "INR",
            notes: data.notes?.trim() || null,
            terms: data.terms?.trim() || "Payment Net 30 days upon delivery",
            items: {
                create: lineItemsData
            }
        },
        include: {
            items: true
        }
    })

    revalidatePath("/purchase")
    return { success: true, order: newOrder }
}

/**
 * Updates the lifecycle status of a Purchase Order.
 */
export async function updatePurchaseOrderStatus(id: string, status: PurchaseOrderStatus) {
    const tenantId = await getTenantId()

    const existing = await prisma.purchaseOrder.findFirst({
        where: { id, tenantId }
    })
    if (!existing) throw new Error("Purchase Order not found")

    const updated = await prisma.purchaseOrder.update({
        where: { id },
        data: { status }
    })

    revalidatePath("/purchase")
    return { success: true, status: updated.status }
}

/**
 * Receives goods from an approved PO into a designated warehouse facility.
 * Atomically updates PO receivedQty, creates StockMovement (IN), and updates WarehouseStock + Product.stockQty.
 */
export async function receiveGoods(data: {
    purchaseOrderId: string
    warehouseId: string
    receivedItems: { itemId: string; quantity: number }[]
    notes?: string
}) {
    const tenantId = await getTenantId()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const performedBy = user?.email || "Procurement Officer"

    const po = await prisma.purchaseOrder.findFirst({
        where: { id: data.purchaseOrderId, tenantId },
        include: { items: true, warehouse: true }
    })
    if (!po) throw new Error("Purchase Order not found")

    const targetWarehouseId = data.warehouseId || po.warehouseId
    if (!targetWarehouseId) throw new Error("Receiving warehouse is required")

    // Transactional Goods Receipt Intake
    const txResult = await prisma.$transaction(async (tx: any) => {
        let allItemsFullyReceived = true

        for (const itemInput of data.receivedItems) {
            const qtyReceivedNow = Number(itemInput.quantity)
            if (qtyReceivedNow <= 0) continue

            const itemRecord = po.items.find((i: any) => i.id === itemInput.itemId)
            if (!itemRecord) continue

            const prevReceived = Number(itemRecord.receivedQty)
            const orderedQty = Number(itemRecord.quantity)
            const newReceived = prevReceived + qtyReceivedNow

            if (newReceived < orderedQty) {
                allItemsFullyReceived = false
            }

            // 1. Update receivedQty on PurchaseOrderItem
            await tx.purchaseOrderItem.update({
                where: { id: itemRecord.id },
                data: { receivedQty: newReceived }
            })

            // 2. If item is mapped to a product catalog item, increment inventory
            if (itemRecord.productId) {
                // Fetch existing warehouse stock
                const existingStock = await tx.warehouseStock.findUnique({
                    where: {
                        warehouseId_productId: {
                            warehouseId: targetWarehouseId,
                            productId: itemRecord.productId
                        }
                    }
                })
                const prevWhQty = existingStock ? Number(existingStock.quantity) : 0
                const newWhQty = prevWhQty + qtyReceivedNow

                // Upsert WarehouseStock
                await tx.warehouseStock.upsert({
                    where: {
                        warehouseId_productId: {
                            warehouseId: targetWarehouseId,
                            productId: itemRecord.productId
                        }
                    },
                    create: {
                        tenantId,
                        warehouseId: targetWarehouseId,
                        productId: itemRecord.productId,
                        quantity: newWhQty,
                        reorderPoint: 10
                    },
                    update: {
                        quantity: newWhQty
                    }
                })

                // Increment Product Aggregate Stock
                const prod = await tx.product.findUnique({
                    where: { id: itemRecord.productId },
                    select: { stockQty: true }
                })
                const prevProdQty = prod ? Number(prod.stockQty) : 0
                await tx.product.update({
                    where: { id: itemRecord.productId },
                    data: { stockQty: prevProdQty + qtyReceivedNow }
                })

                // Record immutable StockMovement ledger entry
                await tx.stockMovement.create({
                    data: {
                        tenantId,
                        productId: itemRecord.productId,
                        warehouseId: targetWarehouseId,
                        type: "IN",
                        quantity: qtyReceivedNow,
                        previousQty: prevWhQty,
                        newQty: newWhQty,
                        reason: data.notes?.trim() || `Goods receipt for ${po.orderNumber}`,
                        referenceNo: po.orderNumber,
                        performedBy
                    }
                })
            }
        }

        // Determine new PO status
        const updatedItems = await tx.purchaseOrderItem.findMany({
            where: { purchaseOrderId: po.id }
        })
        const fullyComplete = updatedItems.every((i: any) => Number(i.receivedQty) >= Number(i.quantity))
        const hasSomeReceived = updatedItems.some((i: any) => Number(i.receivedQty) > 0)

        let newStatus: PurchaseOrderStatus = po.status
        if (fullyComplete) {
            newStatus = "RECEIVED"
        } else if (hasSomeReceived) {
            newStatus = "PARTIALLY_RECEIVED"
        }

        await tx.purchaseOrder.update({
            where: { id: po.id },
            data: {
                status: newStatus,
                warehouseId: targetWarehouseId
            }
        })

        return { allReceived: allItemsFullyReceived }
    })

    revalidatePath("/purchase")
    revalidatePath("/inventory")
    return { success: true, allReceived: txResult.allReceived }
}

/**
 * Converts an approved or received Purchase Order into an Accounts Payable vendor Bill.
 */
export async function convertPOToBill(data: string | {
    purchaseOrderId: string
    dueDate?: string
    billNumber?: string
}) {
    const tenantId = await getTenantId()
    const purchaseOrderId = typeof data === "string" ? data : data.purchaseOrderId
    const customDueDate = typeof data === "object" && data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const customBillNumber = typeof data === "object" && data.billNumber ? data.billNumber.trim() : null

    const po = await prisma.purchaseOrder.findFirst({
        where: { id: purchaseOrderId, tenantId },
        include: { items: true, vendor: true }
    })
    if (!po) throw new Error("Purchase Order not found")
    if (po.billId) throw new Error("A vendor bill is already linked to this Purchase Order")

    const currentYear = new Date().getFullYear()
    const billNumber = customBillNumber || `BILL-${currentYear}-${po.orderNumber.replace(/^PO-\d+-?/, "")}`

    const result = await prisma.$transaction(async (tx: any) => {
        // 1. Create vendor Bill in Accounts Payable
        const bill = await tx.bill.create({
            data: {
                tenantId,
                contactId: po.vendorId,
                billNumber,
                status: "OPEN",
                billDate: new Date(),
                dueDate: customDueDate,
                subtotal: po.subtotal,
                taxAmount: po.taxAmount,
                discount: po.discount,
                total: po.total,
                currencyCode: po.currencyCode,
                notes: `Generated automatically from ${po.orderNumber}`,
                items: {
                    create: po.items.map((item: any) => ({
                        productId: item.productId,
                        description: item.description,
                        hsnSacCode: item.hsnSacCode,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        taxPercent: item.taxPercent,
                        taxAmount: item.taxAmount,
                        lineTotal: item.lineTotal
                    }))
                }
            }
        })

        // 2. Link Bill to Purchase Order
        await tx.purchaseOrder.update({
            where: { id: po.id },
            data: { billId: bill.id }
        })

        // 3. Update Vendor Balance (Payable increases)
        const vendor = await tx.contact.findUnique({
            where: { id: po.vendorId },
            select: { balance: true }
        })
        const currentBalance = vendor ? Number(vendor.balance) : 0
        const newBalance = currentBalance + Number(po.total)

        await tx.contact.update({
            where: { id: po.vendorId },
            data: { balance: newBalance }
        })

        // 4. Create LedgerEntry for Accounts Payable credit
        await tx.ledgerEntry.create({
            data: {
                tenantId,
                contactId: po.vendorId,
                type: "CREDIT",
                amount: po.total,
                balanceAfter: newBalance,
                referenceType: "BILL",
                referenceId: bill.id,
                description: `Bill ${bill.billNumber} for purchase order ${po.orderNumber}`,
                currencyCode: po.currencyCode
            }
        })

        return bill
    })

    revalidatePath("/purchase")
    revalidatePath("/finance/bills")
    revalidatePath("/finance/payable")
    return { success: true, billId: result.id, billNumber: result.billNumber }
}
