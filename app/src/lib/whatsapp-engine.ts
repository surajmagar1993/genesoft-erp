/**
 * WHATSAPP BUSINESS API ENGINE
 * 
 * Supports:
 * - Meta Graph API (v20.0) Cloud API messaging
 * - 1-Click WhatsApp Web / App deep-links (`wa.me`)
 * - International E.164 phone normalization
 * - Statutory message templates (Invoices, Receipts, Dunning, Orders, Tickets, Welcome)
 * - Dynamic merge tag interpolation
 * - Meta Webhook verification handshake and payload parsing
 */

export type WhatsAppMode = "CLOUD_API" | "DIRECT_LINK" | "SIMULATION"

export interface WhatsAppConfig {
    phoneNumberId?: string
    wabaId?: string // WhatsApp Business Account ID
    accessToken?: string
    verifyToken?: string // Webhook verify token
    defaultCountryCode?: string // Default country code e.g. "91", "1", "44", "971", "966", "61"
    mode: WhatsAppMode
    senderDisplayName?: string
}

export type WhatsAppTemplateKey =
    | "INVOICE_DISPATCH"
    | "PAYMENT_RECEIPT_ALERT"
    | "PAYMENT_OVERDUE_REMINDER"
    | "ORDER_CONFIRMATION"
    | "SUPPORT_TICKET_UPDATE"
    | "CUSTOMER_WELCOME"
    | "CUSTOM_MESSAGE"

export interface WhatsAppTemplate {
    key: WhatsAppTemplateKey
    name: string
    category: "BILLING" | "SALES" | "SUPPORT" | "MARKETING"
    description: string
    bodyTemplate: string
    variables: string[]
    sampleVariables: Record<string, string>
}

export interface WhatsAppMessage {
    id: string
    contactId?: string
    contactName?: string
    recipientPhone: string
    direction: "OUTBOUND" | "INBOUND"
    templateKey?: WhatsAppTemplateKey
    content: string
    status: "QUEUED" | "SENT" | "DELIVERED" | "READ" | "FAILED"
    timestamp: string
    errorMessage?: string
    wamid?: string
    directLink?: string
}

export const WHATSAPP_TEMPLATES: Record<WhatsAppTemplateKey, WhatsAppTemplate> = {
    INVOICE_DISPATCH: {
        key: "INVOICE_DISPATCH",
        name: "Tax Invoice / Bill Dispatch",
        category: "BILLING",
        description: "Official tax invoice dispatch with amount due, payment portal URL, and statutory due date.",
        bodyTemplate: "Hello {{customer_name}}, your invoice {{invoice_number}} for {{amount}} from {{company_name}} is ready. Due Date: {{due_date}}. View and pay online: {{payment_link}}. Thank you for your business!",
        variables: ["customer_name", "invoice_number", "amount", "company_name", "due_date", "payment_link"],
        sampleVariables: {
            customer_name: "John Doe",
            invoice_number: "INV-2026-0042",
            amount: "₹18,500.00",
            company_name: "Genesoft ERP Corp",
            due_date: "15 Oct 2026",
            payment_link: "https://erp.genesoft.ai/portal/pay/inv_42",
        },
    },
    PAYMENT_RECEIPT_ALERT: {
        key: "PAYMENT_RECEIPT_ALERT",
        name: "Payment Receipt Acknowledgment",
        category: "BILLING",
        description: "Instant transaction acknowledgment detailing payment method, receipt ref, and remaining balance.",
        bodyTemplate: "Dear {{customer_name}}, thank you for your payment of {{amount}} towards invoice {{invoice_number}}. Receipt Ref: {{receipt_number}}. Remaining balance: {{balance_due}}. Best regards, {{company_name}}.",
        variables: ["customer_name", "amount", "invoice_number", "receipt_number", "balance_due", "company_name"],
        sampleVariables: {
            customer_name: "Acme Enterprises",
            amount: "₹10,000.00",
            invoice_number: "INV-2026-0042",
            receipt_number: "RCP-2026-101",
            balance_due: "₹8,500.00",
            company_name: "Genesoft ERP Corp",
        },
    },
    PAYMENT_OVERDUE_REMINDER: {
        key: "PAYMENT_OVERDUE_REMINDER",
        name: "Payment Overdue Dunning Alert",
        category: "BILLING",
        description: "Gentle yet firm collection notice for unpaid accounts past their agreed credit terms.",
        bodyTemplate: "Dear {{customer_name}}, a quick reminder that invoice {{invoice_number}} for {{amount}} was due on {{due_date}} ({{days_overdue}} days overdue). Please settle the balance at your earliest convenience via: {{payment_link}}. Contact {{company_name}} if you have any questions.",
        variables: ["customer_name", "invoice_number", "amount", "due_date", "days_overdue", "payment_link", "company_name"],
        sampleVariables: {
            customer_name: "TechNova Solutions",
            invoice_number: "INV-2026-0038",
            amount: "₹45,200.00",
            due_date: "01 Sep 2026",
            days_overdue: "11",
            payment_link: "https://erp.genesoft.ai/portal/pay/inv_38",
            company_name: "Genesoft ERP Corp",
        },
    },
    ORDER_CONFIRMATION: {
        key: "ORDER_CONFIRMATION",
        name: "Sales Order Confirmation",
        category: "SALES",
        description: "Notifies customer that their purchase order has been approved and booked for dispatch.",
        bodyTemplate: "Hello {{customer_name}}, your order {{order_number}} for {{amount}} has been confirmed by {{company_name}}! Estimated dispatch: {{delivery_date}}. Track your order here: {{tracking_link}}.",
        variables: ["customer_name", "order_number", "amount", "company_name", "delivery_date", "tracking_link"],
        sampleVariables: {
            customer_name: "Robert Smith",
            order_number: "SO-2026-089",
            amount: "₹7,250.00",
            company_name: "Genesoft ERP Corp",
            delivery_date: "18 Sep 2026",
            tracking_link: "https://erp.genesoft.ai/track/SO-89",
        },
    },
    SUPPORT_TICKET_UPDATE: {
        key: "SUPPORT_TICKET_UPDATE",
        name: "Support Ticket Status Update",
        category: "SUPPORT",
        description: "Real-time alert dispatched when a customer support issue has an engineering or agent response.",
        bodyTemplate: "Hi {{customer_name}}, an update has been posted to your support ticket #{{ticket_id}} ({{ticket_title}}): \"{{latest_update}}\". View complete discussion: {{portal_link}}.",
        variables: ["customer_name", "ticket_id", "ticket_title", "latest_update", "portal_link"],
        sampleVariables: {
            customer_name: "Samantha Wright",
            ticket_id: "TCK-408",
            ticket_title: "Bank Statement Sync Issue",
            latest_update: "Our engineering team has reconciled the statement lines.",
            portal_link: "https://erp.genesoft.ai/portal/tickets/408",
        },
    },
    CUSTOMER_WELCOME: {
        key: "CUSTOMER_WELCOME",
        name: "Welcome Onboarding Greeting",
        category: "MARKETING",
        description: "Warm welcome message introducing the account manager and enterprise point of contact.",
        bodyTemplate: "Welcome to {{company_name}}, {{customer_name}}! We are thrilled to partner with you. Your dedicated account representative is {{account_manager}} ({{manager_phone}}). Feel free to reach out anytime!",
        variables: ["company_name", "customer_name", "account_manager", "manager_phone"],
        sampleVariables: {
            company_name: "Genesoft ERP Corp",
            customer_name: "Skyline Holdings",
            account_manager: "Ananya Sharma",
            manager_phone: "+91 98200 12345",
        },
    },
    CUSTOM_MESSAGE: {
        key: "CUSTOM_MESSAGE",
        name: "Direct Custom Message",
        category: "SALES",
        description: "Freeform message with no predefined template structure.",
        bodyTemplate: "{{message}}",
        variables: ["message"],
        sampleVariables: {
            message: "Hello, following up on our meeting this morning. Please review the attached contract.",
        },
    },
}

/**
 * Normalizes any phone number into international E.164 format digits.
 * Handles common country prefixes:
 * - India: default 91, strip leading 0
 * - US: default 1, 10 digits
 * - UK: 44, strip leading 0
 * - UAE: 971, strip leading 0
 * - KSA: 966, strip leading 0
 * - Australia: 61, strip leading 0
 */
export function normalizeE164Phone(rawPhone: string, defaultCountry = "91"): string {
    if (!rawPhone) return ""
    // Remove all non-digits except a leading plus
    let clean = rawPhone.trim().replace(/[^\d+]/g, "")

    if (clean.startsWith("+")) {
        clean = clean.substring(1)
    } else if (clean.startsWith("00")) {
        clean = clean.substring(2)
    }

    // Strip leading 0 if local national number format
    if (clean.startsWith("0") && clean.length > 9) {
        clean = clean.substring(1)
    }

    // If no country code attached (e.g. 10-digit number like 9876543210)
    if (clean.length === 10) {
        clean = `${defaultCountry}${clean}`
    } else if (clean.length === 9 && (defaultCountry === "971" || defaultCountry === "966" || defaultCountry === "61")) {
        // UAE/KSA/Australia local 9 digits without leading 0
        clean = `${defaultCountry}${clean}`
    }

    return clean
}

/**
 * Generates an instant WhatsApp Web / App direct deep link (`https://wa.me/...`).
 */
export function generateWhatsAppDirectLink(phone: string, text: string, defaultCountry = "91"): string {
    const cleanDigits = normalizeE164Phone(phone, defaultCountry)
    const encodedText = encodeURIComponent(text.trim())
    return `https://wa.me/${cleanDigits}?text=${encodedText}`
}

/**
 * Interpolates template merge variables into plain text string.
 */
export function interpolateWhatsAppTemplate(templateText: string, variables: Record<string, string>): string {
    let result = templateText
    for (const [key, val] of Object.entries(variables)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g")
        result = result.replace(regex, val || "")
    }
    return result
}

/**
 * Compiles Meta Cloud API JSON payload for text messaging.
 */
export function compileMetaCloudApiPayload(params: {
    recipientPhone: string
    messageText: string
    defaultCountry?: string
    previewUrl?: boolean
}) {
    const cleanDigits = normalizeE164Phone(params.recipientPhone, params.defaultCountry || "91")
    return {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanDigits,
        type: "text",
        text: {
            preview_url: params.previewUrl ?? true,
            body: params.messageText.trim(),
        },
    }
}

/**
 * Dispatches an outbound WhatsApp message via Meta Cloud API or returns simulated receipt.
 */
export async function dispatchMetaCloudApiMessage(params: {
    config: WhatsAppConfig
    recipientPhone: string
    messageText: string
}): Promise<{
    success: boolean
    wamid?: string
    status: "SENT" | "DELIVERED" | "FAILED"
    error?: string
    directLink: string
    simulated?: boolean
}> {
    const { config, recipientPhone, messageText } = params
    const defaultCountry = config.defaultCountryCode || "91"
    const cleanDigits = normalizeE164Phone(recipientPhone, defaultCountry)
    const directLink = generateWhatsAppDirectLink(recipientPhone, messageText, defaultCountry)

    if (!cleanDigits) {
        return {
            success: false,
            status: "FAILED",
            error: "Invalid or missing recipient phone number",
            directLink,
        }
    }

    // Direct Link Mode: doesn't hit server API, intended for manual browser dispatch
    if (config.mode === "DIRECT_LINK") {
        return {
            success: true,
            status: "SENT",
            directLink,
            simulated: false,
        }
    }

    // If SIMULATION mode or credentials missing, return graceful simulation
    if (config.mode === "SIMULATION" || !config.accessToken || !config.phoneNumberId) {
        const simWamid = `wamid.sim_${Date.now()}_${Math.floor(Math.random() * 10000)}`
        return {
            success: true,
            wamid: simWamid,
            status: "DELIVERED",
            directLink,
            simulated: true,
        }
    }

    // Meta Cloud API HTTP Request
    try {
        const payload = compileMetaCloudApiPayload({
            recipientPhone,
            messageText,
            defaultCountry,
            previewUrl: true,
        })

        const url = `https://graph.facebook.com/v20.0/${config.phoneNumberId}/messages`
        const res = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${config.accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        })

        const data = await res.json()
        if (!res.ok) {
            return {
                success: false,
                status: "FAILED",
                error: data.error?.message || `Meta API Error (${res.status})`,
                directLink,
            }
        }

        const wamid = data.messages?.[0]?.id || `wamid.prod_${Date.now()}`
        return {
            success: true,
            wamid,
            status: "SENT",
            directLink,
            simulated: false,
        }
    } catch (err: any) {
        return {
            success: false,
            status: "FAILED",
            error: err.message || "Failed to communicate with Meta Cloud API",
            directLink,
        }
    }
}

/**
 * Validates Meta Webhook challenge handshake.
 */
export function verifyMetaWebhookChallenge(params: {
    mode: string | null
    token: string | null
    challenge: string | null
    expectedToken: string
}): { verified: boolean; challenge?: string } {
    if (params.mode === "subscribe" && params.token === params.expectedToken) {
        return { verified: true, challenge: params.challenge || "" }
    }
    return { verified: false }
}

/**
 * Parses incoming Meta Cloud API webhook events (status updates & incoming messages).
 */
export function parseMetaWebhookEvent(body: any): {
    statuses: Array<{
        wamid: string
        status: "sent" | "delivered" | "read" | "failed"
        recipientId: string
        timestamp: string
        error?: string
    }>
    messages: Array<{
        wamid: string
        from: string
        name?: string
        timestamp: string
        text: string
    }>
} {
    const statuses: any[] = []
    const messages: any[] = []

    if (!body || !body.entry) return { statuses, messages }

    for (const entry of body.entry) {
        for (const change of entry.changes || []) {
            const value = change.value
            if (!value) continue

            // Parse status receipts (sent, delivered, read, failed)
            if (value.statuses && Array.isArray(value.statuses)) {
                for (const s of value.statuses) {
                    statuses.push({
                        wamid: s.id,
                        status: s.status,
                        recipientId: s.recipient_id,
                        timestamp: s.timestamp ? new Date(Number(s.timestamp) * 1000).toISOString() : new Date().toISOString(),
                        error: s.errors?.[0]?.title || s.errors?.[0]?.message,
                    })
                }
            }

            // Parse incoming user text messages
            if (value.messages && Array.isArray(value.messages)) {
                const contactMap = new Map<string, string>()
                if (value.contacts && Array.isArray(value.contacts)) {
                    for (const c of value.contacts) {
                        contactMap.set(c.wa_id, c.profile?.name || "")
                    }
                }

                for (const m of value.messages) {
                    if (m.type === "text" && m.text?.body) {
                        messages.push({
                            wamid: m.id,
                            from: m.from,
                            name: contactMap.get(m.from) || "Customer",
                            timestamp: m.timestamp ? new Date(Number(m.timestamp) * 1000).toISOString() : new Date().toISOString(),
                            text: m.text.body,
                        })
                    }
                }
            }
        }
    }

    return { statuses, messages }
}
