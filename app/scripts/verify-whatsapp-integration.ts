/**
 * VERIFICATION SCRIPT: WhatsApp Business API Integration Suite
 * 
 * Validates:
 * 1. International E.164 phone normalization (India, US, UK, UAE, KSA, Australia)
 * 2. Statutory template registry and merge tag interpolation
 * 3. 1-Click WhatsApp direct deep-link generation
 * 4. Meta Cloud API Graph API v20.0 payload formatting
 * 5. Simulation gateway dispatch and wamid generation
 * 6. Webhook verification challenge handshake and payload parser
 */

import {
    normalizeE164Phone,
    generateWhatsAppDirectLink,
    interpolateWhatsAppTemplate,
    compileMetaCloudApiPayload,
    dispatchMetaCloudApiMessage,
    verifyMetaWebhookChallenge,
    parseMetaWebhookEvent,
    WHATSAPP_TEMPLATES,
    WhatsAppTemplateKey,
} from "../src/lib/whatsapp-engine"

function assert(condition: boolean, message: string) {
    if (!condition) {
        console.error(`❌ ASSERTION FAILED: ${message}`)
        process.exit(1)
    }
    console.log(`  ✓ ${message}`)
}

async function runTests() {
    console.log("================================================================================")
    console.log("🚀 TESTING: WhatsApp Business API Integration & Customer Communication Suite")
    console.log("================================================================================\n")

    // -------------------------------------------------------------------------
    // TEST 1: International E.164 Phone Normalization
    // -------------------------------------------------------------------------
    console.log("TEST 1: Verifying International E.164 Phone Normalization")

    const phoneTestCases = [
        { raw: "9876543210", defaultCountry: "91", expected: "919876543210", label: "India 10-digit standard" },
        { raw: "09876543210", defaultCountry: "91", expected: "919876543210", label: "India 11-digit leading 0" },
        { raw: "+91 98765 43210", defaultCountry: "91", expected: "919876543210", label: "India with spaces and plus" },
        { raw: "+1 (555) 234-5678", defaultCountry: "1", expected: "15552345678", label: "US international format" },
        { raw: "5552345678", defaultCountry: "1", expected: "15552345678", label: "US 10-digit without country code" },
        { raw: "+44 7911 123456", defaultCountry: "44", expected: "447911123456", label: "UK mobile format" },
        { raw: "07911 123456", defaultCountry: "44", expected: "447911123456", label: "UK domestic 07 format" },
        { raw: "+971 50 123 4567", defaultCountry: "971", expected: "971501234567", label: "UAE mobile format" },
        { raw: "050 123 4567", defaultCountry: "971", expected: "971501234567", label: "UAE domestic format" },
        { raw: "+966 50 123 4567", defaultCountry: "966", expected: "966501234567", label: "Saudi Arabia format" },
        { raw: "+61 412 345 678", defaultCountry: "61", expected: "61412345678", label: "Australia mobile format" },
    ]

    for (const tc of phoneTestCases) {
        const normalized = normalizeE164Phone(tc.raw, tc.defaultCountry)
        assert(normalized === tc.expected, `${tc.label}: "${tc.raw}" -> "${normalized}"`)
    }

    console.log("\n--------------------------------------------------------------------------------")
    // -------------------------------------------------------------------------
    // TEST 2: Template Registry & Merge Tag Interpolation
    // -------------------------------------------------------------------------
    console.log("TEST 2: Verifying Template Registry & Dynamic Merge Tags")

    const expectedKeys: WhatsAppTemplateKey[] = [
        "INVOICE_DISPATCH",
        "PAYMENT_RECEIPT_ALERT",
        "PAYMENT_OVERDUE_REMINDER",
        "ORDER_CONFIRMATION",
        "SUPPORT_TICKET_UPDATE",
        "CUSTOMER_WELCOME",
        "CUSTOM_MESSAGE",
    ]

    assert(Object.keys(WHATSAPP_TEMPLATES).length === 7, "All 7 statutory templates registered")

    for (const key of expectedKeys) {
        const t = WHATSAPP_TEMPLATES[key]
        assert(Boolean(t), `Template '${key}' is registered`)
        assert(Boolean(t.name), `Template '${key}' has name: "${t.name}"`)
        assert(Boolean(t.category), `Template '${key}' categorized under: "${t.category}"`)
        assert(Boolean(t.bodyTemplate), `Template '${key}' has message template content`)
        assert(t.variables.length > 0, `Template '${key}' defines merge variables: [${t.variables.join(", ")}]`)

        // Test sample interpolation
        const interpolated = interpolateWhatsAppTemplate(t.bodyTemplate, t.sampleVariables)
        assert(!interpolated.includes("{{"), `Template '${key}' sample interpolation resolved all variables`)
        assert(interpolated.length > 20, `Template '${key}' produces rich message content`)
    }

    // Specific invoice dispatch verification
    const invoiceMsg = interpolateWhatsAppTemplate(WHATSAPP_TEMPLATES.INVOICE_DISPATCH.bodyTemplate, {
        customer_name: "Apex Logistics Ltd",
        invoice_number: "INV-2026-8801",
        amount: "₹34,500.00",
        company_name: "Genesoft Technologies",
        due_date: "25 Sep 2026",
        payment_link: "https://erp.genesoft.ai/portal/inv_8801",
    })
    assert(invoiceMsg.includes("Apex Logistics Ltd"), "Invoice message includes customer name")
    assert(invoiceMsg.includes("INV-2026-8801"), "Invoice message includes invoice number")
    assert(invoiceMsg.includes("₹34,500.00"), "Invoice message includes formatted amount")
    assert(invoiceMsg.includes("https://erp.genesoft.ai/portal/inv_8801"), "Invoice message includes payment link")

    console.log("\n--------------------------------------------------------------------------------")
    // -------------------------------------------------------------------------
    // TEST 3: WhatsApp Direct Web / App Deep-Link Generation
    // -------------------------------------------------------------------------
    console.log("TEST 3: Verifying WhatsApp Direct Link (wa.me) Generator")

    const sampleText = "Hello John, invoice INV-100 for ₹5,000 is ready.\nPay here: https://pay.me"
    const directLink = generateWhatsAppDirectLink("+91 98765-43210", sampleText, "91")

    assert(directLink.startsWith("https://wa.me/919876543210?text="), "Link targets clean E.164 phone: 919876543210")
    assert(directLink.includes(encodeURIComponent("Hello John")), "Link contains percent-encoded message text")
    assert(directLink.includes(encodeURIComponent("₹5,000")), "Link contains percent-encoded currency symbol")

    console.log("\n--------------------------------------------------------------------------------")
    // -------------------------------------------------------------------------
    // TEST 4: Meta Cloud API Payload Compiler
    // -------------------------------------------------------------------------
    console.log("TEST 4: Verifying Meta Cloud API Graph API v20.0 Payload Compiler")

    const payload = compileMetaCloudApiPayload({
        recipientPhone: "+44 7911 123456",
        messageText: "Your subscription renewal has been confirmed.",
        defaultCountry: "44",
        previewUrl: true,
    })

    assert(payload.messaging_product === "whatsapp", "Payload messaging_product is 'whatsapp'")
    assert(payload.recipient_type === "individual", "Payload recipient_type is 'individual'")
    assert(payload.to === "447911123456", "Payload recipient matches E.164 digits: 447911123456")
    assert(payload.type === "text", "Payload type is 'text'")
    assert(payload.text.body === "Your subscription renewal has been confirmed.", "Payload text body preserved accurately")
    assert(payload.text.preview_url === true, "Payload preview_url enabled")

    console.log("\n--------------------------------------------------------------------------------")
    // -------------------------------------------------------------------------
    // TEST 5: Dispatch Engine in Simulation & Direct Modes
    // -------------------------------------------------------------------------
    console.log("TEST 5: Verifying Dispatch Engine Fallbacks & Simulation")

    // Simulation Mode
    const simResult = await dispatchMetaCloudApiMessage({
        config: { mode: "SIMULATION", defaultCountryCode: "91" },
        recipientPhone: "9876543210",
        messageText: "Testing simulation dispatch",
    })

    assert(simResult.success === true, "Simulation dispatch returns success: true")
    assert(simResult.simulated === true, "Marked as simulated: true")
    assert(simResult.status === "DELIVERED", "Simulation status returns DELIVERED")
    assert(Boolean(simResult.wamid && simResult.wamid.startsWith("wamid.sim_")), `Simulation generates valid wamid: ${simResult.wamid}`)
    assert(Boolean(simResult.directLink), "Simulation includes fallback direct link")

    // Direct Link Mode
    const directResult = await dispatchMetaCloudApiMessage({
        config: { mode: "DIRECT_LINK", defaultCountryCode: "91" },
        recipientPhone: "9876543210",
        messageText: "Direct link test",
    })
    assert(directResult.success === true, "Direct link mode returns success: true")
    assert(directResult.status === "SENT", "Direct link mode returns SENT status")

    console.log("\n--------------------------------------------------------------------------------")
    // -------------------------------------------------------------------------
    // TEST 6: Meta Webhook Challenge Handshake & Event Parser
    // -------------------------------------------------------------------------
    console.log("TEST 6: Verifying Meta Webhook Challenge & Event Ingestion")

    // Challenge handshake
    const validHandshake = verifyMetaWebhookChallenge({
        mode: "subscribe",
        token: "my_secret_token",
        challenge: "1158201207",
        expectedToken: "my_secret_token",
    })
    assert(validHandshake.verified === true, "Valid webhook challenge verified successfully")
    assert(validHandshake.challenge === "1158201207", "Returns Meta challenge integer string")

    const invalidHandshake = verifyMetaWebhookChallenge({
        mode: "subscribe",
        token: "wrong_token",
        challenge: "1158201207",
        expectedToken: "my_secret_token",
    })
    assert(invalidHandshake.verified === false, "Invalid webhook token rejected (verified: false)")

    // Event parsing: delivery receipts and inbound messages
    const mockWebhookBody = {
        object: "whatsapp_business_account",
        entry: [
            {
                id: "WABA_ID_123",
                changes: [
                    {
                        value: {
                            messaging_product: "whatsapp",
                            metadata: { display_phone_number: "919876543210", phone_number_id: "PHONE_ID_1" },
                            statuses: [
                                {
                                    id: "wamid.HBgLMTE1",
                                    status: "delivered",
                                    timestamp: "1726160000",
                                    recipient_id: "919876543210",
                                },
                            ],
                            contacts: [
                                { profile: { name: "Alice Cooper" }, wa_id: "919876543210" },
                            ],
                            messages: [
                                {
                                    from: "919876543210",
                                    id: "wamid.HBgLMTE2",
                                    timestamp: "1726160005",
                                    type: "text",
                                    text: { body: "Thank you, payment has been made via UPI!" },
                                },
                            ],
                        },
                        field: "messages",
                    },
                ],
            },
        ],
    }

    const parsed = parseMetaWebhookEvent(mockWebhookBody)
    assert(parsed.statuses.length === 1, "Parsed exactly 1 delivery status receipt")
    assert(parsed.statuses[0].wamid === "wamid.HBgLMTE1", "Parsed status wamid matches")
    assert(parsed.statuses[0].status === "delivered", "Parsed status matches 'delivered'")

    assert(parsed.messages.length === 1, "Parsed exactly 1 inbound customer message")
    assert(parsed.messages[0].from === "919876543210", "Parsed inbound sender phone")
    assert(parsed.messages[0].name === "Alice Cooper", "Parsed sender name from contact profile")
    assert(parsed.messages[0].text === "Thank you, payment has been made via UPI!", "Parsed inbound text body accurately")

    console.log("\n================================================================================")
    console.log("🎉 ALL 6 VERIFICATION SUITES PASSED FLAWLESSLY (100% SUCCESS)!")
    console.log("================================================================================")
}

runTests().catch(err => {
    console.error("FATAL ERROR in verification:", err)
    process.exit(1)
})
