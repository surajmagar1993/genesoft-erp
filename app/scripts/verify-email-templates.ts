/**
 * VERIFICATION SCRIPT: Admin System Email Templates Engine
 * 
 * Validates template registry, merge tag interpolation,
 * responsive HTML wrapper compilation, and test delivery simulation.
 */

import {
    SYSTEM_EMAIL_TEMPLATES,
    SystemTemplateKey,
    interpolateMergeTags,
    compileSystemEmail,
    wrapEmailHtml,
} from "../src/lib/email-template-engine"

function assert(condition: boolean, message: string) {
    if (!condition) {
        console.error(`❌ ASSERTION FAILED: ${message}`)
        process.exit(1)
    }
    console.log(`  ✓ ${message}`)
}

async function runTests() {
    console.log("================================================================================")
    console.log("🚀 TESTING: System Transactional Email Template Engine")
    console.log("================================================================================\n")

    // -------------------------------------------------------------------------
    // TEST 1: System Template Registry Integrity
    // -------------------------------------------------------------------------
    console.log("TEST 1: Verifying System Template Registry")
    const expectedKeys: SystemTemplateKey[] = [
        "INVOICE_SENT",
        "PAYMENT_RECEIPT",
        "WELCOME_ONBOARDING",
        "PAYMENT_OVERDUE_ALERT",
        "SUPPORT_TICKET_UPDATE",
        "CREDIT_NOTE_ISSUED",
    ]

    const registryKeys = Object.keys(SYSTEM_EMAIL_TEMPLATES) as SystemTemplateKey[]
    assert(registryKeys.length === 6, `Registry has exactly 6 system templates (found ${registryKeys.length})`)

    for (const key of expectedKeys) {
        const t = SYSTEM_EMAIL_TEMPLATES[key]
        assert(Boolean(t), `Template '${key}' is registered`)
        assert(Boolean(t.name && t.name.length > 0), `Template '${key}' has name: "${t?.name}"`)
        assert(Boolean(t.subject && t.subject.includes("{{")), `Template '${key}' subject contains dynamic merge tags`)
        assert(Boolean(t.bodyHtml && t.bodyHtml.length > 50), `Template '${key}' has rich HTML body`)
        assert(Boolean(t.bodyText && t.bodyText.length > 20), `Template '${key}' has fallback plain text body`)
        assert(t.mergeTags && t.mergeTags.length >= 5, `Template '${key}' has comprehensive merge tags library (${t?.mergeTags?.length} tags)`)
        assert(Boolean(t.mockVariables && Object.keys(t.mockVariables).length > 0), `Template '${key}' provides realistic mock variables for preview`)
    }

    console.log("\n--------------------------------------------------------------------------------")
    // -------------------------------------------------------------------------
    // TEST 2: Merge Tag Interpolation
    // -------------------------------------------------------------------------
    console.log("TEST 2: Verifying interpolateMergeTags Engine")
    const testString = "Hello {{customer_name}}, your invoice {{invoice_number}} of {{currency}} {{grand_total}} is ready."
    const testVars = {
        customer_name: "Bruce Wayne",
        invoice_number: "INV-2026-9999",
        currency: "USD",
        grand_total: "15,000.00",
    }
    const interpolated = interpolateMergeTags(testString, testVars)
    assert(
        interpolated === "Hello Bruce Wayne, your invoice INV-2026-9999 of USD 15,000.00 is ready.",
        "Exact merge tag replacement matches expected sentence"
    )

    // Unmatched tags should remain intact without crashing
    const partialString = "Invoice {{invoice_number}} for {{unknown_tag}}"
    const partialResult = interpolateMergeTags(partialString, { invoice_number: "INV-101" })
    assert(partialResult === "Invoice INV-101 for {{unknown_tag}}", "Preserves unsupplied token safely")

    console.log("\n--------------------------------------------------------------------------------")
    // -------------------------------------------------------------------------
    // TEST 3: Compilation and HTML Wrapper Formatting
    // -------------------------------------------------------------------------
    console.log("TEST 3: Compiling All 6 System Templates with Mock Data")
    for (const key of expectedKeys) {
        const compiled = compileSystemEmail({ templateKey: key })

        assert(Boolean(compiled.subject && !compiled.subject.includes("{{")), `[${key}] Subject fully interpolated: "${compiled.subject}"`)
        assert(compiled.html.includes("<!DOCTYPE html>"), `[${key}] Compiled HTML includes DOCTYPE standard`)
        assert(compiled.html.includes("<meta charset=\"utf-8\">"), `[${key}] Compiled HTML includes UTF-8 charset`)
        assert(compiled.html.includes("max-width: 600px;"), `[${key}] Compiled HTML has responsive 600px table container`)
        assert(Boolean(compiled.text && !compiled.text.includes("{{customer_name}}")), `[${key}] Plain text version is cleanly interpolated`)
    }

    console.log("\n--------------------------------------------------------------------------------")
    // -------------------------------------------------------------------------
    // TEST 4: Custom Overrides Compilation
    // -------------------------------------------------------------------------
    console.log("TEST 4: Verifying Custom Overrides Compilation")
    const customCompiled = compileSystemEmail({
        templateKey: "INVOICE_SENT",
        customSubject: "CUSTOM: Invoice {{invoice_number}} Urgent from {{company_name}}",
        customBodyHtml: "<p>Customized message for {{customer_name}}: please pay {{grand_total}}.</p>",
        variables: {
            customer_name: "Clark Kent",
            company_name: "Daily Planet Media",
            invoice_number: "INV-CUSTOM-001",
            grand_total: "9,999.00",
        },
    })

    assert(customCompiled.subject === "CUSTOM: Invoice INV-CUSTOM-001 Urgent from Daily Planet Media", "Custom subject correctly compiled")
    assert(customCompiled.html.includes("Customized message for Clark Kent: please pay 9,999.00."), "Custom body HTML correctly compiled inside wrapper")

    console.log("\n--------------------------------------------------------------------------------")
    // -------------------------------------------------------------------------
    // TEST 5: Responsive Boilerplate Action Button
    // -------------------------------------------------------------------------
    console.log("TEST 5: Action Button Generator in Email Wrapper")
    const buttonHtml = wrapEmailHtml({
        title: "Test Notification",
        bodyContent: "<p>Hello World</p>",
        actionButton: {
            label: "Review Documents Now",
            url: "https://erp.genesoft.ai/portal/docs",
        },
    })

    assert(buttonHtml.includes("Review Documents Now"), "Action button label rendered")
    assert(buttonHtml.includes("https://erp.genesoft.ai/portal/docs"), "Action button target link injected")
    assert(buttonHtml.includes("background: linear-gradient"), "Action button styled with modern gradient")

    console.log("\n--------------------------------------------------------------------------------")
    // -------------------------------------------------------------------------
    // TEST 6: Super Admin Server Action Integration
    // -------------------------------------------------------------------------
    console.log("TEST 6: Testing Server Action: getSystemEmailTemplates & sendTestSystemEmail")
    const { getSystemEmailTemplates, sendTestSystemEmail } = await import("../src/app/actions/admin/email-templates")

    const overview = await getSystemEmailTemplates()
    assert(overview.templates.length === 6, `Server action returned 6 templates (found ${overview.templates.length})`)
    assert(overview.gatewayStatus.fromDomain.length > 0, `Gateway domain detected: ${overview.gatewayStatus.fromDomain}`)
    assert(overview.metrics.totalTemplates === 6, "Metrics report exactly 6 total templates")

    const testSendResult = await sendTestSystemEmail({
        templateKey: "WELCOME_ONBOARDING",
        recipientEmail: "test-admin@genesoft.ai",
    })
    assert(testSendResult.success === true, "sendTestSystemEmail returned success = true")
    assert(Boolean(testSendResult.message), `Test dispatch message received: "${testSendResult.message}"`)

    console.log("\n================================================================================")
    console.log("🎉 ALL EMAIL TEMPLATE ENGINE & SERVER ACTION TESTS PASSED (100% SUCCESS)")
    console.log("================================================================================")
}

runTests().catch((err) => {
    console.error("Test execution failed:", err)
    process.exit(1)
})
