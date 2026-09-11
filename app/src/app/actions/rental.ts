"use server"

import { prisma } from "@/lib/prisma"
import { getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"
import {
    AssetCondition,
    RentalAssetStatus,
    RentalBillingCycle,
    RentalStatus,
    DepositStatus,
    InvoiceType,
    InvoiceStatus,
} from "@prisma/client"

export interface RentalAssetRecord {
    id: string
    tenantId: string
    assetCode: string
    name: string
    category: string
    serialNumber: string | null
    dailyRate: number
    weeklyRate: number | null
    monthlyRate: number | null
    securityDeposit: number
    condition: AssetCondition
    status: RentalAssetStatus
    warehouseId: string | null
    warehouseName: string | null
    description: string | null
    specifications: Record<string, unknown> | null
    createdAt: Date
    updatedAt: Date
}

export interface RentalAgreementItemRecord {
    id: string
    agreementId: string
    assetId: string
    assetCode: string
    assetName: string
    category: string
    quantity: number
    rate: number
    rentalDays: number
    totalAmount: number
    conditionOut: AssetCondition
    conditionIn: AssetCondition | null
}

export interface RentalAgreementRecord {
    id: string
    tenantId: string
    agreementNumber: string
    contactId: string
    contactName: string
    contactEmail: string | null
    contactPhone: string | null
    startDate: Date
    endDate: Date
    actualReturnDate: Date | null
    billingCycle: RentalBillingCycle
    rentalRate: number
    totalRentalAmount: number
    securityDeposit: number
    depositStatus: DepositStatus
    status: RentalStatus
    invoiceId: string | null
    invoiceNumber: string | null
    terms: string | null
    notes: string | null
    items: RentalAgreementItemRecord[]
    itemsCount: number
    createdAt: Date
    updatedAt: Date
}

export interface RentalReturnRecord {
    id: string
    agreementId: string
    agreementNumber: string
    assetId: string
    assetCode: string
    assetName: string
    customerName: string
    returnDate: Date
    condition: AssetCondition
    damageNotes: string | null
    damageFee: number
    lateFee: number
    depositRefunded: number
    netRefund: number
    inspectedBy: string | null
    createdAt: Date
}

export interface RentalOverviewData {
    stats: {
        totalAssets: number
        availableAssets: number
        rentedAssets: number
        maintenanceAssets: number
        availabilityRate: number
        activeAgreements: number
        overdueAgreements: number
        totalContractValue: number
        totalDepositHeld: number
        totalDamageFeesCollected: number
    }
    agreements: RentalAgreementRecord[]
    assets: RentalAssetRecord[]
    returns: RentalReturnRecord[]
    availableCustomers: Array<{ id: string; name: string; email: string | null; phone: string | null }>
    availableWarehouses: Array<{ id: string; name: string; code: string }>
}

export interface CreateRentalAssetInput {
    name: string
    category: string
    assetCode?: string
    serialNumber?: string
    dailyRate: number
    weeklyRate?: number
    monthlyRate?: number
    securityDeposit?: number
    condition?: AssetCondition
    status?: RentalAssetStatus
    warehouseId?: string
    description?: string
}

export interface UpdateRentalAssetInput {
    name?: string
    category?: string
    serialNumber?: string
    dailyRate?: number
    weeklyRate?: number
    monthlyRate?: number
    securityDeposit?: number
    condition?: AssetCondition
    status?: RentalAssetStatus
    warehouseId?: string
    description?: string
}

export interface CreateRentalAgreementInput {
    contactId: string
    startDate: string
    endDate: string
    billingCycle?: RentalBillingCycle
    terms?: string
    notes?: string
    items: Array<{
        assetId: string
        quantity: number
        rentalDays?: number
        rate?: number
    }>
}

export interface ProcessRentalReturnInput {
    agreementId: string
    assetId: string
    returnDate: string
    condition: AssetCondition
    damageNotes?: string
    damageFee?: number
    lateFee?: number
    depositRefunded?: number
    inspectedBy?: string
}

/**
 * Auto-seed realistic rental assets, agreements, and return records if tenant has 0 assets.
 */
async function autoSeedRentalIfEmpty(tenantId: string) {
    const existingCount = await prisma.rentalAsset.count({
        where: { tenantId }
    })

    if (existingCount > 0) return

    // Find or create default warehouse
    let warehouse = await prisma.warehouse.findFirst({
        where: { tenantId }
    })
    if (!warehouse) {
        warehouse = await prisma.warehouse.create({
            data: {
                tenantId,
                name: "Central Equipment Depot",
                code: "DEPOT-01",
                city: "Mumbai",
                state: "Maharashtra",
                country: "India",
                isDefault: true,
                isActive: true,
            }
        })
    }

    // Find or create a customer
    let contact = await prisma.contact.findFirst({
        where: { tenantId }
    })
    if (!contact) {
        contact = await prisma.contact.create({
            data: {
                tenantId,
                displayName: "Metro Infrastructure Pvt Ltd",
                companyName: "Metro Infrastructure",
                email: "procurement@metroinfra.in",
                phone: "+91 98200 11223",
                customerGroup: "corporate",
            }
        })
    }

    // Seed realistic assets
    const asset1 = await prisma.rentalAsset.create({
        data: {
            tenantId,
            assetCode: "AST-001",
            name: "Caterpillar 320D Hydraulic Excavator",
            category: "Heavy Machinery",
            serialNumber: "CAT-320D-88219",
            dailyRate: 12500,
            weeklyRate: 75000,
            monthlyRate: 280000,
            securityDeposit: 50000,
            condition: AssetCondition.EXCELLENT,
            status: RentalAssetStatus.RENTED,
            warehouseId: warehouse.id,
            description: "20-ton tracked medium excavator with quick-coupler bucket and certified ROPS cab.",
        }
    })

    const asset2 = await prisma.rentalAsset.create({
        data: {
            tenantId,
            assetCode: "AST-002",
            name: "Apple MacBook Pro 16\" M3 Max (64GB)",
            category: "IT Hardware",
            serialNumber: "C02G8901MD6R",
            dailyRate: 1800,
            weeklyRate: 10500,
            monthlyRate: 38000,
            securityDeposit: 20000,
            condition: AssetCondition.EXCELLENT,
            status: RentalAssetStatus.RENTED,
            warehouseId: warehouse.id,
            description: "Studio workstation laptop with 16-core CPU, 40-core GPU, and 2TB high-speed NVMe SSD.",
        }
    })

    const asset3 = await prisma.rentalAsset.create({
        data: {
            tenantId,
            assetCode: "AST-003",
            name: "Yamaha DZR12-D High-Output Audio Rig",
            category: "Audio / Visual",
            serialNumber: "YM-DZR-55102",
            dailyRate: 3500,
            weeklyRate: 20000,
            monthlyRate: 65000,
            securityDeposit: 15000,
            condition: AssetCondition.EXCELLENT,
            status: RentalAssetStatus.AVAILABLE,
            warehouseId: warehouse.id,
            description: "2000W 2-way powered loudspeaker system with onboard 96kHz DSP and Dante networking.",
        }
    })

    await prisma.rentalAsset.create({
        data: {
            tenantId,
            assetCode: "AST-004",
            name: "Mercedes-Benz Sprinter Cargo Van 3500",
            category: "Commercial Fleet",
            serialNumber: "WDB9066571S992",
            dailyRate: 5500,
            weeklyRate: 32000,
            monthlyRate: 110000,
            securityDeposit: 30000,
            condition: AssetCondition.GOOD,
            status: RentalAssetStatus.AVAILABLE,
            warehouseId: warehouse.id,
            description: "High-roof extended cargo van with hydraulic lift gate and GPS telematics tracker.",
        }
    })

    await prisma.rentalAsset.create({
        data: {
            tenantId,
            assetCode: "AST-005",
            name: "Genie GS-1930 Electric Scissor Lift 25ft",
            category: "Industrial Equipment",
            serialNumber: "GS19-109482",
            dailyRate: 4000,
            weeklyRate: 22000,
            monthlyRate: 75000,
            securityDeposit: 25000,
            condition: AssetCondition.UNDER_MAINTENANCE,
            status: RentalAssetStatus.MAINTENANCE,
            warehouseId: warehouse.id,
            description: "Zero-emission indoor slab scissor lift with 500 lbs platform capacity. Scheduled quarterly hydraulic inspection.",
        }
    })

    await prisma.rentalAsset.create({
        data: {
            tenantId,
            assetCode: "AST-006",
            name: "Sony FX6 Full-Frame Cinema Camera Kit",
            category: "Film & Production",
            serialNumber: "SN-FX6-33918",
            dailyRate: 6000,
            weeklyRate: 35000,
            monthlyRate: 120000,
            securityDeposit: 40000,
            condition: AssetCondition.EXCELLENT,
            status: RentalAssetStatus.AVAILABLE,
            warehouseId: warehouse.id,
            description: "4K 120p full-frame cinema package with electronic variable ND, G-Master 24-70mm lens, and V-mount battery pack.",
        }
    })

    // Seed realistic agreements
    const now = new Date()
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

    // Agreement 1: Active
    const ag1 = await prisma.rentalAgreement.create({
        data: {
            tenantId,
            agreementNumber: "RNT-2026-0001",
            contactId: contact.id,
            startDate: fourteenDaysAgo,
            endDate: sevenDaysFromNow,
            billingCycle: RentalBillingCycle.DAILY,
            rentalRate: 12500,
            totalRentalAmount: 262500, // 21 days * 12500
            securityDeposit: 50000,
            depositStatus: DepositStatus.HELD,
            status: RentalStatus.ACTIVE,
            notes: "Highway interchange excavation contract. Site delivery arranged to Metro Yard 4.",
            terms: "Hirer is responsible for daily fuel, certified operator, and site security. Any mechanical downtime to be notified within 4 hours.",
        }
    })

    await prisma.rentalAgreementItem.create({
        data: {
            tenantId,
            agreementId: ag1.id,
            assetId: asset1.id,
            quantity: 1,
            rate: 12500,
            rentalDays: 21,
            totalAmount: 262500,
            conditionOut: AssetCondition.EXCELLENT,
        }
    })

    // Agreement 2: Overdue
    const ag2 = await prisma.rentalAgreement.create({
        data: {
            tenantId,
            agreementNumber: "RNT-2026-0002",
            contactId: contact.id,
            startDate: tenDaysAgo,
            endDate: threeDaysAgo,
            billingCycle: RentalBillingCycle.DAILY,
            rentalRate: 1800,
            totalRentalAmount: 12600, // 7 days * 1800
            securityDeposit: 20000,
            depositStatus: DepositStatus.HELD,
            status: RentalStatus.OVERDUE,
            notes: "VFX rendering sprint deployment. Client requested extension pending producer approval.",
            terms: "Standard IT equipment lease. Overdue fee of 1.5x daily rate applies beyond agreed return date.",
        }
    })

    await prisma.rentalAgreementItem.create({
        data: {
            tenantId,
            agreementId: ag2.id,
            assetId: asset2.id,
            quantity: 1,
            rate: 1800,
            rentalDays: 7,
            totalAmount: 12600,
            conditionOut: AssetCondition.EXCELLENT,
        }
    })

    // Agreement 3: Returned & Completed with Return Inspection
    const ag3 = await prisma.rentalAgreement.create({
        data: {
            tenantId,
            agreementNumber: "RNT-2026-0003",
            contactId: contact.id,
            startDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
            endDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
            actualReturnDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
            billingCycle: RentalBillingCycle.DAILY,
            rentalRate: 3500,
            totalRentalAmount: 52500, // 15 days * 3500
            securityDeposit: 15000,
            depositStatus: DepositStatus.FULLY_REFUNDED,
            status: RentalStatus.RETURNED,
            notes: "Corporate annual general meeting audio setup.",
        }
    })

    await prisma.rentalAgreementItem.create({
        data: {
            tenantId,
            agreementId: ag3.id,
            assetId: asset3.id,
            quantity: 1,
            rate: 3500,
            rentalDays: 15,
            totalAmount: 52500,
            conditionOut: AssetCondition.EXCELLENT,
            conditionIn: AssetCondition.EXCELLENT,
        }
    })

    await prisma.rentalReturn.create({
        data: {
            tenantId,
            agreementId: ag3.id,
            assetId: asset3.id,
            returnDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
            condition: AssetCondition.EXCELLENT,
            damageNotes: "All speakers, flight cases, and XLR cables returned in pristine condition. Zero cosmetic or driver damage.",
            damageFee: 0,
            lateFee: 0,
            depositRefunded: 15000,
            inspectedBy: "Rajesh Sharma (Lead Audio Tech)",
        }
    })
}

/**
 * Fetch rental dashboard overview with telemetry, agreements, assets, and return logs.
 */
export async function getRentalOverview(): Promise<RentalOverviewData> {
    const tenantId = await getTenantId()
    if (!tenantId) {
        throw new Error("Unauthorized or unauthenticated tenant context")
    }

    // Auto-seed if empty
    await autoSeedRentalIfEmpty(tenantId)

    // Check and update overdue agreements automatically
    const now = new Date()
    await prisma.rentalAgreement.updateMany({
        where: {
            tenantId,
            status: RentalStatus.ACTIVE,
            endDate: { lt: now }
        },
        data: {
            status: RentalStatus.OVERDUE
        }
    })

    // Fetch assets
    const rawAssets = await prisma.rentalAsset.findMany({
        where: { tenantId },
        include: {
            warehouse: {
                select: { id: true, name: true, code: true }
            }
        },
        orderBy: { assetCode: "asc" }
    })

    const assets: RentalAssetRecord[] = (rawAssets as any[]).map((a: any) => ({
        id: a.id,
        tenantId: a.tenantId,
        assetCode: a.assetCode,
        name: a.name,
        category: a.category,
        serialNumber: a.serialNumber,
        dailyRate: Number(a.dailyRate),
        weeklyRate: a.weeklyRate ? Number(a.weeklyRate) : null,
        monthlyRate: a.monthlyRate ? Number(a.monthlyRate) : null,
        securityDeposit: Number(a.securityDeposit),
        condition: a.condition,
        status: a.status,
        warehouseId: a.warehouseId,
        warehouseName: a.warehouse ? `${a.warehouse.name} (${a.warehouse.code})` : null,
        description: a.description,
        specifications: a.specifications as Record<string, unknown> | null,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
    }))

    // Fetch agreements with customer and items
    const rawAgreements = await prisma.rentalAgreement.findMany({
        where: { tenantId },
        include: {
            contact: {
                select: { id: true, displayName: true, email: true, phone: true }
            },
            items: {
                include: {
                    asset: {
                        select: { id: true, assetCode: true, name: true, category: true }
                    }
                }
            }
        },
        orderBy: { createdAt: "desc" }
    })

    // Fetch linked invoices if any
    const invoiceIds = (rawAgreements as any[]).map((ag: any) => ag.invoiceId).filter(Boolean) as string[]
    const invoices = invoiceIds.length > 0
        ? await prisma.invoice.findMany({
            where: { tenantId, id: { in: invoiceIds } },
            select: { id: true, invoiceNumber: true }
        })
        : []
    const invoiceMap = new Map((invoices as any[]).map((inv: any) => [inv.id, inv.invoiceNumber]))

    const agreements: RentalAgreementRecord[] = (rawAgreements as any[]).map((ag: any) => ({
        id: ag.id,
        tenantId: ag.tenantId,
        agreementNumber: ag.agreementNumber,
        contactId: ag.contactId,
        contactName: ag.contact.displayName,
        contactEmail: ag.contact.email,
        contactPhone: ag.contact.phone,
        startDate: ag.startDate,
        endDate: ag.endDate,
        actualReturnDate: ag.actualReturnDate,
        billingCycle: ag.billingCycle,
        rentalRate: Number(ag.rentalRate),
        totalRentalAmount: Number(ag.totalRentalAmount),
        securityDeposit: Number(ag.securityDeposit),
        depositStatus: ag.depositStatus,
        status: ag.status,
        invoiceId: ag.invoiceId,
        invoiceNumber: ag.invoiceId ? invoiceMap.get(ag.invoiceId) || null : null,
        terms: ag.terms,
        notes: ag.notes,
        itemsCount: ag.items.length,
        items: ag.items.map((item: any) => ({
            id: item.id,
            agreementId: item.agreementId,
            assetId: item.assetId,
            assetCode: item.asset.assetCode,
            assetName: item.asset.name,
            category: item.asset.category,
            quantity: item.quantity,
            rate: Number(item.rate),
            rentalDays: item.rentalDays,
            totalAmount: Number(item.totalAmount),
            conditionOut: item.conditionOut,
            conditionIn: item.conditionIn,
        })),
        createdAt: ag.createdAt,
        updatedAt: ag.updatedAt,
    }))

    // Fetch returns inspection logs
    const rawReturns = await prisma.rentalReturn.findMany({
        where: { tenantId },
        include: {
            agreement: {
                select: {
                    agreementNumber: true,
                    contact: { select: { displayName: true } }
                }
            },
            asset: {
                select: { assetCode: true, name: true }
            }
        },
        orderBy: { returnDate: "desc" }
    })

    const returns: RentalReturnRecord[] = (rawReturns as any[]).map((r: any) => {
        const damageFee = Number(r.damageFee)
        const lateFee = Number(r.lateFee)
        const depositRefunded = Number(r.depositRefunded)
        return {
            id: r.id,
            agreementId: r.agreementId,
            agreementNumber: r.agreement.agreementNumber,
            assetId: r.assetId,
            assetCode: r.asset.assetCode,
            assetName: r.asset.name,
            customerName: r.agreement.contact.displayName,
            returnDate: r.returnDate,
            condition: r.condition,
            damageNotes: r.damageNotes,
            damageFee,
            lateFee,
            depositRefunded,
            netRefund: depositRefunded - (damageFee + lateFee),
            inspectedBy: r.inspectedBy,
            createdAt: r.createdAt,
        }
    })

    // Fetch dropdown data
    const rawCustomers = await prisma.contact.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, displayName: true, email: true, phone: true },
        orderBy: { displayName: "asc" }
    })
    const availableCustomers = (rawCustomers as any[]).map((c: any) => ({
        id: c.id,
        name: c.displayName,
        email: c.email,
        phone: c.phone
    }))

    const rawWarehouses = await prisma.warehouse.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true, code: true },
        orderBy: { name: "asc" }
    })
    const availableWarehouses = (rawWarehouses as any[]).map((w: any) => ({
        id: w.id,
        name: w.name,
        code: w.code
    }))

    // Compute KPI telemetry
    const totalAssets = assets.length
    const availableAssets = assets.filter(a => a.status === RentalAssetStatus.AVAILABLE).length
    const rentedAssets = assets.filter(a => a.status === RentalAssetStatus.RENTED).length
    const maintenanceAssets = assets.filter(a => a.status === RentalAssetStatus.MAINTENANCE).length
    const availabilityRate = totalAssets > 0 ? Math.round((availableAssets / totalAssets) * 100) : 0

    const activeAgreements = agreements.filter(ag => ag.status === RentalStatus.ACTIVE).length
    const overdueAgreements = agreements.filter(ag => ag.status === RentalStatus.OVERDUE).length
    const totalContractValue = agreements
        .filter(ag => ag.status === RentalStatus.ACTIVE || ag.status === RentalStatus.OVERDUE)
        .reduce((sum, ag) => sum + ag.totalRentalAmount, 0)
    const totalDepositHeld = agreements
        .filter(ag => ag.depositStatus === DepositStatus.HELD)
        .reduce((sum, ag) => sum + ag.securityDeposit, 0)
    const totalDamageFeesCollected = returns.reduce((sum, r) => sum + r.damageFee + r.lateFee, 0)

    return {
        stats: {
            totalAssets,
            availableAssets,
            rentedAssets,
            maintenanceAssets,
            availabilityRate,
            activeAgreements,
            overdueAgreements,
            totalContractValue,
            totalDepositHeld,
            totalDamageFeesCollected,
        },
        agreements,
        assets,
        returns,
        availableCustomers,
        availableWarehouses,
    }
}

/**
 * Register a new rental asset.
 */
export async function createRentalAsset(input: CreateRentalAssetInput) {
    const tenantId = await getTenantId()
    if (!tenantId) throw new Error("Unauthorized tenant context")

    if (!input.name.trim() || !input.category.trim()) {
        throw new Error("Asset name and category are required")
    }

    // Generate asset code if not supplied
    let assetCode = input.assetCode?.trim()
    if (!assetCode) {
        const count = await prisma.rentalAsset.count({ where: { tenantId } })
        assetCode = `AST-${String(count + 1).padStart(3, "0")}`
    }

    const newAsset = await prisma.rentalAsset.create({
        data: {
            tenantId,
            assetCode,
            name: input.name.trim(),
            category: input.category.trim(),
            serialNumber: input.serialNumber?.trim() || null,
            dailyRate: input.dailyRate,
            weeklyRate: input.weeklyRate || null,
            monthlyRate: input.monthlyRate || null,
            securityDeposit: input.securityDeposit || 0,
            condition: input.condition || AssetCondition.EXCELLENT,
            status: input.status || RentalAssetStatus.AVAILABLE,
            warehouseId: input.warehouseId || null,
            description: input.description?.trim() || null,
        }
    })

    revalidatePath("/sales/rental")
    return newAsset
}

/**
 * Update an existing rental asset.
 */
export async function updateRentalAsset(id: string, input: UpdateRentalAssetInput) {
    const tenantId = await getTenantId()
    if (!tenantId) throw new Error("Unauthorized tenant context")

    const updated = await prisma.rentalAsset.update({
        where: { id, tenantId },
        data: {
            ...(input.name !== undefined && { name: input.name.trim() }),
            ...(input.category !== undefined && { category: input.category.trim() }),
            ...(input.serialNumber !== undefined && { serialNumber: input.serialNumber.trim() || null }),
            ...(input.dailyRate !== undefined && { dailyRate: input.dailyRate }),
            ...(input.weeklyRate !== undefined && { weeklyRate: input.weeklyRate || null }),
            ...(input.monthlyRate !== undefined && { monthlyRate: input.monthlyRate || null }),
            ...(input.securityDeposit !== undefined && { securityDeposit: input.securityDeposit }),
            ...(input.condition !== undefined && { condition: input.condition }),
            ...(input.status !== undefined && { status: input.status }),
            ...(input.warehouseId !== undefined && { warehouseId: input.warehouseId || null }),
            ...(input.description !== undefined && { description: input.description.trim() || null }),
        }
    })

    revalidatePath("/sales/rental")
    return updated
}

/**
 * Delete an asset (only if not currently rented or linked to active agreements).
 */
export async function deleteRentalAsset(id: string) {
    const tenantId = await getTenantId()
    if (!tenantId) throw new Error("Unauthorized tenant context")

    const asset = await prisma.rentalAsset.findUnique({
        where: { id, tenantId },
        include: {
            agreementItems: {
                include: {
                    agreement: { select: { status: true } }
                }
            }
        }
    })

    if (!asset) throw new Error("Asset not found")

    const hasActiveAgreements = (asset.agreementItems as any[]).some(
        (item: any) => item.agreement.status === RentalStatus.ACTIVE || item.agreement.status === RentalStatus.OVERDUE
    )

    if (hasActiveAgreements || asset.status === RentalAssetStatus.RENTED) {
        throw new Error("Cannot delete asset that is currently rented or linked to an active agreement")
    }

    await prisma.rentalAsset.delete({
        where: { id, tenantId }
    })

    revalidatePath("/sales/rental")
    return { success: true }
}

/**
 * Create a new rental agreement with asset checkout.
 */
export async function createRentalAgreement(input: CreateRentalAgreementInput) {
    const tenantId = await getTenantId()
    if (!tenantId) throw new Error("Unauthorized tenant context")

    if (!input.contactId) throw new Error("Customer contact is required")
    if (!input.startDate || !input.endDate) throw new Error("Start date and end date are required")
    if (!input.items || input.items.length === 0) throw new Error("At least one rental asset must be selected")

    const startDate = new Date(input.startDate)
    const endDate = new Date(input.endDate)
    if (endDate <= startDate) {
        throw new Error("End date must be after start date")
    }

    // Compute duration in days
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))

    // Generate agreement number
    const count = await prisma.rentalAgreement.count({ where: { tenantId } })
    const currentYear = new Date().getFullYear()
    const agreementNumber = `RNT-${currentYear}-${String(count + 1).padStart(4, "0")}`

    // Fetch assets to verify availability and rates
    const assetIds = input.items.map(i => i.assetId)
    const assets = await prisma.rentalAsset.findMany({
        where: { tenantId, id: { in: assetIds } }
    })
    const assetMap = new Map((assets as any[]).map((a: any) => [a.id, a]))

    let totalRentalAmount = 0
    let totalDeposit = 0

    const itemsToCreate = input.items.map(item => {
        const asset: any = assetMap.get(item.assetId)
        if (!asset) throw new Error(`Asset ID ${item.assetId} not found`)
        if (asset.status === RentalAssetStatus.RENTED) {
            throw new Error(`Asset ${asset.name} (${asset.assetCode}) is currently rented out`)
        }
        if (asset.status === RentalAssetStatus.MAINTENANCE) {
            throw new Error(`Asset ${asset.name} (${asset.assetCode}) is under maintenance`)
        }

        const quantity = item.quantity || 1
        const rate = item.rate !== undefined ? item.rate : Number(asset.dailyRate)
        const days = item.rentalDays || diffDays
        const itemTotal = rate * days * quantity

        totalRentalAmount += itemTotal
        totalDeposit += Number(asset.securityDeposit) * quantity

        return {
            assetId: asset.id,
            quantity,
            rate,
            rentalDays: days,
            totalAmount: itemTotal,
            conditionOut: asset.condition,
        }
    })

    // Create agreement & items in a transaction
    const agreement = await prisma.$transaction(async (tx: any) => {
        const ag = await tx.rentalAgreement.create({
            data: {
                tenantId,
                agreementNumber,
                contactId: input.contactId,
                startDate,
                endDate,
                billingCycle: input.billingCycle || RentalBillingCycle.DAILY,
                rentalRate: totalRentalAmount / diffDays,
                totalRentalAmount,
                securityDeposit: totalDeposit,
                depositStatus: totalDeposit > 0 ? DepositStatus.HELD : DepositStatus.FULLY_REFUNDED,
                status: RentalStatus.ACTIVE,
                terms: input.terms?.trim() || null,
                notes: input.notes?.trim() || null,
                items: {
                    create: itemsToCreate.map(item => ({
                        tenantId,
                        assetId: item.assetId,
                        quantity: item.quantity,
                        rate: item.rate,
                        rentalDays: item.rentalDays,
                        totalAmount: item.totalAmount,
                        conditionOut: item.conditionOut,
                    }))
                }
            }
        })

        // Mark checked-out assets as RENTED
        for (const item of itemsToCreate) {
            await tx.rentalAsset.update({
                where: { id: item.assetId, tenantId },
                data: { status: RentalAssetStatus.RENTED }
            })
        }

        return ag
    })

    revalidatePath("/sales/rental")
    return agreement
}

/**
 * Update rental agreement status (e.g. Cancel).
 */
export async function updateRentalAgreementStatus(id: string, status: RentalStatus) {
    const tenantId = await getTenantId()
    if (!tenantId) throw new Error("Unauthorized tenant context")

    const agreement = await prisma.rentalAgreement.findUnique({
        where: { id, tenantId },
        include: { items: true }
    })
    if (!agreement) throw new Error("Agreement not found")

    await prisma.$transaction(async (tx: any) => {
        await tx.rentalAgreement.update({
            where: { id, tenantId },
            data: { status }
        })

        // If cancelled, release rented assets back to AVAILABLE
        if (status === RentalStatus.CANCELLED) {
            for (const item of agreement.items) {
                await tx.rentalAsset.update({
                    where: { id: item.assetId, tenantId },
                    data: { status: RentalAssetStatus.AVAILABLE }
                })
            }
        }
    })

    revalidatePath("/sales/rental")
    return { success: true }
}

/**
 * Process rental return and damage inspection.
 */
export async function processRentalReturn(input: ProcessRentalReturnInput) {
    const tenantId = await getTenantId()
    if (!tenantId) throw new Error("Unauthorized tenant context")

    const agreement = await prisma.rentalAgreement.findUnique({
        where: { id: input.agreementId, tenantId },
        include: { items: true }
    })
    if (!agreement) throw new Error("Agreement not found")

    const returnDate = new Date(input.returnDate || new Date())
    const damageFee = input.damageFee || 0
    const lateFee = input.lateFee || 0
    const totalDeposit = Number(agreement.securityDeposit)
    const depositRefunded = input.depositRefunded !== undefined
        ? input.depositRefunded
        : Math.max(0, totalDeposit - (damageFee + lateFee))

    // Determine deposit status
    let depositStatus = agreement.depositStatus
    if (depositRefunded >= totalDeposit) {
        depositStatus = DepositStatus.FULLY_REFUNDED
    } else if (depositRefunded > 0) {
        depositStatus = DepositStatus.PARTIALLY_REFUNDED
    } else if (totalDeposit > 0) {
        depositStatus = DepositStatus.FORFEITED
    }

    // Determine target asset status based on condition
    let newAssetStatus: RentalAssetStatus = RentalAssetStatus.AVAILABLE
    if (input.condition === AssetCondition.DAMAGED || input.condition === AssetCondition.UNDER_MAINTENANCE) {
        newAssetStatus = RentalAssetStatus.MAINTENANCE
    }

    await prisma.$transaction(async (tx: any) => {
        // 1. Create return record
        await tx.rentalReturn.create({
            data: {
                tenantId,
                agreementId: input.agreementId,
                assetId: input.assetId,
                returnDate,
                condition: input.condition,
                damageNotes: input.damageNotes?.trim() || null,
                damageFee,
                lateFee,
                depositRefunded,
                inspectedBy: input.inspectedBy?.trim() || null,
            }
        })

        // 2. Update agreement item conditionIn
        await tx.rentalAgreementItem.updateMany({
            where: {
                agreementId: input.agreementId,
                assetId: input.assetId,
                tenantId
            },
            data: {
                conditionIn: input.condition
            }
        })

        // 3. Update asset status and condition
        await tx.rentalAsset.update({
            where: { id: input.assetId, tenantId },
            data: {
                status: newAssetStatus,
                condition: input.condition
            }
        })

        // 4. Check if all items for this agreement are returned
        const allItems = await tx.rentalAgreementItem.findMany({
            where: { agreementId: input.agreementId, tenantId }
        })
        const allReturned = (allItems as any[]).every((item: any) => item.conditionIn !== null)

        if (allReturned) {
            await tx.rentalAgreement.update({
                where: { id: input.agreementId, tenantId },
                data: {
                    status: RentalStatus.RETURNED,
                    actualReturnDate: returnDate,
                    depositStatus,
                }
            })
        } else {
            await tx.rentalAgreement.update({
                where: { id: input.agreementId, tenantId },
                data: { depositStatus }
            })
        }
    })

    revalidatePath("/sales/rental")
    return { success: true }
}

/**
 * Convert a rental agreement to an official Sales Invoice in `/sales/invoices`.
 */
export async function convertAgreementToInvoice(agreementId: string) {
    const tenantId = await getTenantId()
    if (!tenantId) throw new Error("Unauthorized tenant context")

    const agreement = await prisma.rentalAgreement.findUnique({
        where: { id: agreementId, tenantId },
        include: {
            contact: true,
            items: {
                include: {
                    asset: true
                }
            },
            returns: true
        }
    })

    if (!agreement) throw new Error("Agreement not found")
    if (agreement.invoiceId) {
        throw new Error("An invoice has already been generated for this rental agreement")
    }

    // Sequential invoice number
    const count = await prisma.invoice.count({ where: { tenantId } })
    const currentYear = new Date().getFullYear()
    const invoiceNumber = `INV-${currentYear}-${String(count + 1).padStart(4, "0")}`

    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId }
    })

    const billTo = {
        name: agreement.contact.displayName,
        email: agreement.contact.email,
        phone: agreement.contact.phone,
        address: agreement.contact.billingAddress || null,
        gstin: agreement.contact.gstin || null,
    }

    const subtotal = Number(agreement.totalRentalAmount)
    const totalDamageLateFees = (agreement.returns as any[]).reduce(
        (sum: number, r: any) => sum + Number(r.damageFee) + Number(r.lateFee),
        0
    )
    const grandSubtotal = subtotal + totalDamageLateFees

    // Approximate GST 18% standard
    const taxRate = 18
    const taxAmount = Math.round((grandSubtotal * (taxRate / 100)) * 100) / 100
    const total = grandSubtotal + taxAmount

    const newInvoice = await prisma.$transaction(async (tx: any) => {
        const inv = await tx.invoice.create({
            data: {
                tenantId,
                contactId: agreement.contactId,
                invoiceNumber,
                type: InvoiceType.TAX_INVOICE,
                status: InvoiceStatus.SENT,
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Net 30
                billTo,
                placeOfSupply: tenant?.countryCode === "IN" ? "Maharashtra (27)" : "Default",
                subtotal: grandSubtotal,
                taxAmount,
                discount: 0,
                total,
                currencyCode: tenant?.currencyCode || "INR",
                notes: `Generated from Rental Agreement #${agreement.agreementNumber}`,
                terms: agreement.terms || "Payment due within 30 days of invoice date.",
                items: {
                    create: [
                        ...agreement.items.map((item: any) => ({
                            tenantId,
                            description: `Rental: ${item.asset.name} (${item.asset.assetCode}) - ${item.rentalDays} Days`,
                            hsnSacCode: "9973", // GST SAC code for leasing/rental of machinery & equipment
                            quantity: item.quantity,
                            unitPrice: Number(item.rate),
                            discount: 0,
                            taxRate,
                            taxAmount: Math.round((Number(item.totalAmount) * (taxRate / 100)) * 100) / 100,
                            total: Number(item.totalAmount) + Math.round((Number(item.totalAmount) * (taxRate / 100)) * 100) / 100,
                        })),
                        ...(totalDamageLateFees > 0 ? [{
                            tenantId,
                            description: `Rental Damage & Late Return Fees (Agreement #${agreement.agreementNumber})`,
                            hsnSacCode: "9997",
                            quantity: 1,
                            unitPrice: totalDamageLateFees,
                            discount: 0,
                            taxRate: 0,
                            taxAmount: 0,
                            total: totalDamageLateFees,
                        }] : [])
                    ]
                }
            }
        })

        // Link back to agreement
        await tx.rentalAgreement.update({
            where: { id: agreementId, tenantId },
            data: { invoiceId: inv.id }
        })

        return inv
    })

    revalidatePath("/sales/rental")
    revalidatePath("/sales/invoices")
    return newInvoice
}
