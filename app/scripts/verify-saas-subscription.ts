/**
 * VERIFICATION SCRIPT: SaaS Subscription, Proration & Platform Invoicing Engine
 * 
 * Validates:
 * 1. Plan tier definitions, currencies, and features matrix
 * 2. Proration mathematics: upgrades, downgrades, cycle fractions, and net due
 * 3. 20% annual discount calculations
 * 4. Multi-region platform invoice compilation (tax rates: IN, GB, AE, SA, AU, US)
 * 5. Printable HTML slip rendering
 */

import {
    PLAN_TIERS,
    PlanTier,
    BillingCycle,
    calculateSubscriptionProration,
    compileSaaSSubscriptionInvoice,
    formatSaaSInvoiceReceiptHtml,
    getPlanPrice,
} from "../src/lib/saas-subscription-engine"

function assert(condition: boolean, message: string) {
    if (!condition) {
        console.error(`❌ ASSERTION FAILED: ${message}`)
        process.exit(1)
    }
    console.log(`  ✓ ${message}`)
}

async function runTests() {
    console.log("================================================================================")
    console.log("🚀 TESTING: SaaS Subscription, Proration & Platform Invoicing Engine")
    console.log("================================================================================\n")

    // -------------------------------------------------------------------------
    // TEST 1: Tier Registry & Pricing Integrity
    // -------------------------------------------------------------------------
    console.log("TEST 1: Verifying Tier Registry & Regional Pricing Matrix")
    const tiers: PlanTier[] = ["FREE", "BASIC", "PRO", "ENTERPRISE"]
    const currencies = ["INR", "USD", "GBP", "AED", "SAR", "AUD"]

    for (const tier of tiers) {
        const config = PLAN_TIERS[tier]
        assert(Boolean(config), `Tier '${tier}' is defined`)
        assert(Boolean(config.name), `Tier '${tier}' has display name: ${config.name}`)
        assert(config.features && config.features.length >= 4, `Tier '${tier}' has at least 4 feature highlights`)
        assert(Boolean(config.limits), `Tier '${tier}' has resource limits configured`)

        for (const curr of currencies) {
            const monthlyPrice = getPlanPrice(tier, "MONTHLY", curr)
            const annualPrice = getPlanPrice(tier, "ANNUAL", curr)
            assert(monthlyPrice !== undefined, `Tier '${tier}' has monthly price for ${curr} (${monthlyPrice})`)
            assert(annualPrice !== undefined, `Tier '${tier}' has annual price for ${curr} (${annualPrice})`)

            if (tier !== "FREE") {
                assert(monthlyPrice > 0, `Paid tier '${tier}' has monthly price > 0 in ${curr}`)
                assert(annualPrice > 0, `Paid tier '${tier}' has annual price > 0 in ${curr}`)
                // Verify 20% discount: annual = 12 * monthly * 0.80
                const expectedAnnual = Math.round(monthlyPrice * 12 * 0.8)
                assert(
                    annualPrice === expectedAnnual,
                    `Tier '${tier}' ${curr} annual price (${annualPrice}) reflects 20% discount vs monthly 12x (${expectedAnnual})`
                )
            } else {
                assert(monthlyPrice === 0 && annualPrice === 0, `FREE tier is 0 in ${curr}`)
            }
        }
    }

    console.log("\n--------------------------------------------------------------------------------")
    // -------------------------------------------------------------------------
    // TEST 2: Mid-Cycle Upgrade Proration Math
    // -------------------------------------------------------------------------
    console.log("TEST 2: Mid-Cycle Upgrade Proration Calculation")

    // Scenario: Tenant on BASIC (USD $29/mo), 30-day month, exactly 15 days used (15 days remaining)
    // Upgrades to PRO (USD $79/mo)
    const now = new Date()
    const cycleStart = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000)
    const cycleEnd = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)

    const upgradeProration = calculateSubscriptionProration({
        currentPlan: "BASIC",
        currentBillingCycle: "MONTHLY",
        targetPlan: "PRO",
        targetBillingCycle: "MONTHLY",
        currencyCode: "USD",
        cycleStartDate: cycleStart,
        cycleEndDate: cycleEnd,
    })

    assert(upgradeProration.isUpgrade === true, "Identified as an upgrade")
    assert(upgradeProration.isDowngrade === false, "Not identified as a downgrade")
    assert(upgradeProration.totalCycleDays === 30, `Total cycle days calculated as 30 (got ${upgradeProration.totalCycleDays})`)
    assert(upgradeProration.daysRemaining === 15, `Remaining days calculated as 15 (got ${upgradeProration.daysRemaining})`)
    assert(upgradeProration.targetPlanGross === 49, `Target plan gross fee is $49 (got ${upgradeProration.targetPlanGross})`)
    
    // Unused credit = (19 / 30) * 15 = 9.50
    assert(upgradeProration.unusedCredit === 9.5, `Unused credit calculated as $9.50 (got ${upgradeProration.unusedCredit})`)
    // Net payable today = 49 - 9.50 = 39.50
    assert(upgradeProration.netPayableToday === 39.5, `Net payable today is $39.50 (got ${upgradeProration.netPayableToday})`)
    assert(new Date(upgradeProration.nextBillingDate) > now, "New renewal date set properly")

    console.log("\n--------------------------------------------------------------------------------")
    // -------------------------------------------------------------------------
    // TEST 3: Downgrade Scheduling & Proration Math
    // -------------------------------------------------------------------------
    console.log("TEST 3: Mid-Cycle Downgrade Proration Calculation")

    // Scenario: Tenant on PRO (USD $49/mo), 10 days remaining in cycle, downgrading to BASIC ($19/mo)
    const downgradeProration = calculateSubscriptionProration({
        currentPlan: "PRO",
        currentBillingCycle: "MONTHLY",
        targetPlan: "BASIC",
        targetBillingCycle: "MONTHLY",
        currencyCode: "USD",
        cycleStartDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
        cycleEndDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
    })

    assert(downgradeProration.isUpgrade === false, "Downgrade is not an upgrade")
    assert(downgradeProration.isDowngrade === true, "Identified as a downgrade")
    assert(
        new Date(downgradeProration.effectiveDate).getTime() === new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).getTime(),
        "Scheduled downgrade activates at current period end"
    )
    assert(downgradeProration.daysRemaining === 10, "Remaining days is 10")
    assert(downgradeProration.targetPlanGross === 19, "Target plan gross is $19")

    console.log("\n--------------------------------------------------------------------------------")
    // -------------------------------------------------------------------------
    // TEST 4: Multi-Region Platform Invoicing Compilation & Tax Compliance
    // -------------------------------------------------------------------------
    console.log("TEST 4: Multi-Region Platform Invoicing & Tax Math")

    const taxTestCases = [
        { country: "IN", currency: "INR", plan: "PRO" as PlanTier, cycle: "MONTHLY" as BillingCycle, expectedTaxRate: 18 },
        { country: "GB", currency: "GBP", plan: "PRO" as PlanTier, cycle: "MONTHLY" as BillingCycle, expectedTaxRate: 20 },
        { country: "AE", currency: "AED", plan: "ENTERPRISE" as PlanTier, cycle: "ANNUAL" as BillingCycle, expectedTaxRate: 5 },
        { country: "SA", currency: "SAR", plan: "BASIC" as PlanTier, cycle: "MONTHLY" as BillingCycle, expectedTaxRate: 15 },
        { country: "AU", currency: "AUD", plan: "PRO" as PlanTier, cycle: "MONTHLY" as BillingCycle, expectedTaxRate: 10 },
        { country: "US", currency: "USD", plan: "PRO" as PlanTier, cycle: "MONTHLY" as BillingCycle, expectedTaxRate: 0 },
    ]

    for (const tc of taxTestCases) {
        const inv = compileSaaSSubscriptionInvoice({
            tenantId: "tenant_test_123",
            tenantName: "Acme Global Corp",
            plan: tc.plan,
            billingCycle: tc.cycle,
            currency: tc.currency,
        })

        assert(/^SAAS-INV-\d{4}-\d{4}$/.test(inv.invoiceNumber), `Invoice number formatted correctly: ${inv.invoiceNumber}`)
        assert(inv.taxPercent === tc.expectedTaxRate, `Tax rate for ${tc.currency} is ${tc.expectedTaxRate}% (got ${inv.taxPercent}%)`)
        
        const expectedTotal = getPlanPrice(tc.plan, tc.cycle, tc.currency)
        assert(inv.totalAmount === expectedTotal, `Total matches plan price (${inv.totalAmount} ${tc.currency})`)

        const calculatedSum = Math.round((inv.subtotal + inv.taxAmount) * 100) / 100
        assert(calculatedSum === inv.totalAmount, `Subtotal (${inv.subtotal}) + Tax (${inv.taxAmount}) equals Total (${inv.totalAmount})`)
        assert(inv.status === "PAID", "Invoice status marked as PAID")
    }

    console.log("\n--------------------------------------------------------------------------------")
    // -------------------------------------------------------------------------
    // TEST 5: Printable HTML Receipt Compilation
    // -------------------------------------------------------------------------
    console.log("TEST 5: Verifying HTML Receipt Slip Generation")

    const sampleInvoice = compileSaaSSubscriptionInvoice({
        tenantId: "tenant_test_456",
        tenantName: "Apex Cloud Innovations Ltd",
        currency: "GBP",
        plan: "PRO",
        billingCycle: "ANNUAL",
    })

    const htmlSlip = formatSaaSInvoiceReceiptHtml(sampleInvoice)
    assert(typeof htmlSlip === "string" && htmlSlip.length > 500, "HTML slip rendered as complete document")
    assert(htmlSlip.includes(sampleInvoice.invoiceNumber), "HTML slip contains invoice number")
    assert(htmlSlip.includes("Apex Cloud Innovations Ltd"), "HTML slip contains tenant name")
    assert(htmlSlip.includes(`Tax (${sampleInvoice.taxPercent}%):`), "HTML slip displays regional Tax line")
    assert(htmlSlip.includes(sampleInvoice.totalAmount.toFixed(2)), "HTML slip displays total payable")
    assert(htmlSlip.includes("PAID RECEIPT"), "HTML slip displays PAID RECEIPT badge")
    assert(htmlSlip.includes("Genesoft Cloud ERP"), "HTML slip includes ERP branding")

    console.log("\n================================================================================")
    console.log("🎉 ALL 5 VERIFICATION SUITES PASSED FLAWLESSLY (100% SUCCESS)!")
    console.log("================================================================================")
}

runTests().catch(err => {
    console.error("FATAL ERROR in verification:", err)
    process.exit(1)
})
