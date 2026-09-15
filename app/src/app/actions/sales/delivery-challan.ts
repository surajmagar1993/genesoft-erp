"use server"

import { prisma } from "@/lib/prisma"
import { getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"
import {
    ChallanReason,
    ChallanStatus,
    TransportMode,
    InvoiceType,
    InvoiceStatus,
    StockMovementType
} from "@prisma/client"

export interface DeliveryChallanItemRecord {
    id: string
    challanId: string
    productId: string | null
    productName: string
    description: string | null
    hsnCode: string | null
    quantity: number
    unit: string
    unitPrice: number
    taxRate: number
    taxableAmount: number
    taxAmount: number
    totalAmount: number
}

export interface DeliveryChallanRecord {
    id: string
    challanNumber: string
    challanDate: Date
    contactId: string | null
    recipientName: string
    recipientEmail: string | null
    recipientPhone: string | null
    recipientGstin: string | null
    dispatchAddress: any
    deliveryAddress: any
    placeOfSupply: string | null
    reason: ChallanReason
    status: ChallanStatus
    transportMode: TransportMode
    transporterName: string | null
    transporterId: string | null
    vehicleNumber: string | null
    lrNumber: string | null
    lrDate: Date | null
    sourceWarehouseId: string | null
    sourceWarehouseName?: string | null
    salesOrderId: string | null
    salesOrderNumber?: string | null
    convertedInvoiceId: string | null
    convertedInvoiceNumber?: string | null
    totalQuantity: number
    taxableAmount: number
    taxAmount: number
    totalValue: number
    notes: string | null
    terms: string | null
    itemsCount: number
    items: DeliveryChallanItemRecord[]
    createdAt: Date
}

export interface DeliveryChallansOverviewData {
    stats: {
        totalChallansCount: number
        inTransitCount: number
        deliveredCount: number
        convertedCount: number
        totalDispatchedValue: number
    }
    challans: DeliveryChallanRecord[]
    contacts: {
        id: string
        displayName: string
        email: string | null
        phone: string | null
        gstin: string | null
        billingAddress: any
        shippingAddress: any
    }[]
    products: {
        id: string
        name: string
        sku: string | null
        hsnSacCode: string | null
        unit: string
        unitPrice: number
    }[]
    warehouses: {
        id: string
        name: string
        code: string
        address: string | null
        city: string | null
        state: string | null
    }[]
    salesOrders: {
        id: string
        orderNumber: string
        customerName: string
        total: number
        items: {
            productName: string
            qty: number
            unitPrice: number
            taxPercent: number
            lineTotal: number
        }[]
    }[]
}

/**
 * Fetch Delivery Challans overview, records, and related lookup options
 */
export async function getDeliveryChallansOverview(): Promise<DeliveryChallansOverviewData> {
    const tenantId = await getTenantId()

    const challansRaw = await prisma.deliveryChallan.findMany({
        where: { tenantId },
        include: {
            items: true,
            sourceWarehouse: { select: { name: true } },
            salesOrder: { select: { orderNumber: true } },
            convertedInvoice: { select: { invoiceNumber: true } }
        },
        orderBy: { challanDate: "desc" }
    })

    const contactsRaw = await prisma.contact.findMany({
        where: { tenantId },
        select: {
            id: true,
            displayName: true,
            email: true,
            phone: true,
            gstin: true,
            billingAddress: true,
            shippingAddress: true
        },
        orderBy: { displayName: "asc" }
    })

    const productsRaw = await prisma.product.findMany({
        where: { tenantId, isActive: true },
        select: {
            id: true,
            name: true,
            sku: true,
            hsnSacCode: true,
            unit: true,
            unitPrice: true
        },
        orderBy: { name: "asc" }
    })

    const warehousesRaw = await prisma.warehouse.findMany({
        where: { tenantId, isActive: true },
        select: {
            id: true,
            name: true,
            code: true,
            address: true,
            city: true,
            state: true
        },
        orderBy: { name: "asc" }
    })

    const salesOrdersRaw = await prisma.salesOrder.findMany({
        where: { tenantId },
        select: {
            id: true,
            orderNumber: true,
            customerName: true,
            total: true,
            items: {
                select: {
                    productName: true,
                    qty: true,
                    unitPrice: true,
                    taxPercent: true,
                    lineTotal: true
                }
            }
        },
        orderBy: { orderDate: "desc" },
        take: 30
    })

    const challans: DeliveryChallanRecord[] = (challansRaw as any[]).map((dc: any) => ({
        id: dc.id,
        challanNumber: dc.challanNumber,
        challanDate: dc.challanDate,
        contactId: dc.contactId,
        recipientName: dc.recipientName,
        recipientEmail: dc.recipientEmail,
        recipientPhone: dc.recipientPhone,
        recipientGstin: dc.recipientGstin,
        dispatchAddress: dc.dispatchAddress,
        deliveryAddress: dc.deliveryAddress,
        placeOfSupply: dc.placeOfSupply,
        reason: dc.reason,
        status: dc.status,
        transportMode: dc.transportMode,
        transporterName: dc.transporterName,
        transporterId: dc.transporterId,
        vehicleNumber: dc.vehicleNumber,
        lrNumber: dc.lrNumber,
        lrDate: dc.lrDate,
        sourceWarehouseId: dc.sourceWarehouseId,
        sourceWarehouseName: dc.sourceWarehouse?.name ?? null,
        salesOrderId: dc.salesOrderId,
        salesOrderNumber: dc.salesOrder?.orderNumber ?? null,
        convertedInvoiceId: dc.convertedInvoiceId,
        convertedInvoiceNumber: dc.convertedInvoice?.invoiceNumber ?? null,
        totalQuantity: Number(dc.totalQuantity),
        taxableAmount: Number(dc.taxableAmount),
        taxAmount: Number(dc.taxAmount),
        totalValue: Number(dc.totalValue),
        notes: dc.notes,
        terms: dc.terms,
        itemsCount: dc.items.length,
        items: dc.items.map((item: any) => ({
            id: item.id,
            challanId: item.challanId,
            productId: item.productId,
            productName: item.productName,
            description: item.description,
            hsnCode: item.hsnCode,
            quantity: Number(item.quantity),
            unit: item.unit,
            unitPrice: Number(item.unitPrice),
            taxRate: Number(item.taxRate),
            taxableAmount: Number(item.taxableAmount),
            taxAmount: Number(item.taxAmount),
            totalAmount: Number(item.totalAmount)
        })),
        createdAt: dc.createdAt
    }))

    // Telemetry stats
    const totalChallansCount = challans.length
    const inTransitCount = challans.filter(c => c.status === ChallanStatus.IN_TRANSIT).length
    const deliveredCount = challans.filter(c => c.status === ChallanStatus.DELIVERED).length
    const convertedCount = challans.filter(c => c.status === ChallanStatus.CONVERTED_TO_INVOICE).length
    const totalDispatchedValue = challans
        .filter(c => c.status !== ChallanStatus.CANCELLED)
        .reduce((sum, c) => sum + c.totalValue, 0)

    return {
        stats: {
            totalChallansCount,
            inTransitCount,
            deliveredCount,
            convertedCount,
            totalDispatchedValue
        },
        challans,
        contacts: (contactsRaw as any[]).map((c: any) => ({
            id: c.id,
            displayName: c.displayName,
            email: c.email,
            phone: c.phone,
            gstin: c.gstin,
            billingAddress: c.billingAddress,
            shippingAddress: c.shippingAddress
        })),
        products: (productsRaw as any[]).map((p: any) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            hsnSacCode: p.hsnSacCode,
            unit: p.unit,
            unitPrice: Number(p.unitPrice)
        })),
        warehouses: (warehousesRaw as any[]).map((wh: any) => ({
            id: wh.id,
            name: wh.name,
            code: wh.code,
            address: wh.address,
            city: wh.city,
            state: wh.state
        })),
        salesOrders: (salesOrdersRaw as any[]).map((so: any) => ({
            id: so.id,
            orderNumber: so.orderNumber,
            customerName: so.customerName,
            total: Number(so.total),
            items: (so.items as any[]).map((item: any) => ({
                productName: item.productName,
                qty: Number(item.qty),
                unitPrice: Number(item.unitPrice),
                taxPercent: Number(item.taxPercent),
                lineTotal: Number(item.lineTotal)
            }))
        }))
    }
}

export interface CreateChallanItemInput {
    productId?: string
    productName: string
    description?: string
    hsnCode?: string
    quantity: number
    unit?: string
    unitPrice: number
    taxRate: number
}

export interface CreateDeliveryChallanInput {
    contactId?: string
    recipientName: string
    recipientEmail?: string
    recipientPhone?: string
    recipientGstin?: string
    dispatchAddress: any
    deliveryAddress: any
    placeOfSupply?: string
    reason: ChallanReason
    transportMode: TransportMode
    transporterName?: string
    transporterId?: string
    vehicleNumber?: string
    lrNumber?: string
    lrDate?: string
    sourceWarehouseId?: string
    salesOrderId?: string
    notes?: string
    terms?: string
    items: CreateChallanItemInput[]
}

/**
 * Create a new Delivery Challan (Rule 55) with sequential DC-YYYY-XXXX numbering
 */
export async function createDeliveryChallan(input: CreateDeliveryChallanInput) {
    const tenantId = await getTenantId()

    if (!input.items || input.items.length === 0) {
        throw new Error("Delivery challan must contain at least one line item.")
    }

    const currentYear = new Date().getFullYear()
    const count = await prisma.deliveryChallan.count({
        where: { tenantId }
    })
    const challanNumber = `DC-${currentYear}-${String(count + 1).padStart(4, "0")}`

    let totalQuantity = 0
    let taxableAmount = 0
    let taxAmount = 0
    let totalValue = 0

    const computedItems = input.items.map(item => {
        const qty = Math.max(item.quantity, 0)
        const price = Math.max(item.unitPrice, 0)
        const lineTaxable = Number((qty * price).toFixed(2))
        const lineTax = Number((lineTaxable * (item.taxRate / 100)).toFixed(2))
        const lineTotal = Number((lineTaxable + lineTax).toFixed(2))

        totalQuantity += qty
        taxableAmount += lineTaxable
        taxAmount += lineTax
        totalValue += lineTotal

        return {
            productId: item.productId || null,
            productName: item.productName.trim(),
            description: item.description?.trim() || null,
            hsnCode: item.hsnCode?.trim() || null,
            quantity: qty,
            unit: item.unit || "PCS",
            unitPrice: price,
            taxRate: item.taxRate || 18,
            taxableAmount: lineTaxable,
            taxAmount: lineTax,
            totalAmount: lineTotal
        }
    })

    const challan = await prisma.deliveryChallan.create({
        data: {
            tenantId,
            challanNumber,
            challanDate: new Date(),
            contactId: input.contactId || null,
            recipientName: input.recipientName.trim(),
            recipientEmail: input.recipientEmail?.trim() || null,
            recipientPhone: input.recipientPhone?.trim() || null,
            recipientGstin: input.recipientGstin?.trim() || null,
            dispatchAddress: input.dispatchAddress || {},
            deliveryAddress: input.deliveryAddress || {},
            placeOfSupply: input.placeOfSupply?.trim() || null,
            reason: input.reason,
            status: ChallanStatus.ISSUED,
            transportMode: input.transportMode || TransportMode.ROAD,
            transporterName: input.transporterName?.trim() || null,
            transporterId: input.transporterId?.trim() || null,
            vehicleNumber: input.vehicleNumber?.trim().toUpperCase() || null,
            lrNumber: input.lrNumber?.trim() || null,
            lrDate: input.lrDate ? new Date(input.lrDate) : null,
            sourceWarehouseId: input.sourceWarehouseId || null,
            salesOrderId: input.salesOrderId || null,
            totalQuantity,
            taxableAmount,
            taxAmount,
            totalValue,
            notes: input.notes?.trim() || null,
            terms: input.terms?.trim() || null,
            items: {
                create: computedItems
            }
        }
    })

    revalidatePath("/sales/delivery-challans")
    return { success: true, challan }
}

/**
 * Update Delivery Challan lifecycle status (ISSUED, IN_TRANSIT, DELIVERED, RETURNED, CANCELLED)
 */
export async function updateDeliveryChallanStatus(id: string, status: ChallanStatus) {
    const tenantId = await getTenantId()

    await prisma.deliveryChallan.update({
        where: { id, tenantId },
        data: { status }
    })

    revalidatePath("/sales/delivery-challans")
    return { success: true }
}

/**
 * 1-Click Convert Delivery Challan into a Tax Invoice (Invoice model)
 */
export async function convertChallanToInvoice(challanId: string) {
    const tenantId = await getTenantId()

    return await prisma.$transaction(async (tx: any) => {
        const challan = await tx.deliveryChallan.findUnique({
            where: { id: challanId, tenantId },
            include: { items: true, contact: true }
        })

        if (!challan) {
            throw new Error("Delivery challan not found.")
        }

        if (challan.convertedInvoiceId) {
            throw new Error("This delivery challan has already been converted into an invoice.")
        }

        if (!challan.contactId) {
            throw new Error("Delivery challan must be associated with a valid customer contact to generate a Tax Invoice.")
        }

        // Generate sequential invoice number INV-YYYY-XXXX
        const currentYear = new Date().getFullYear()
        const count = await tx.invoice.count({
            where: { tenantId }
        })
        const invoiceNumber = `INV-${currentYear}-${String(count + 1).padStart(4, "0")}`

        // 1. Create Tax Invoice
        const invoice = await tx.invoice.create({
            data: {
                tenantId,
                contactId: challan.contactId,
                invoiceNumber,
                type: InvoiceType.TAX_INVOICE,
                status: InvoiceStatus.SENT,
                invoiceDate: new Date(),
                billTo: challan.deliveryAddress || challan.contact?.billingAddress || {},
                shipTo: challan.deliveryAddress || challan.contact?.shippingAddress || {},
                placeOfSupply: challan.placeOfSupply || null,
                subtotal: challan.taxableAmount,
                taxAmount: challan.taxAmount,
                discount: 0,
                total: challan.totalValue,
                currencyCode: "INR",
                notes: `Generated from Delivery Challan ${challan.challanNumber}. Purpose: ${challan.reason.replace(/_/g, " ")}.`,
                terms: challan.terms || null,
                items: {
                    create: challan.items.map((item: any) => ({
                        productId: item.productId,
                        productName: item.productName,
                        description: item.description,
                        hsnSacCode: item.hsnCode,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        taxRate: item.taxRate,
                        taxAmount: item.taxAmount,
                        totalAmount: item.totalAmount
                    }))
                }
            }
        })

        // 2. Mark Challan as CONVERTED_TO_INVOICE and link newly created invoice
        await tx.deliveryChallan.update({
            where: { id: challanId, tenantId },
            data: {
                status: ChallanStatus.CONVERTED_TO_INVOICE,
                convertedInvoiceId: invoice.id
            }
        })

        return { success: true, invoice }
    }).then((res: any) => {
        revalidatePath("/sales/delivery-challans")
        revalidatePath("/sales/invoices")
        return res
    })
}
