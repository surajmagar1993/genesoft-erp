"use server"

import { prisma } from "@/lib/prisma"
import { getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"
import {
    PriceListType,
    PricingScheme,
    ProductType,
    Prisma,
} from "@prisma/client"

/* ─────────────────────────────────────────
   Interfaces
───────────────────────────────────────── */

export interface PriceListItemRecord {
    id: string
    priceListId: string
    priceListName: string
    priceListCode: string
    productId: string
    productName: string
    productSku: string | null
    productCategory: string | null
    basePrice: number
    minQuantity: number
    customPrice: number | null
    discountPercent: number | null
    effectiveUnitPrice: number
    startDate: Date | null
    endDate: Date | null
}

export interface PriceListRecord {
    id: string
    tenantId: string
    code: string
    name: string
    description: string | null
    type: PriceListType
    currencyCode: string
    pricingScheme: PricingScheme
    defaultDiscount: number
    targetGroup: string | null
    isDefault: boolean
    isActive: boolean
    startDate: Date | null
    endDate: Date | null
    itemCount: number
    assignedCustomerCount: number
    items: PriceListItemRecord[]
    createdAt: Date
}

export interface ProductLookup {
    id: string
    name: string
    sku: string | null
    category: string | null
    unitPrice: number
    currency: string
    unit: string
    isActive: boolean
}

export interface CustomerLookup {
    id: string
    displayName: string
    email: string | null
    companyName: string | null
    customerGroup: string | null
    priceListId: string | null
    priceListName: string | null
}

export interface PriceListsOverviewStats {
    activeRateCards: number
    totalItemOverrides: number
    avgDiscountPercent: number
    assignedCustomersCount: number
}

export interface ProductPricingMatrixRow {
    productId: string
    productName: string
    sku: string | null
    category: string | null
    basePrice: number
    unit: string
    pricesByList: Record<
        string,
        {
            priceListId: string
            priceListCode: string
            effectivePrice: number
            discountPercent: number
            hasVolumeTiers: boolean
            minQuantity: number
        }
    >
}

export interface PriceListsOverviewData {
    stats: PriceListsOverviewStats
    priceLists: PriceListRecord[]
    products: ProductLookup[]
    customers: CustomerLookup[]
    matrixData: ProductPricingMatrixRow[]
}

export interface CalculatePriceResult {
    productId: string
    productName: string
    basePrice: number
    quantity: number
    appliedPriceListId: string | null
    appliedPriceListName: string | null
    appliedTierMinQuantity: number
    discountPercent: number
    unitPrice: number
    totalAmount: number
    totalSavings: number
    currencyCode: string
}

/* ─────────────────────────────────────────
   Auto-Seeder: Starter Products & Price Lists
───────────────────────────────────────── */

export async function autoSeedPriceListsIfEmpty(tenantId: string) {
    const existing = await prisma.priceList.findFirst({
        where: { tenantId },
    })

    if (existing) return

    // Ensure we have catalog products
    let products = await prisma.product.findMany({
        where: { tenantId },
    })

    if (products.length === 0) {
        const seedProducts = [
            {
                tenantId,
                name: "Enterprise ERP Cloud Platform Annual License",
                category: "Software & SaaS",
                sku: "SW-ERP-ENT-01",
                unitPrice: 120000,
                unit: "License",
                type: ProductType.PRODUCT,
                isActive: true,
                description: "Full ERP suite with 25 user seats and priority SLA",
            },
            {
                tenantId,
                name: "NextGen Cloud Database Engine Subscription",
                category: "Software & SaaS",
                sku: "SW-DB-HYBRID-02",
                unitPrice: 45000,
                unit: "Node",
                type: ProductType.PRODUCT,
                isActive: true,
                description: "Managed PostgreSQL cluster with automated backups",
            },
            {
                tenantId,
                name: "Professional Cloud Implementation & Migration",
                category: "Professional Services",
                sku: "SRV-IMPL-80H",
                unitPrice: 85000,
                unit: "Package",
                type: ProductType.SERVICE,
                isActive: true,
                description: "80 engineering hours of schema migration and training",
            },
            {
                tenantId,
                name: "Industrial IoT Edge Telemetry Sensor Node",
                category: "Hardware",
                sku: "HW-IOT-TELEMETRY-X4",
                unitPrice: 8500,
                unit: "Nos",
                type: ProductType.PRODUCT,
                isActive: true,
                description: "IP67 rated rugged edge gateway for factory machinery",
            },
            {
                tenantId,
                name: "24/7 Mission-Critical Technical Support Retainer",
                category: "Support & Maintenance",
                sku: "SRV-SUPP-247-MO",
                unitPrice: 25000,
                unit: "Month",
                type: ProductType.SERVICE,
                isActive: true,
                description: "Guaranteed 15-minute response time and dedicated account manager",
            },
        ]

        for (const p of seedProducts) {
            await prisma.product.create({ data: p })
        }

        products = await prisma.product.findMany({ where: { tenantId } })
    }

    // 1. Wholesale Partner Rate Card
    const wholesalePl = await prisma.priceList.create({
        data: {
            tenantId,
            code: "PL-WHOLESALE",
            name: "Wholesale Partner Rate Card",
            description: "Contracted wholesale tier with progressive bulk volume breaks",
            type: PriceListType.SALES,
            pricingScheme: PricingScheme.FIXED_OVERRIDE,
            defaultDiscount: 15,
            targetGroup: "WHOLESALE",
            isActive: true,
            isDefault: false,
        },
    })

    // 2. Enterprise VIP Rate Card
    const enterprisePl = await prisma.priceList.create({
        data: {
            tenantId,
            code: "PL-ENTERPRISE-VIP",
            name: "Enterprise VIP Corporate Rate Card",
            description: "Strategic account preferential rates with 20% baseline discount",
            type: PriceListType.SALES,
            pricingScheme: PricingScheme.PERCENTAGE_DISCOUNT,
            defaultDiscount: 20,
            targetGroup: "VIP",
            isActive: true,
            isDefault: false,
        },
    })

    // 3. High-Volume Distributor Rate Card
    const distributorPl = await prisma.priceList.create({
        data: {
            tenantId,
            code: "PL-DISTRIBUTOR",
            name: "High-Volume Distributor Rate Card",
            description: "Tiered pricing optimized for high-volume distributor order quantities",
            type: PriceListType.SALES,
            pricingScheme: PricingScheme.FIXED_OVERRIDE,
            defaultDiscount: 25,
            targetGroup: "DISTRIBUTOR",
            isActive: true,
            isDefault: false,
        },
    })

    // Seed product overrides with volume break tiers
    const p1 = products[0] // ERP License
    const p2 = products[1] // Cloud DB
    const p4 = products[3] // IoT Hardware

    if (p1) {
        // Wholesale: minQty 1 -> ₹105,000, minQty 5 -> ₹98,000, minQty 20 -> ₹88,000
        await prisma.priceListItem.createMany({
            data: [
                {
                    tenantId,
                    priceListId: wholesalePl.id,
                    productId: p1.id,
                    minQuantity: 1,
                    customPrice: 105000,
                    discountPercent: 12.5,
                },
                {
                    tenantId,
                    priceListId: wholesalePl.id,
                    productId: p1.id,
                    minQuantity: 5,
                    customPrice: 98000,
                    discountPercent: 18.3,
                },
                {
                    tenantId,
                    priceListId: wholesalePl.id,
                    productId: p1.id,
                    minQuantity: 20,
                    customPrice: 88000,
                    discountPercent: 26.6,
                },
            ],
        })

        // Enterprise: 20% baseline, 25% at 5+ units
        await prisma.priceListItem.createMany({
            data: [
                {
                    tenantId,
                    priceListId: enterprisePl.id,
                    productId: p1.id,
                    minQuantity: 1,
                    discountPercent: 20,
                    customPrice: 96000,
                },
                {
                    tenantId,
                    priceListId: enterprisePl.id,
                    productId: p1.id,
                    minQuantity: 5,
                    discountPercent: 25,
                    customPrice: 90000,
                },
            ],
        })
    }

    if (p2) {
        // Wholesale for Cloud DB: minQty 1 -> ₹38,000, minQty 10 -> ₹32,000
        await prisma.priceListItem.createMany({
            data: [
                {
                    tenantId,
                    priceListId: wholesalePl.id,
                    productId: p2.id,
                    minQuantity: 1,
                    customPrice: 38000,
                    discountPercent: 15.5,
                },
                {
                    tenantId,
                    priceListId: wholesalePl.id,
                    productId: p2.id,
                    minQuantity: 10,
                    customPrice: 32000,
                    discountPercent: 28.8,
                },
            ],
        })
    }

    if (p4) {
        // Distributor for IoT Hardware: minQty 1 -> ₹7,200, minQty 25 -> ₹6,500, minQty 100 -> ₹5,500
        await prisma.priceListItem.createMany({
            data: [
                {
                    tenantId,
                    priceListId: distributorPl.id,
                    productId: p4.id,
                    minQuantity: 1,
                    customPrice: 7200,
                    discountPercent: 15.2,
                },
                {
                    tenantId,
                    priceListId: distributorPl.id,
                    productId: p4.id,
                    minQuantity: 25,
                    customPrice: 6500,
                    discountPercent: 23.5,
                },
                {
                    tenantId,
                    priceListId: distributorPl.id,
                    productId: p4.id,
                    minQuantity: 100,
                    customPrice: 5500,
                    discountPercent: 35.2,
                },
            ],
        })
    }

    // Link available contacts to rate cards
    const sampleContacts = await prisma.contact.findMany({
        where: { tenantId },
        take: 3,
    })

    if (sampleContacts[0]) {
        await prisma.contact.update({
            where: { id: sampleContacts[0].id },
            data: { priceListId: wholesalePl.id, customerGroup: "WHOLESALE" },
        })
    }
    if (sampleContacts[1]) {
        await prisma.contact.update({
            where: { id: sampleContacts[1].id },
            data: { priceListId: enterprisePl.id, customerGroup: "VIP" },
        })
    }
}

/* ─────────────────────────────────────────
   1. Get Price Lists Overview & Pricing Matrix
───────────────────────────────────────── */

export async function getPriceListsOverview(): Promise<{
    data?: PriceListsOverviewData
    error?: string
}> {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) return { error: "Authentication required" }

        // Auto-seed if empty
        await autoSeedPriceListsIfEmpty(tenantId)

        // 1. Fetch Price Lists with Items
        const rawPriceLists = await prisma.priceList.findMany({
            where: { tenantId },
            include: {
                items: {
                    include: {
                        product: { select: { id: true, name: true, sku: true, category: true, unitPrice: true } },
                    },
                    orderBy: [{ productId: "asc" }, { minQuantity: "asc" }],
                },
                contacts: { select: { id: true } },
            },
            orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        })

        const priceLists: PriceListRecord[] = rawPriceLists.map((pl: any) => ({
            id: pl.id,
            tenantId: pl.tenantId,
            code: pl.code,
            name: pl.name,
            description: pl.description,
            type: pl.type,
            currencyCode: pl.currencyCode,
            pricingScheme: pl.pricingScheme,
            defaultDiscount: Number(pl.defaultDiscount),
            targetGroup: pl.targetGroup,
            isDefault: pl.isDefault,
            isActive: pl.isActive,
            startDate: pl.startDate,
            endDate: pl.endDate,
            itemCount: pl.items.length,
            assignedCustomerCount: pl.contacts.length,
            createdAt: pl.createdAt,
            items: pl.items.map((it: any) => {
                const baseP = Number(it.product.unitPrice)
                const customP = it.customPrice !== null ? Number(it.customPrice) : null
                const discP = it.discountPercent !== null ? Number(it.discountPercent) : null

                let effective = baseP
                if (customP !== null) {
                    effective = customP
                } else if (discP !== null) {
                    effective = baseP * (1 - discP / 100)
                } else if (Number(pl.defaultDiscount) > 0) {
                    effective = baseP * (1 - Number(pl.defaultDiscount) / 100)
                }

                return {
                    id: it.id,
                    priceListId: it.priceListId,
                    priceListName: pl.name,
                    priceListCode: pl.code,
                    productId: it.productId,
                    productName: it.product.name,
                    productSku: it.product.sku,
                    productCategory: it.product.category,
                    basePrice: baseP,
                    minQuantity: Number(it.minQuantity),
                    customPrice: customP,
                    discountPercent: discP,
                    effectiveUnitPrice: effective,
                    startDate: it.startDate,
                    endDate: it.endDate,
                }
            }),
        }))

        // 2. Fetch Products
        const rawProducts = await prisma.product.findMany({
            where: { tenantId, isActive: true },
            orderBy: { name: "asc" },
        })

        const products: ProductLookup[] = rawProducts.map((p: any) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            category: p.category,
            unitPrice: Number(p.unitPrice),
            currency: p.currency,
            unit: p.unit,
            isActive: p.isActive,
        }))

        // 3. Fetch Customers
        const rawCustomers = await prisma.contact.findMany({
            where: { tenantId },
            include: {
                priceList: { select: { id: true, name: true } },
            },
            orderBy: { displayName: "asc" },
        })

        const customers: CustomerLookup[] = rawCustomers.map((c: any) => ({
            id: c.id,
            displayName: c.displayName,
            email: c.email,
            companyName: c.companyName,
            customerGroup: c.customerGroup,
            priceListId: c.priceListId,
            priceListName: c.priceList?.name ?? null,
        }))

        // 4. Construct Product Pricing Matrix
        const matrixData: ProductPricingMatrixRow[] = products.map((prod) => {
            const pricesByList: Record<
                string,
                {
                    priceListId: string
                    priceListCode: string
                    effectivePrice: number
                    discountPercent: number
                    hasVolumeTiers: boolean
                    minQuantity: number
                }
            > = {}

            for (const pl of priceLists) {
                // Find matching overrides for this product in price list
                const matchingItems = pl.items.filter((it) => it.productId === prod.id)

                if (matchingItems.length > 0) {
                    // Sort by minQuantity ascending, take base tier (minQuantity = 1 or lowest)
                    const baseTier = matchingItems[0]
                    const effective = baseTier.effectiveUnitPrice
                    const disc =
                        prod.unitPrice > 0 ? ((prod.unitPrice - effective) / prod.unitPrice) * 100 : 0

                    pricesByList[pl.id] = {
                        priceListId: pl.id,
                        priceListCode: pl.code,
                        effectivePrice: effective,
                        discountPercent: Math.max(0, Math.round(disc * 10) / 10),
                        hasVolumeTiers: matchingItems.length > 1,
                        minQuantity: baseTier.minQuantity,
                    }
                } else if (pl.defaultDiscount > 0) {
                    const effective = prod.unitPrice * (1 - pl.defaultDiscount / 100)
                    pricesByList[pl.id] = {
                        priceListId: pl.id,
                        priceListCode: pl.code,
                        effectivePrice: effective,
                        discountPercent: pl.defaultDiscount,
                        hasVolumeTiers: false,
                        minQuantity: 1,
                    }
                } else {
                    pricesByList[pl.id] = {
                        priceListId: pl.id,
                        priceListCode: pl.code,
                        effectivePrice: prod.unitPrice,
                        discountPercent: 0,
                        hasVolumeTiers: false,
                        minQuantity: 1,
                    }
                }
            }

            return {
                productId: prod.id,
                productName: prod.name,
                sku: prod.sku,
                category: prod.category,
                basePrice: prod.unitPrice,
                unit: prod.unit,
                pricesByList,
            }
        })

        // 5. Calculate KPI Stats
        const activeRateCards = priceLists.filter((pl) => pl.isActive).length
        const totalItemOverrides = priceLists.reduce((acc, pl) => acc + pl.itemCount, 0)
        const assignedCustomersCount = customers.filter((c) => c.priceListId !== null).length

        let discountSum = 0
        let discountCount = 0

        for (const pl of priceLists) {
            if (pl.defaultDiscount > 0) {
                discountSum += pl.defaultDiscount
                discountCount++
            }
            for (const it of pl.items) {
                if (it.discountPercent !== null && it.discountPercent > 0) {
                    discountSum += it.discountPercent
                    discountCount++
                }
            }
        }

        const avgDiscountPercent =
            discountCount > 0 ? Math.round((discountSum / discountCount) * 10) / 10 : 15.0

        const stats: PriceListsOverviewStats = {
            activeRateCards,
            totalItemOverrides,
            avgDiscountPercent,
            assignedCustomersCount,
        }

        return {
            data: {
                stats,
                priceLists,
                products,
                customers,
                matrixData,
            },
        }
    } catch (err: any) {
        console.error("Error in getPriceListsOverview:", err)
        return { error: err.message || "Failed to load price lists overview" }
    }
}

/* ─────────────────────────────────────────
   2. Create Price List
───────────────────────────────────────── */

export interface CreatePriceListInput {
    code: string
    name: string
    description?: string
    type?: PriceListType
    currencyCode?: string
    pricingScheme?: PricingScheme
    defaultDiscount?: number
    targetGroup?: string
    isDefault?: boolean
    startDate?: string
    endDate?: string
}

export async function createPriceList(data: CreatePriceListInput): Promise<{
    success?: boolean
    error?: string
}> {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) return { error: "Authentication required" }

        if (!data.name?.trim()) return { error: "Price List name is required" }
        if (!data.code?.trim()) return { error: "Price List code is required" }

        const cleanCode = data.code.trim().toUpperCase()

        const existing = await prisma.priceList.findUnique({
            where: { tenantId_code: { tenantId, code: cleanCode } },
        })

        if (existing) {
            return { error: `Price list with code "${cleanCode}" already exists` }
        }

        await prisma.$transaction(async (tx: any) => {
            if (data.isDefault) {
                // Unmark existing default
                await tx.priceList.updateMany({
                    where: { tenantId, isDefault: true },
                    data: { isDefault: false },
                })
            }

            await tx.priceList.create({
                data: {
                    tenantId,
                    code: cleanCode,
                    name: data.name.trim(),
                    description: data.description?.trim() || null,
                    type: data.type || PriceListType.SALES,
                    currencyCode: data.currencyCode || "INR",
                    pricingScheme: data.pricingScheme || PricingScheme.FIXED_OVERRIDE,
                    defaultDiscount: Number(data.defaultDiscount || 0),
                    targetGroup: data.targetGroup?.trim() || null,
                    isDefault: !!data.isDefault,
                    startDate: data.startDate ? new Date(data.startDate) : null,
                    endDate: data.endDate ? new Date(data.endDate) : null,
                    isActive: true,
                },
            })
        })

        revalidatePath("/sales/price-lists")
        return { success: true }
    } catch (err: any) {
        console.error("Error in createPriceList:", err)
        return { error: err.message || "Failed to create price list" }
    }
}

/* ─────────────────────────────────────────
   3. Update Price List
───────────────────────────────────────── */

export async function updatePriceList(
    id: string,
    data: Partial<CreatePriceListInput> & { isActive?: boolean }
): Promise<{ success?: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) return { error: "Authentication required" }

        const existing = await prisma.priceList.findFirst({
            where: { id, tenantId },
        })

        if (!existing) return { error: "Price List not found" }

        await prisma.$transaction(async (tx: any) => {
            if (data.isDefault) {
                await tx.priceList.updateMany({
                    where: { tenantId, isDefault: true },
                    data: { isDefault: false },
                })
            }

            await tx.priceList.update({
                where: { id },
                data: {
                    name: data.name !== undefined ? data.name.trim() : existing.name,
                    description: data.description !== undefined ? data.description?.trim() || null : existing.description,
                    pricingScheme: data.pricingScheme || existing.pricingScheme,
                    defaultDiscount: data.defaultDiscount !== undefined ? Number(data.defaultDiscount) : existing.defaultDiscount,
                    targetGroup: data.targetGroup !== undefined ? data.targetGroup?.trim() || null : existing.targetGroup,
                    isDefault: data.isDefault !== undefined ? !!data.isDefault : existing.isDefault,
                    isActive: data.isActive !== undefined ? !!data.isActive : existing.isActive,
                    startDate: data.startDate !== undefined ? (data.startDate ? new Date(data.startDate) : null) : existing.startDate,
                    endDate: data.endDate !== undefined ? (data.endDate ? new Date(data.endDate) : null) : existing.endDate,
                },
            })
        })

        revalidatePath("/sales/price-lists")
        return { success: true }
    } catch (err: any) {
        console.error("Error in updatePriceList:", err)
        return { error: err.message || "Failed to update price list" }
    }
}

/* ─────────────────────────────────────────
   4. Delete Price List
───────────────────────────────────────── */

export async function deletePriceList(id: string): Promise<{ success?: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) return { error: "Authentication required" }

        await prisma.priceList.delete({
            where: { id, tenantId },
        })

        revalidatePath("/sales/price-lists")
        return { success: true }
    } catch (err: any) {
        console.error("Error in deletePriceList:", err)
        return { error: err.message || "Failed to delete price list" }
    }
}

/* ─────────────────────────────────────────
   5. Upsert Product Price Override (Volume Break)
───────────────────────────────────────── */

export interface UpsertPriceListItemInput {
    id?: string
    priceListId: string
    productId: string
    minQuantity: number
    customPrice?: number
    discountPercent?: number
    startDate?: string
    endDate?: string
}

export async function upsertPriceListItem(data: UpsertPriceListItemInput): Promise<{
    success?: boolean
    error?: string
}> {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) return { error: "Authentication required" }

        if (!data.priceListId) return { error: "Price List must be selected" }
        if (!data.productId) return { error: "Product must be selected" }

        const minQuantity = Math.max(1, Number(data.minQuantity || 1))
        const customPrice = data.customPrice !== undefined && !isNaN(Number(data.customPrice)) ? Number(data.customPrice) : null
        const discountPercent = data.discountPercent !== undefined && !isNaN(Number(data.discountPercent)) ? Number(data.discountPercent) : null

        if (customPrice === null && discountPercent === null) {
            return { error: "Must specify either a custom price or discount percentage" }
        }

        const startDate = data.startDate ? new Date(data.startDate) : null
        const endDate = data.endDate ? new Date(data.endDate) : null

        await prisma.priceListItem.upsert({
            where: {
                priceListId_productId_minQuantity: {
                    priceListId: data.priceListId,
                    productId: data.productId,
                    minQuantity,
                },
            },
            create: {
                tenantId,
                priceListId: data.priceListId,
                productId: data.productId,
                minQuantity,
                customPrice,
                discountPercent,
                startDate,
                endDate,
            },
            update: {
                customPrice,
                discountPercent,
                startDate,
                endDate,
            },
        })

        revalidatePath("/sales/price-lists")
        return { success: true }
    } catch (err: any) {
        console.error("Error in upsertPriceListItem:", err)
        return { error: err.message || "Failed to save product price override" }
    }
}

/* ─────────────────────────────────────────
   6. Delete Product Price Override
───────────────────────────────────────── */

export async function deletePriceListItem(id: string): Promise<{ success?: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) return { error: "Authentication required" }

        await prisma.priceListItem.delete({
            where: { id, tenantId },
        })

        revalidatePath("/sales/price-lists")
        return { success: true }
    } catch (err: any) {
        console.error("Error in deletePriceListItem:", err)
        return { error: err.message || "Failed to remove price override" }
    }
}

/* ─────────────────────────────────────────
   7. Assign Price List to Customer
───────────────────────────────────────── */

export async function assignContactPriceList(
    contactId: string,
    priceListId: string | null
): Promise<{ success?: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) return { error: "Authentication required" }

        await prisma.contact.update({
            where: { id: contactId, tenantId },
            data: { priceListId },
        })

        revalidatePath("/sales/price-lists")
        revalidatePath("/crm/contacts")
        return { success: true }
    } catch (err: any) {
        console.error("Error in assignContactPriceList:", err)
        return { error: err.message || "Failed to map customer to price list" }
    }
}

/* ─────────────────────────────────────────
   8. Pricing Calculation Engine (Simulator / Quotes / Invoices)
───────────────────────────────────────── */

export interface CalculatePriceInput {
    productId: string
    quantity: number
    customerId?: string
    customerGroup?: string
    priceListId?: string
}

export async function calculateEffectivePrice(
    input: CalculatePriceInput
): Promise<{ data?: CalculatePriceResult; error?: string }> {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) return { error: "Authentication required" }

        const product = await prisma.product.findFirst({
            where: { id: input.productId, tenantId },
        })

        if (!product) return { error: "Product not found" }

        const basePrice = Number(product.unitPrice)
        const quantity = Math.max(1, Number(input.quantity || 1))

        let targetPriceList: any = null

        // Priority 1: Explicit Price List specified
        if (input.priceListId) {
            targetPriceList = await prisma.priceList.findFirst({
                where: { id: input.priceListId, tenantId, isActive: true },
                include: { items: { where: { productId: product.id } } },
            })
        }

        // Priority 2: Customer's directly assigned Price List
        if (!targetPriceList && input.customerId) {
            const customer = await prisma.contact.findFirst({
                where: { id: input.customerId, tenantId },
                include: {
                    priceList: {
                        include: { items: { where: { productId: product.id } } },
                    },
                },
            })

            if (customer?.priceList && customer.priceList.isActive) {
                targetPriceList = customer.priceList
            }
        }

        // Priority 3: Customer group target match (e.g. WHOLESALE, VIP)
        if (!targetPriceList && input.customerGroup) {
            targetPriceList = await prisma.priceList.findFirst({
                where: {
                    tenantId,
                    targetGroup: input.customerGroup,
                    isActive: true,
                },
                include: { items: { where: { productId: product.id } } },
            })
        }

        // Priority 4: Default tenant Price List
        if (!targetPriceList) {
            targetPriceList = await prisma.priceList.findFirst({
                where: { tenantId, isDefault: true, isActive: true },
                include: { items: { where: { productId: product.id } } },
            })
        }

        // Evaluate price rules
        let appliedTierMinQty = 1
        let discountPercent = 0
        let unitPrice = basePrice

        if (targetPriceList) {
            const items: any[] = targetPriceList.items || []

            // Find matching volume tier where quantity >= minQuantity
            // Pick highest minQuantity match
            const validTiers = items
                .filter((it) => quantity >= Number(it.minQuantity))
                .sort((a, b) => Number(b.minQuantity) - Number(a.minQuantity))

            if (validTiers.length > 0) {
                const bestTier = validTiers[0]
                appliedTierMinQty = Number(bestTier.minQuantity)

                if (bestTier.customPrice !== null) {
                    unitPrice = Number(bestTier.customPrice)
                    discountPercent =
                        basePrice > 0 ? ((basePrice - unitPrice) / basePrice) * 100 : 0
                } else if (bestTier.discountPercent !== null) {
                    discountPercent = Number(bestTier.discountPercent)
                    unitPrice = basePrice * (1 - discountPercent / 100)
                }
            } else if (Number(targetPriceList.defaultDiscount) > 0) {
                discountPercent = Number(targetPriceList.defaultDiscount)
                unitPrice = basePrice * (1 - discountPercent / 100)
            }
        }

        const totalAmount = unitPrice * quantity
        const totalSavings = Math.max(0, (basePrice - unitPrice) * quantity)

        return {
            data: {
                productId: product.id,
                productName: product.name,
                basePrice,
                quantity,
                appliedPriceListId: targetPriceList ? targetPriceList.id : null,
                appliedPriceListName: targetPriceList ? targetPriceList.name : "Base Catalog",
                appliedTierMinQuantity: appliedTierMinQty,
                discountPercent: Math.round(discountPercent * 10) / 10,
                unitPrice,
                totalAmount,
                totalSavings,
                currencyCode: product.currency || "INR",
            },
        }
    } catch (err: any) {
        console.error("Error in calculateEffectivePrice:", err)
        return { error: err.message || "Failed to calculate effective price" }
    }
}
