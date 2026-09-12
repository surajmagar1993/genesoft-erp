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
        description: "Explore core CRM and invoicing tools with no credit card required.",
        features: [
            "Up to 25 Customer Contacts",
            "Up to 15 Invoices / month",
            "Single User Access",
            "Standard Invoicing & Quotations",
            "Basic Financial Ledger",
            "Community Support",
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
        description: "Power your operations with unlimited contacts, multi-currency, and inventory tracking.",
        features: [
            "Unlimited Contacts & Leads",
            "Unlimited Invoices & Quotes",
            "Up to 5 Team Members",
            "2 Dedicated Warehouses",
            "India GST Engine & E-Way Bills",
            "Customer Self-Service Portal",
            "Email & Ticket Support (24h SLA)",
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
        tagline: "Comprehensive multi-national ERP with full tax suites",
        description: "Complete ERP operations including multi-jurisdiction statutory compliance and double-entry accounting.",
        features: [
            "Everything in Growth Basic",
            "Up to 20 Team Members",
            "Up to 10 Warehouses & Stock Transfers",
            "All International Tax Studios (UAE VAT, KSA ZATCA, AU BAS, UK MTD)",
            "Bank Reconciliation & Auto-Matching",
            "HR & Attendance Tracking",
            "Agile Delivery & Projects Kanban",
            "Priority Support (4h SLA)",
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
        tagline: "Dedicated platform governance and high-volume throughput",
        description: "Unlimited organization scaling, custom system integrations, and dedicated account management.",
        features: [
            "Everything in Professional Suite",
            "Unlimited Team Members & Employees",
            "Unlimited Depots & Warehouses",
            "Custom System Email Templates Studio",
            "POS Full Terminal & Hardware Scanning",
            "Rental Leasing & Asset Tracking",
            "Custom Workflow Webhooks & API Keys",
            "Dedicated Account Manager (1h SLA)",
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
        symbol: "A$",
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
 * Normalizes input currency code to available catalog keys, defaulting to INR.
 */
export function getRegionalPricing(currencyCode?: string | null): RegionalPricing {
    const code = (currencyCode || "INR").toUpperCase()
    return REGIONAL_PRICING_CATALOG[code] || REGIONAL_PRICING_CATALOG.INR
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
    } = params

    const catalog = getRegionalPricing(currencyCode)
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
    const start = cycleStartDate ? new Date(cycleStartDate) : new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
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
}): SaaSPlatformInvoice {
    const {
        tenantId,
        tenantName,
        plan,
        billingCycle,
        currency = "INR",
        paymentMethod = "Razorpay / Card",
        transactionRef,
    } = params

    const catalog = getRegionalPricing(currency)
    const grossAmount = billingCycle === "ANNUAL" ? catalog.annual[plan] : catalog.monthly[plan]

    // Regional tax split: e.g. 18% GST for India, 20% VAT for UK, 5% UAE, 15% KSA
    let taxRate = 18.0
    if (currency === "GBP") taxRate = 20.0
    if (currency === "AED") taxRate = 5.0
    if (currency === "SAR") taxRate = 15.0
    if (currency === "AUD") taxRate = 10.0
    if (currency === "USD") taxRate = 0.0

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
export function formatSaaSInvoiceReceiptHtml(invoice: SaaSPlatformInvoice): string {
    const catalog = getRegionalPricing(invoice.currency)
    const planDef = PLAN_TIERS[invoice.tier]

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Subscription Tax Invoice - ${invoice.invoiceNumber}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; color: #0f172a; background: #fff; }
        .invoice-card { max-width: 680px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
        .brand h1 { margin: 0; font-size: 22px; color: #1e293b; }
        .brand p { margin: 4px 0 0 0; color: #64748b; font-size: 12px; }
        .badge { background: #dcfce7; color: #15803d; padding: 4px 12px; border-radius: 9999px; font-weight: 700; font-size: 12px; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0; font-size: 13px; }
        .meta-box h3 { margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; }
        table { width: 100%; border-collapse: collapse; margin: 24px 0; }
        th { text-align: left; padding: 10px 12px; background: #f8fafc; font-size: 12px; text-transform: uppercase; color: #475569; border-bottom: 1px solid #e2e8f0; }
        td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
        .totals-table { width: 280px; margin-left: auto; margin-top: 12px; }
        .totals-table td { padding: 6px 0; border: none; font-size: 13px; }
        .grand-total { font-size: 16px; font-weight: 800; color: #1e40af; border-top: 2px solid #e2e8f0; padding-top: 8px !important; }
        .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
        @media print { body { padding: 0; } .invoice-card { border: none; box-shadow: none; padding: 0; } }
    </style>
</head>
<body>
    <div class="invoice-card">
        <div class="header">
            <div class="brand">
                <h1>Genesoft Cloud ERP</h1>
                <p>Genesoft Technologies Private Limited &bull; Platform Subscriptions</p>
                <p>GSTIN/Tax ID: 29AABCU9603R1ZM &bull; billing@genesoft.ai</p>
            </div>
            <div style="text-align: right;">
                <span class="badge">PAID RECEIPT</span>
                <div style="font-size: 16px; font-weight: 800; margin-top: 8px;">${invoice.invoiceNumber}</div>
                <div style="font-size: 12px; color: #64748b;">${new Date(invoice.issueDate).toLocaleDateString("en-IN", { dateStyle: "medium" })}</div>
            </div>
        </div>

        <div class="meta-grid">
            <div class="meta-box">
                <h3>Billed To (Tenant Account)</h3>
                <strong>${invoice.tenantName}</strong>
                <p style="margin: 2px 0 0 0; color: #64748b;">Tenant UUID: ${invoice.tenantId}</p>
            </div>
            <div class="meta-box" style="text-align: right;">
                <h3>Subscription Coverage</h3>
                <strong>${planDef.name} (${invoice.billingCycle})</strong>
                <p style="margin: 2px 0 0 0; color: #64748b;">
                    ${new Date(invoice.periodStart).toLocaleDateString()} to ${new Date(invoice.periodEnd).toLocaleDateString()}
                </p>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Cycle</th>
                    <th style="text-align: right;">Amount (${invoice.currency})</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        <strong>${planDef.name} Plan License</strong>
                        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${planDef.tagline}</div>
                    </td>
                    <td>${invoice.billingCycle}</td>
                    <td style="text-align: right; font-weight: 600;">${catalog.symbol}${invoice.subtotal.toFixed(2)}</td>
                </tr>
            </tbody>
        </table>

        <table class="totals-table">
            <tr>
                <td style="color: #64748b;">Taxable Subtotal:</td>
                <td style="text-align: right; font-weight: 600;">${catalog.symbol}${invoice.subtotal.toFixed(2)}</td>
            </tr>
            <tr>
                <td style="color: #64748b;">Tax (${invoice.taxPercent}%):</td>
                <td style="text-align: right; font-weight: 600;">${catalog.symbol}${invoice.taxAmount.toFixed(2)}</td>
            </tr>
            <tr>
                <td class="grand-total">Total Paid:</td>
                <td class="grand-total" style="text-align: right;">${catalog.symbol}${invoice.totalAmount.toFixed(2)}</td>
            </tr>
        </table>

        <div style="margin-top: 24px; padding: 12px 16px; background: #f8fafc; border-radius: 8px; font-size: 12px; color: #475569;">
            <strong>Payment Method:</strong> ${invoice.paymentMethod} &bull; <strong>Reference:</strong> ${invoice.transactionRef || "N/A"}
        </div>

        <div class="footer">
            Thank you for building your organization with Genesoft ERP. For billing inquiries, contact billing@genesoft.ai.
        </div>
    </div>
</body>
</html>
`
}
