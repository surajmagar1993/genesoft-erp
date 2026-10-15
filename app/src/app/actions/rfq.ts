"use server"

import type { Prisma } from "@prisma/client"
import { nextSequence } from "@/lib/sequence"
import { prisma } from "@/lib/prisma"
import { getTenantId, getTenantManagerId, getTenantWriterId } from "@/lib/get-tenant-id"
import { assertTenantRefs } from "@/lib/tenant-refs"
import { revalidatePath } from "next/cache"
import { RfqStatus, RfqVendorStatus, PurchaseOrderStatus } from "@prisma/client"

/** Module access checked by the tenant helpers (src/lib/access.ts) */
const MODULE = "purchase" as const

export interface RfqItemRecord {
    id: string
    rfqId: string
    productId: string | null
    productName?: string
    description: string
    quantity: number
    targetUnitPrice: number | null
    unit: string
    hsnSacCode: string | null
    notes: string | null
    lineBudget: number
}

export interface RfqVendorQuoteItemRecord {
    id: string
    quoteId: string
    rfqItemId: string
    description?: string
    quantity?: number
    unitPrice: number
    taxPercent: number
    taxAmount: number
    lineTotal: number
    availableQty: number | null
    notes: string | null
}

export interface RfqVendorRecord {
    id: string
    tenantId: string
    rfqId: string
    vendorId: string
    vendorName: string
    vendorCompanyName: string | null
    vendorEmail: string | null
    vendorPhone: string | null
    status: RfqVendorStatus
    quoteReference: string | null
    quoteDate: Date | null
    validUntil: Date | null
    currencyCode: string
    subtotal: number
    taxAmount: number
    totalAmount: number
    leadTimeDays: number | null
    notes: string | null
    isWinner: boolean
    awardedAt: Date | null
    items: RfqVendorQuoteItemRecord[]
}

export interface RfqRecord {
    id: string
    tenantId: string
    rfqNumber: string
    title: string
    status: RfqStatus
    issueDate: Date
    dueDate: Date
    notes: string | null
    terms: string | null
    convertedPoId: string | null
    convertedPoNumber: string | null
    createdAt: Date
    updatedAt: Date
    itemsCount: number
    vendorsCount: number
    quotesReceivedCount: number
    targetTotalBudget: number
    lowestQuoteTotal: number | null
    bestVendorName: string | null
    items: RfqItemRecord[]
    vendors: RfqVendorRecord[]
}

export interface RfqOverviewData {
    telemetry: {
        totalRfqs: number
        activeBidding: number
        pendingReview: number
        convertedCount: number
        totalTargetSpend: number
        awardedSpend: number
    }
    rfqs: RfqRecord[]
    vendors: {
        id: string
        displayName: string
        companyName: string | null
        email: string | null
        phone: string | null
    }[]
    products: {
        id: string
        name: string
        sku: string | null
        unitPrice: number
        unit: string
        hsnSacCode: string | null
    }[]
}

export interface CreateRfqItemInput {
    productId?: string
    description: string
    quantity: number
    targetUnitPrice?: number
    unit?: string
    hsnSacCode?: string
    notes?: string
}

export interface CreateRfqInput {
    title: string
    dueDate: string
    notes?: string
    terms?: string
    items: CreateRfqItemInput[]
    invitedVendorIds: string[]
}

export interface RecordVendorQuoteItemInput {
    rfqItemId: string
    unitPrice: number
    taxPercent?: number
    availableQty?: number
    notes?: string
}

export interface RecordVendorQuoteInput {
    rfqId: string
    quoteId: string
    quoteReference?: string
    quoteDate?: string
    validUntil?: string
    currencyCode?: string
    leadTimeDays?: number
    notes?: string
    items: RecordVendorQuoteItemInput[]
}

/**
 * Fetches overview metrics, list of RFQs with vendor bids, and lookup data
 */
export async function getRfqOverview(): Promise<RfqOverviewData> {
    const tenantId = await getTenantId(MODULE)

    const rawRfqs = await prisma.requestForQuotation.findMany({
        where: { tenantId },
        include: {
            convertedPo: {
                select: {
                    id: true,
                    orderNumber: true,
                }
            },
            items: {
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            sku: true,
                        }
                    }
                }
            },
            vendors: {
                include: {
                    vendor: {
                        select: {
                            id: true,
                            displayName: true,
                            companyName: true,
                            email: true,
                            phone: true,
                        }
                    },
                    items: true
                }
            }
        },
        orderBy: { createdAt: "desc" }
    })

    let totalTargetSpend = 0
    let awardedSpend = 0
    let activeBidding = 0
    let pendingReview = 0
    let convertedCount = 0

    const rfqs: RfqRecord[] = rawRfqs.map((rfq: any) => {
        let rfqTargetBudget = 0

        const items: RfqItemRecord[] = rfq.items.map((item: any) => {
            const qty = Number(item.quantity)
            const targetPrice = item.targetUnitPrice ? Number(item.targetUnitPrice) : 0
            const lineBudget = qty * targetPrice
            rfqTargetBudget += lineBudget

            return {
                id: item.id,
                rfqId: item.rfqId,
                productId: item.productId,
                productName: item.product?.name,
                description: item.description,
                quantity: qty,
                targetUnitPrice: item.targetUnitPrice ? Number(item.targetUnitPrice) : null,
                unit: item.unit,
                hsnSacCode: item.hsnSacCode,
                notes: item.notes,
                lineBudget,
            }
        })

        totalTargetSpend += rfqTargetBudget

        let quotesReceivedCount = 0
        let lowestQuoteTotal: number | null = null
        let bestVendorName: string | null = null

        const vendors: RfqVendorRecord[] = rfq.vendors.map((v: any) => {
            const total = Number(v.totalAmount)
            const subtotal = Number(v.subtotal)
            const tax = Number(v.taxAmount)

            if (v.status === RfqVendorStatus.SUBMITTED || v.status === RfqVendorStatus.ACCEPTED) {
                quotesReceivedCount++
                if (lowestQuoteTotal === null || (total > 0 && total < lowestQuoteTotal)) {
                    lowestQuoteTotal = total
                    bestVendorName = v.vendor.companyName || v.vendor.displayName
                }
            }

            if (v.isWinner) {
                awardedSpend += total
            }

            return {
                id: v.id,
                tenantId: v.tenantId,
                rfqId: v.rfqId,
                vendorId: v.vendorId,
                vendorName: v.vendor.displayName,
                vendorCompanyName: v.vendor.companyName,
                vendorEmail: v.vendor.email,
                vendorPhone: v.vendor.phone,
                status: v.status,
                quoteReference: v.quoteReference,
                quoteDate: v.quoteDate,
                validUntil: v.validUntil,
                currencyCode: v.currencyCode,
                subtotal,
                taxAmount: tax,
                totalAmount: total,
                leadTimeDays: v.leadTimeDays,
                notes: v.notes,
                isWinner: v.isWinner,
                awardedAt: v.awardedAt,
                items: v.items.map((i: any) => ({
                    id: i.id,
                    quoteId: i.quoteId,
                    rfqItemId: i.rfqItemId,
                    unitPrice: Number(i.unitPrice),
                    taxPercent: Number(i.taxPercent),
                    taxAmount: Number(i.taxAmount),
                    lineTotal: Number(i.lineTotal),
                    availableQty: i.availableQty ? Number(i.availableQty) : null,
                    notes: i.notes,
                }))
            }
        })

        if (rfq.status === RfqStatus.SENT) {
            activeBidding++
        } else if (rfq.status === RfqStatus.BIDDING_CLOSED || (quotesReceivedCount > 0 && rfq.status !== RfqStatus.CONVERTED && rfq.status !== RfqStatus.CANCELLED)) {
            pendingReview++
        } else if (rfq.status === RfqStatus.CONVERTED) {
            convertedCount++
        }

        return {
            id: rfq.id,
            tenantId: rfq.tenantId,
            rfqNumber: rfq.rfqNumber,
            title: rfq.title,
            status: rfq.status,
            issueDate: rfq.issueDate,
            dueDate: rfq.dueDate,
            notes: rfq.notes,
            terms: rfq.terms,
            convertedPoId: rfq.convertedPoId,
            convertedPoNumber: rfq.convertedPo?.orderNumber || null,
            createdAt: rfq.createdAt,
            updatedAt: rfq.updatedAt,
            itemsCount: items.length,
            vendorsCount: vendors.length,
            quotesReceivedCount,
            targetTotalBudget: rfqTargetBudget,
            lowestQuoteTotal,
            bestVendorName,
            items,
            vendors,
        }
    })

    const vendorsLookup = await prisma.contact.findMany({
        where: { tenantId, isActive: true },
        select: {
            id: true,
            displayName: true,
            companyName: true,
            email: true,
            phone: true,
        },
        orderBy: { displayName: "asc" }
    })

    const productsLookup = await prisma.product.findMany({
        where: { tenantId, isActive: true },
        select: {
            id: true,
            name: true,
            sku: true,
            unitPrice: true,
            unit: true,
            hsnSacCode: true,
        },
        orderBy: { name: "asc" }
    })

    return {
        telemetry: {
            totalRfqs: rawRfqs.length,
            activeBidding,
            pendingReview,
            convertedCount,
            totalTargetSpend,
            awardedSpend,
        },
        rfqs,
        vendors: vendorsLookup,
        products: productsLookup.map((p: any) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            unitPrice: Number(p.unitPrice),
            unit: p.unit,
            hsnSacCode: p.hsnSacCode,
        }))
    }
}

/**
 * Creates a new Request for Quotation tender
 */
export async function createRfq(input: CreateRfqInput) {
    const tenantId = await getTenantWriterId(MODULE)
    await assertTenantRefs(tenantId, { contact: input.invitedVendorIds, product: input.items.map((i) => i.productId) })

    if (!input.title?.trim()) {
        throw new Error("RFQ title is required")
    }
    if (!input.dueDate) {
        throw new Error("Submission deadline date is required")
    }
    if (!input.items || input.items.length === 0) {
        throw new Error("At least one line item is required")
    }

    const year = new Date().getFullYear()
    const rfqNumber = await nextSequence(prisma, "rfq", tenantId, `RFQ-${year}-`, 4)

    const rfq = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const createdRfq = await tx.requestForQuotation.create({
            data: {
                tenantId,
                rfqNumber,
                title: input.title.trim(),
                status: input.invitedVendorIds?.length > 0 ? RfqStatus.SENT : RfqStatus.DRAFT,
                dueDate: new Date(input.dueDate),
                notes: input.notes?.trim() || null,
                terms: input.terms?.trim() || null,
                items: {
                    create: input.items.map((item) => ({
                        productId: item.productId || null,
                        description: item.description.trim(),
                        quantity: item.quantity,
                        targetUnitPrice: item.targetUnitPrice ?? null,
                        unit: item.unit || "pcs",
                        hsnSacCode: item.hsnSacCode?.trim() || null,
                        notes: item.notes?.trim() || null,
                    }))
                }
            },
            include: {
                items: true
            }
        })

        // Invite selected vendors
        if (input.invitedVendorIds && input.invitedVendorIds.length > 0) {
            for (const vendorId of input.invitedVendorIds) {
                await tx.rfqVendorQuote.create({
                    data: {
                        tenantId,
                        rfqId: createdRfq.id,
                        vendorId,
                        status: RfqVendorStatus.INVITED,
                    }
                })
            }
        }

        return createdRfq
    })

    revalidatePath("/purchase/rfq")
    revalidatePath("/purchase")
    return { success: true, rfqId: rfq.id, rfqNumber: rfq.rfqNumber }
}

/**
 * Updates the lifecycle status of an RFQ
 */
export async function updateRfqStatus(rfqId: string, status: RfqStatus) {
    const tenantId = await getTenantWriterId(MODULE)

    const existing = await prisma.requestForQuotation.findFirst({
        where: { id: rfqId, tenantId }
    })

    if (!existing) {
        throw new Error("RFQ not found or access denied")
    }

    if (existing.status === RfqStatus.CONVERTED && status !== RfqStatus.CONVERTED) {
        throw new Error("Cannot alter status of an RFQ that has already been awarded and converted to PO")
    }

    await prisma.requestForQuotation.update({
        where: { id: rfqId },
        data: { status }
    })

    revalidatePath("/purchase/rfq")
    revalidatePath("/purchase")
    return { success: true }
}

/**
 * Invites additional vendors to an existing RFQ
 */
export async function inviteVendorsToRfq(rfqId: string, vendorIds: string[]) {
    const tenantId = await getTenantWriterId(MODULE)

    const rfq = await prisma.requestForQuotation.findFirst({
        where: { id: rfqId, tenantId }
    })
    if (!rfq) throw new Error("RFQ not found")

    for (const vendorId of vendorIds) {
        await prisma.rfqVendorQuote.upsert({
            where: {
                rfqId_vendorId: {
                    rfqId,
                    vendorId,
                }
            },
            create: {
                tenantId,
                rfqId,
                vendorId,
                status: RfqVendorStatus.INVITED,
            },
            update: {}
        })
    }

    if (rfq.status === RfqStatus.DRAFT) {
        await prisma.requestForQuotation.update({
            where: { id: rfqId },
            data: { status: RfqStatus.SENT }
        })
    }

    revalidatePath("/purchase/rfq")
    revalidatePath("/purchase")
    return { success: true }
}

/**
 * Records quotation pricing and terms submitted by a participating vendor
 */
export async function recordVendorQuote(input: RecordVendorQuoteInput) {
    const tenantId = await getTenantWriterId(MODULE)

    const quote = await prisma.rfqVendorQuote.findFirst({
        where: { id: input.quoteId, rfqId: input.rfqId, tenantId },
        include: {
            rfq: {
                include: { items: true }
            }
        }
    })

    if (!quote) {
        throw new Error("Vendor quotation entry not found")
    }

    let calculatedSubtotal = 0
    let calculatedTax = 0

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Delete previous items for this quote and reinsert fresh
        await tx.rfqVendorQuoteItem.deleteMany({
            where: { quoteId: quote.id }
        })

        for (const itemInput of input.items) {
            const rfqItem = quote.rfq.items.find((i: any) => i.id === itemInput.rfqItemId)
            if (!rfqItem) continue

            const qty = Number(rfqItem.quantity)
            const unitPrice = itemInput.unitPrice || 0
            const taxPercent = itemInput.taxPercent || 0

            const lineTaxable = qty * unitPrice
            const lineTax = (lineTaxable * taxPercent) / 100
            const lineTotal = lineTaxable + lineTax

            calculatedSubtotal += lineTaxable
            calculatedTax += lineTax

            await tx.rfqVendorQuoteItem.create({
                data: {
                    quoteId: quote.id,
                    rfqItemId: rfqItem.id,
                    unitPrice,
                    taxPercent,
                    taxAmount: lineTax,
                    lineTotal,
                    availableQty: itemInput.availableQty ?? qty,
                    notes: itemInput.notes?.trim() || null,
                }
            })
        }

        const calculatedTotal = calculatedSubtotal + calculatedTax

        await tx.rfqVendorQuote.update({
            where: { id: quote.id },
            data: {
                status: RfqVendorStatus.SUBMITTED,
                quoteReference: input.quoteReference?.trim() || null,
                quoteDate: input.quoteDate ? new Date(input.quoteDate) : new Date(),
                validUntil: input.validUntil ? new Date(input.validUntil) : null,
                currencyCode: input.currencyCode || "INR",
                subtotal: calculatedSubtotal,
                taxAmount: calculatedTax,
                totalAmount: calculatedTotal,
                leadTimeDays: input.leadTimeDays ?? null,
                notes: input.notes?.trim() || null,
            }
        })
    })

    revalidatePath("/purchase/rfq")
    revalidatePath("/purchase")
    return { success: true }
}

/**
 * Awards an RFQ to a winning vendor quote, automatically generating a Purchase Order
 */
export async function awardVendorQuote(rfqId: string, quoteId: string) {
    const tenantId = await getTenantManagerId(MODULE)

    const rfq = await prisma.requestForQuotation.findFirst({
        where: { id: rfqId, tenantId },
        include: {
            items: true,
            vendors: {
                include: {
                    vendor: true,
                    items: true,
                }
            }
        }
    })

    if (!rfq) {
        throw new Error("RFQ tender not found")
    }

    const winningQuote = rfq.vendors.find((v: any) => v.id === quoteId)
    if (!winningQuote) {
        throw new Error("Selected vendor quote not found in this RFQ")
    }

    if (winningQuote.items.length === 0) {
        throw new Error("Cannot award a quote that has no item prices recorded")
    }

    const year = new Date().getFullYear()
    const orderNumber = await nextSequence(prisma, "purchaseOrder", tenantId, `PO-${year}-`, 4)

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // 1. Mark winning quote as ACCEPTED, others as REJECTED
        for (const v of rfq.vendors) {
            const isWinner = v.id === quoteId
            await tx.rfqVendorQuote.update({
                where: { id: v.id },
                data: {
                    status: isWinner ? RfqVendorStatus.ACCEPTED : RfqVendorStatus.REJECTED,
                    isWinner,
                    awardedAt: isWinner ? new Date() : null,
                }
            })
        }

        // 2. Generate Purchase Order
        const poItemsData = rfq.items.map((rfqItem: any) => {
            const quoteItem = winningQuote.items.find((qi: any) => qi.rfqItemId === rfqItem.id)
            const qty = Number(rfqItem.quantity)
            const unitPrice = quoteItem ? Number(quoteItem.unitPrice) : (rfqItem.targetUnitPrice ? Number(rfqItem.targetUnitPrice) : 0)
            const taxPercent = quoteItem ? Number(quoteItem.taxPercent) : 0
            const lineTaxable = qty * unitPrice
            const lineTax = (lineTaxable * taxPercent) / 100
            const lineTotal = lineTaxable + lineTax

            return {
                productId: rfqItem.productId,
                description: rfqItem.description,
                hsnSacCode: rfqItem.hsnSacCode,
                quantity: qty,
                receivedQty: 0,
                unitPrice,
                taxPercent,
                taxAmount: lineTax,
                lineTotal,
            }
        })

        const poSubtotal = Number(winningQuote.subtotal)
        const poTax = Number(winningQuote.taxAmount)
        const poTotal = Number(winningQuote.totalAmount)

        // Find default warehouse if available
        const defaultWarehouse = await tx.warehouse.findFirst({
            where: { tenantId, isDefault: true }
        })

        const createdPo = await tx.purchaseOrder.create({
            data: {
                tenantId,
                vendorId: winningQuote.vendorId,
                warehouseId: defaultWarehouse?.id || null,
                orderNumber,
                status: PurchaseOrderStatus.DRAFT,
                orderDate: new Date(),
                subtotal: poSubtotal,
                taxAmount: poTax,
                discount: 0,
                total: poTotal,
                currencyCode: winningQuote.currencyCode || "INR",
                notes: `Awarded from ${rfq.rfqNumber}: ${rfq.title}. ${winningQuote.notes ? "Vendor notes: " + winningQuote.notes : ""}`,
                terms: rfq.terms || winningQuote.vendor.notes || null,
                items: {
                    create: poItemsData
                }
            }
        })

        // 3. Update RFQ to CONVERTED with link to new PO
        await tx.requestForQuotation.update({
            where: { id: rfqId },
            data: {
                status: RfqStatus.CONVERTED,
                convertedPoId: createdPo.id,
            }
        })

        return createdPo
    })

    revalidatePath("/purchase/rfq")
    revalidatePath("/purchase")
    revalidatePath("/finance/payable")
    return {
        success: true,
        poId: result.id,
        poNumber: result.orderNumber,
    }
}

/**
 * Deletes a draft or cancelled RFQ
 */
export async function deleteRfq(rfqId: string) {
    const tenantId = await getTenantManagerId(MODULE)

    const rfq = await prisma.requestForQuotation.findFirst({
        where: { id: rfqId, tenantId }
    })

    if (!rfq) {
        throw new Error("RFQ not found")
    }

    if (rfq.status === RfqStatus.CONVERTED) {
        throw new Error("Cannot delete an awarded RFQ that has been converted into a Purchase Order")
    }

    await prisma.requestForQuotation.delete({
        where: { id: rfqId }
    })

    revalidatePath("/purchase/rfq")
    revalidatePath("/purchase")
    return { success: true }
}
