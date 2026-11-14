import { PLATFORM } from "@/lib/constants/platform"
import { appUrl } from "@/lib/app-url"
import { formatCurrency } from "@/lib/utils"

/**
 * SAAS SUBSCRIPTION LIFECYCLE & PRORATION ENGINE
 * 
 * Manages plan tiers (FREE, BASIC, PRO, ENTERPRISE), billing cycles (Monthly/Annual),
 * multi-regional pricing, mid-cycle proration mathematics, and platform invoice generation.
 */

export type PlanTier = "FREE" | "BASIC" | "PRO" | "ENTERPRISE"
export type BillingCycle = "MONTHLY" | "ANNUAL"

export interface PlanLimits {
    maxContacts: number | null // null = unlimited
    maxInvoicesPerMonth: number | null
    maxTeamMembers: number | null
    maxWarehouses: number | null
    advancedTaxModules: boolean // India TDS/EWB/GSTR, UAE VAT, KSA ZATCA, AU BAS, UK MTD
    customRoles: boolean
    prioritySupport: boolean
}

export interface PlanTierDefinition {
    tier: PlanTier
    name: string
    badge?: string
    tagline: string
    description: string
    features: string[]
    limits: PlanLimits
    color: string
}

export interface RegionalPricing {
    currency: string
    symbol: string
    monthly: Record<PlanTier, number>
    annual: Record<PlanTier, number> // 20% discount on 12 months (i.e. monthly * 12 * 0.80)
}

export interface ProrationQuote {
    currentPlan: PlanTier
    targetPlan: PlanTier
    billingCycle: BillingCycle
    currency: string
    symbol: string
    isUpgrade: boolean
    isDowngrade: boolean
    isSamePlan: boolean
    
    // Day counts
    totalCycleDays: number
    daysUsed: number
    daysRemaining: number
    
    // Financials
    currentPlanCost: number
    unusedCredit: number
    targetPlanGross: number
    netPayableToday: number
    
    // Lifecycle dates
    effectiveDate: string
    nextBillingDate: string
    
    // Feature diff
    unlockedFeatures: string[]
    reducedFeatures: string[]
}

export interface SaaSPlatformInvoice {
    invoiceNumber: string
    tenantId: string
    tenantName: string
    tier: PlanTier
    billingCycle: BillingCycle
    issueDate: string
    periodStart: string
    periodEnd: string
    currency: string
    subtotal: number
    taxPercent: number
    taxAmount: number
    totalAmount: number
    status: "PAID" | "PENDING"
    paymentMethod: string
    transactionRef?: string
}

// ---------------------------------------------------------------------------
// 1. Plan Tier Definitions & Quotas
// ---------------------------------------------------------------------------

export const PLAN_TIERS: Record<PlanTier, PlanTierDefinition> = {
    FREE: {
        tier: "FREE",
        name: "Free Explorer",
        tagline: "Essential starter toolkit for new businesses",
        description: "Try core CRM and invoicing. No card required.",
        features: [
            "Up to 25 contacts",
            "Up to 15 invoices a month",
            "1 user",
            "Quotes and tax invoices (GST / VAT)",
            "Basic accounting ledger",
            "Email support",
        ],
        limits: {
            maxContacts: 25,
            maxInvoicesPerMonth: 15,
            maxTeamMembers: 1,
            maxWarehouses: 1,
            advancedTaxModules: false,
            customRoles: false,
            prioritySupport: false,
        },
        color: "slate",
    },

    BASIC: {
        tier: "BASIC",
        name: "Growth Basic",
        badge: "Most Popular for Small Teams",
        tagline: "Uncapped invoicing and multi-currency for small firms",
        description: "Unlimited contacts and invoices, multi-currency and stock tracking.",
        features: [
            "Unlimited contacts, leads and invoices",
            "Up to 5 users with roles",
            "2 warehouses with stock tracking",
            "GST, VAT or sales tax for your country",
            "Customer self-service portal",
            "Invoices by email",
            "Email support",
        ],
        limits: {
            maxContacts: null,
            maxInvoicesPerMonth: null,
            maxTeamMembers: 5,
            maxWarehouses: 2,
            advancedTaxModules: false,
            customRoles: false,
            prioritySupport: false,
        },
        color: "blue",
    },

    PRO: {
        tier: "PRO",
        name: "Professional Suite",
        badge: "Recommended",
        tagline: "Full ERP for growing teams",
        description: "Accounting, inventory, HR, projects and automation in one workspace.",
        features: [
            "Everything in Growth Basic",
            "Up to 20 users",
            "Up to 10 warehouses with stock transfers",
            "HR, attendance and payroll",
            "Projects and timesheets",
            "Workflow automation",
            "Priority email support",
        ],
        limits: {
            maxContacts: null,
            maxInvoicesPerMonth: null,
            maxTeamMembers: 20,
            maxWarehouses: 10,
            advancedTaxModules: true,
            customRoles: true,
            prioritySupport: true,
        },
        color: "primary",
    },

    ENTERPRISE: {
        tier: "ENTERPRISE",
        name: "Enterprise Custom",
        badge: "Unlimited Scale",
        tagline: "For larger teams and multi-site operations",
        description: "Unlimited users and warehouses, and rentals.",
        features: [
            "Everything in Professional Suite",
            "Unlimited users and warehouses",
            "Rental and asset tracking",
            "Workflow webhooks",
            "Dedicated account contact and priority support",
        ],
        limits: {
            maxContacts: null,
            maxInvoicesPerMonth: null,
            maxTeamMembers: null,
            maxWarehouses: null,
            advancedTaxModules: true,
            customRoles: true,
            prioritySupport: true,
        },
        color: "purple",
    },
}

// ---------------------------------------------------------------------------
// 2. Multi-Regional Pricing Catalog
// ---------------------------------------------------------------------------

export const REGIONAL_PRICING_CATALOG: Record<string, RegionalPricing> = {
    INR: {
        currency: "INR",
        symbol: "₹",
        monthly: {
            FREE: 0,
            BASIC: 999,
            PRO: 2499,
            ENTERPRISE: 6999,
        },
        annual: {
            FREE: 0,
            BASIC: 9590, // 999 * 12 * 0.80 = ~9,590
            PRO: 23990, // 2499 * 12 * 0.80 = ~23,990
            ENTERPRISE: 67190, // 6999 * 12 * 0.80 = ~67,190
        },
    },
    USD: {
        currency: "USD",
        symbol: "$",
        monthly: {
            FREE: 0,
            BASIC: 19,
            PRO: 49,
            ENTERPRISE: 149,
        },
        annual: {
            FREE: 0,
            BASIC: 182, // 19 * 12 * 0.80
            PRO: 470, // 49 * 12 * 0.80
            ENTERPRISE: 1430, // 149 * 12 * 0.80
        },
    },
    GBP: {
        currency: "GBP",
        symbol: "£",
        monthly: {
            FREE: 0,
            BASIC: 15,
            PRO: 39,
            ENTERPRISE: 119,
        },
        annual: {
            FREE: 0,
            BASIC: 144, // 15 * 12 * 0.80
            PRO: 374, // 39 * 12 * 0.80
            ENTERPRISE: 1142, // 119 * 12 * 0.80
        },
    },
    AED: {
        currency: "AED",
        symbol: "AED ",
        monthly: {
            FREE: 0,
            BASIC: 69,
            PRO: 179,
            ENTERPRISE: 549,
        },
        annual: {
            FREE: 0,
            BASIC: 662, // 69 * 12 * 0.80
            PRO: 1718, // 179 * 12 * 0.80
            ENTERPRISE: 5270, // 549 * 12 * 0.80
        },
    },
    SAR: {
        currency: "SAR",
        symbol: "SAR ",
        monthly: {
            FREE: 0,
            BASIC: 75,
            PRO: 189,
            ENTERPRISE: 579,
        },
        annual: {
            FREE: 0,
            BASIC: 720, // 75 * 12 * 0.80
            PRO: 1814, // 189 * 12 * 0.80
            ENTERPRISE: 5558, // 579 * 12 * 0.80
        },
    },
    AUD: {
        currency: "AUD",
        symbol: "AUD$", // never plain "$", so it can't be mistaken for US dollars
        monthly: {
            FREE: 0,
            BASIC: 29,
            PRO: 79,
            ENTERPRISE: 229,
        },
        annual: {
            FREE: 0,
            BASIC: 278, // 29 * 12 * 0.80
            PRO: 758, // 79 * 12 * 0.80
            ENTERPRISE: 2198, // 229 * 12 * 0.80
        },
    },
}

/**
 * Plan prices for a business's currency. The regions in Admin → Pricing
 * (INR, USD, GBP, AED, SAR, AUD) pay in their own currency; every other
 * currency (or none) pays the USD prices. Never falls back to India.
 */
/** Tax on Genesoft's plan invoices (prices include it): Indian GST only; every other country 0% (owner decision, 14 Nov 2026) */
export const PLAN_TAX_PERCENT: Record<string, number> = { INR: 18 }

export function getRegionalPricing(currencyCode?: string | null): RegionalPricing {
    return REGIONAL_PRICING_CATALOG[(currencyCode || "").toUpperCase()] || REGIONAL_PRICING_CATALOG.USD
}

/**
 * Returns tier rank order (0 = FREE, 1 = BASIC, 2 = PRO, 3 = ENTERPRISE).
 */
export function getTierRank(tier: PlanTier): number {
    switch (tier) {
        case "FREE":
            return 0
        case "BASIC":
            return 1
        case "PRO":
            return 2
        case "ENTERPRISE":
            return 3
        default:
            return 0
    }
}

/**
 * Returns exact pricing for a given plan tier, billing frequency, and regional currency.
 */
export function getPlanPrice(tier: PlanTier, cycle: BillingCycle = "MONTHLY", currencyCode?: string | null): number {
    const regional = getRegionalPricing(currencyCode)
    const priceTable = cycle === "ANNUAL" ? regional.annual : regional.monthly
    return priceTable[tier] ?? 0
}

// ---------------------------------------------------------------------------
// 3. Proration Mathematics & Quotation Engine
// ---------------------------------------------------------------------------

export interface CalculateProrationParams {
    currentPlan: PlanTier
    targetPlan: PlanTier
    currentBillingCycle?: BillingCycle
    targetBillingCycle: BillingCycle
    currencyCode?: string
    cycleStartDate?: Date | string
    cycleEndDate?: Date | string
    currentPaidAmount?: number
    /** Prices to use (e.g. from Admin → Pricing); defaults to the built-in catalog */
    pricing?: RegionalPricing
}

/**
 * Calculates mid-cycle pro-rata credits and net payable amount today.
 */
export function calculateSubscriptionProration(params: CalculateProrationParams): ProrationQuote {
    const {
        currentPlan,
        targetPlan,
        currentBillingCycle = "MONTHLY",
        targetBillingCycle,
        currencyCode = "INR",
        cycleStartDate,
        cycleEndDate,
        currentPaidAmount,
        pricing,
    } = params

    const catalog = pricing ?? getRegionalPricing(currencyCode)
    const currentRank = getTierRank(currentPlan)
    const targetRank = getTierRank(targetPlan)

    const isUpgrade = targetRank > currentRank
    const isDowngrade = targetRank < currentRank
    const isSamePlan = targetPlan === currentPlan && targetBillingCycle === currentBillingCycle

    // Target plan cost
    const targetPlanGross = targetBillingCycle === "ANNUAL"
        ? catalog.annual[targetPlan]
        : catalog.monthly[targetPlan]

    // Determine cycle duration in days
    const totalCycleDays = currentBillingCycle === "ANNUAL" ? 365 : 30

    // Determine elapsed and remaining days
    const now = new Date()
    const end = cycleEndDate ? new Date(cycleEndDate) : new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000)

    const diffTime = Math.max(0, end.getTime() - now.getTime())
    const daysRemaining = Math.min(totalCycleDays, Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24))))
    const daysUsed = Math.max(0, totalCycleDays - daysRemaining)

    // Current plan cost basis
    const baseCurrentCost = currentPaidAmount !== undefined
        ? currentPaidAmount
        : (currentBillingCycle === "ANNUAL" ? catalog.annual[currentPlan] : catalog.monthly[currentPlan])

    // Calculate unused credit ratio
    let unusedCredit = 0
    if (baseCurrentCost > 0 && totalCycleDays > 0) {
        const dailyRate = baseCurrentCost / totalCycleDays
        unusedCredit = Math.round(dailyRate * daysRemaining * 100) / 100
    }

    // Net payable today
    let netPayableToday = 0
    if (isUpgrade) {
        // Upgrade: Charge target plan minus unused credit from current cycle
        netPayableToday = Math.max(0, Math.round((targetPlanGross - unusedCredit) * 100) / 100)
    } else if (isDowngrade) {
        // Downgrade: If immediate, credit carries forward; usually 0 due today
        netPayableToday = 0
    } else {
        // Renewal / Same tier
        netPayableToday = targetPlanGross
    }

    // Lifecycle dates
    const effectiveDate = isDowngrade ? end.toISOString() : now.toISOString()
    const renewalDate = new Date(now)
    if (targetBillingCycle === "ANNUAL") {
        renewalDate.setFullYear(renewalDate.getFullYear() + 1)
    } else {
        renewalDate.setDate(renewalDate.getDate() + 30)
    }

    // Feature difference
    const currentDef = PLAN_TIERS[currentPlan]
    const targetDef = PLAN_TIERS[targetPlan]

    const unlockedFeatures = targetDef.features.filter((f) => !currentDef.features.includes(f))
    const reducedFeatures = currentDef.features.filter((f) => !targetDef.features.includes(f))

    return {
        currentPlan,
        targetPlan,
        billingCycle: targetBillingCycle,
        currency: catalog.currency,
        symbol: catalog.symbol,
        isUpgrade,
        isDowngrade,
        isSamePlan,
        totalCycleDays,
        daysUsed,
        daysRemaining,
        currentPlanCost: baseCurrentCost,
        unusedCredit,
        targetPlanGross,
        netPayableToday,
        effectiveDate,
        nextBillingDate: renewalDate.toISOString(),
        unlockedFeatures,
        reducedFeatures,
    }
}

// ---------------------------------------------------------------------------
// 4. Platform Subscription Invoicing & Receipt Slip
// ---------------------------------------------------------------------------

export function generateSaaSInvoiceNumber(): string {
    const year = new Date().getFullYear()
    const rand = Math.floor(1000 + Math.random() * 9000)
    return `SAAS-INV-${year}-${rand}`
}

export function compileSaaSSubscriptionInvoice(params: {
    tenantId: string
    tenantName: string
    plan: PlanTier
    billingCycle: BillingCycle
    currency?: string
    paymentMethod?: string
    transactionRef?: string
    /** Prices to use; defaults to the built-in catalog */
    pricing?: RegionalPricing
    /** Amount actually charged (e.g. a prorated upgrade); defaults to the plan price */
    amountPaid?: number
}): SaaSPlatformInvoice {
    const {
        tenantId,
        tenantName,
        plan,
        billingCycle,
        currency,
        paymentMethod = "Razorpay / Card",
        transactionRef,
        pricing,
        amountPaid,
    } = params

    const catalog = pricing ?? getRegionalPricing(currency)
    const grossAmount = amountPaid ?? (billingCycle === "ANNUAL" ? catalog.annual[plan] : catalog.monthly[plan])

    // Tax by the currency actually charged: only India (INR) pays GST
    const taxRate = PLAN_TAX_PERCENT[catalog.currency] ?? 0

    // Price is inclusive of tax
    const subtotal = Math.round((grossAmount / (1 + taxRate / 100)) * 100) / 100
    const taxAmount = Math.round((grossAmount - subtotal) * 100) / 100

    const now = new Date()
    const periodEnd = new Date(now)
    if (billingCycle === "ANNUAL") {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1)
    } else {
        periodEnd.setDate(periodEnd.getDate() + 30)
    }

    return {
        invoiceNumber: generateSaaSInvoiceNumber(),
        tenantId,
        tenantName,
        tier: plan,
        billingCycle,
        issueDate: now.toISOString(),
        periodStart: now.toISOString(),
        periodEnd: periodEnd.toISOString(),
        currency: catalog.currency,
        subtotal,
        taxPercent: taxRate,
        taxAmount,
        totalAmount: grossAmount,
        status: "PAID",
        paymentMethod,
        transactionRef: transactionRef || `TXN-${Date.now()}`,
    }
}

/**
 * Compiles a printable HTML subscription invoice slip with inline styles.
 */
/** Every value inserted into the receipt HTML: business names and payment references come from users. */
function esc(value: unknown): string {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
}

/** Printable invoice/receipt Genesoft gives a business for its plan (Settings → Billing, Super Admin). */
export function formatSaaSInvoiceReceiptHtml(invoice: SaaSPlatformInvoice): string {
    const planDef = PLAN_TIERS[invoice.tier]
    const money = (n: number) => esc(formatCurrency(Number(n) || 0, invoice.currency))
    const day = (d: string) => esc(new Date(d).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }))
    const cycle = invoice.billingCycle === "ANNUAL" ? "Yearly" : "Monthly"
    const paid = invoice.status === "PAID"
    const address = [PLATFORM.address.line1, PLATFORM.address.line2, PLATFORM.address.country].map(esc).join("<br>")

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Invoice ${esc(invoice.invoiceNumber)}</title>
<style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px; background: #F4F4F5; color: #1C1917; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 13px; line-height: 1.5; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .card { max-width: 720px; margin: 0 auto; background: #fff; border: 1px solid #E4E4E7; border-radius: 12px; overflow: hidden; }
    .top { background: #2B2A29; padding: 22px 32px; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
    .top img { display: block; width: 180px; height: auto; }
    .top .doc { color: #fff; text-align: right; }
    .top .doc .kind { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: #D6D3D1; }
    .top .doc .no { font-size: 18px; font-weight: 800; margin-top: 2px; }
    .body { padding: 28px 32px 32px; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: .05em; }
    .paid { background: #DCFCE7; color: #166534; }
    .pending { background: #FEF3C7; color: #92400E; }
    .parties { display: flex; justify-content: space-between; gap: 24px; margin: 20px 0 24px; }
    .label { font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: #6B6560; margin: 0 0 6px; font-weight: 700; }
    .muted { color: #6B6560; }
    .facts { display: flex; flex-wrap: wrap; gap: 0; border: 1px solid #E4E4E7; border-radius: 8px; margin-bottom: 24px; }
    .facts div { flex: 1 1 140px; padding: 10px 14px; border-right: 1px solid #E4E4E7; }
    .facts div:last-child { border-right: 0; }
    .facts b { display: block; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: #6B6560; padding: 10px 12px; background: #FAFAF9; border-bottom: 1px solid #E4E4E7; }
    td { padding: 12px; border-bottom: 1px solid #E4E4E7; vertical-align: top; }
    .r { text-align: right; }
    .totals { width: 300px; margin: 16px 0 0 auto; }
    .totals td { border: 0; padding: 5px 0; }
    .grand td { border-top: 2px solid #1C1917; padding-top: 10px; font-size: 16px; font-weight: 800; }
    .pay { margin-top: 24px; padding: 12px 16px; background: #FAFAF9; border: 1px solid #E4E4E7; border-radius: 8px; color: #44403C; }
    .foot { padding: 16px 32px; border-top: 1px solid #E7E5E4; font-size: 11px; color: #6B6560; text-align: center; }
    @media (max-width: 560px) { body { padding: 0; } .parties { flex-direction: column; } .totals { width: 100%; } .top { flex-direction: column; align-items: flex-start; } .top .doc { text-align: left; } }
    @media print { body { padding: 0; background: #fff; } .card { border: 0; border-radius: 0; } }
</style>
</head>
<body>
<div class="card">
    <div class="top">
        <img src="${esc(`${appUrl()}/email/genesoft-logo.png`)}" width="180" alt="${esc(PLATFORM.brandName)}">
        <div class="doc"><div class="kind">${paid ? "Invoice &amp; receipt" : "Invoice"}</div><div class="no">${esc(invoice.invoiceNumber)}</div></div>
    </div>
    <div class="body">
        <span class="badge ${paid ? "paid" : "pending"}">${paid ? "PAID" : "PAYMENT DUE"}</span>
        <div class="parties">
            <div>
                <p class="label">From</p>
                <strong>${esc(PLATFORM.legalName)}</strong><br>
                <span class="muted">${address}<br>${PLATFORM.gstin ? `GSTIN: ${esc(PLATFORM.gstin)}<br>` : ""}${esc(PLATFORM.email)}</span>
            </div>
            <div class="r">
                <p class="label">Billed to</p>
                <strong>${esc(invoice.tenantName)}</strong>
            </div>
        </div>
        <div class="facts">
            <div><span class="muted">Date</span><b>${day(invoice.issueDate)}</b></div>
            <div><span class="muted">Plan</span><b>${esc(planDef.name)}</b></div>
            <div><span class="muted">Billing</span><b>${cycle}</b></div>
            <div><span class="muted">Period</span><b>${day(invoice.periodStart)} – ${day(invoice.periodEnd)}</b></div>
        </div>
        <table>
            <thead><tr><th>Description</th><th class="r">Amount</th></tr></thead>
            <tbody>
                <tr>
                    <td><strong>${esc(PLATFORM.productName)} – ${esc(planDef.name)} plan</strong><div class="muted">${cycle} subscription, ${day(invoice.periodStart)} to ${day(invoice.periodEnd)}</div></td>
                    <td class="r"><strong>${money(invoice.subtotal)}</strong></td>
                </tr>
            </tbody>
        </table>
        <table class="totals">
            <tr><td class="muted">Subtotal</td><td class="r">${money(invoice.subtotal)}</td></tr>
            <tr><td class="muted">Tax (${esc(Number(invoice.taxPercent))}%)</td><td class="r">${money(invoice.taxAmount)}</td></tr>
            <tr class="grand"><td>${paid ? "Total paid" : "Total due"}</td><td class="r">${money(invoice.totalAmount)}</td></tr>
        </table>
        <div class="pay"><strong>Payment:</strong> ${esc(invoice.paymentMethod || "—")}${invoice.transactionRef ? ` &middot; <strong>Reference:</strong> ${esc(invoice.transactionRef)}` : ""}</div>
    </div>
    <div class="foot">Thank you for using ${esc(PLATFORM.productName)}. Questions about this invoice? Write to ${esc(PLATFORM.email)}.</div>
</div>
</body>
</html>
`
}
