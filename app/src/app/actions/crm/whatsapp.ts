"use server"

import { prisma } from "@/lib/prisma"
import { getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"
import {
    WhatsAppConfig,
    WhatsAppMessage,
    WhatsAppTemplateKey,
    WHATSAPP_TEMPLATES,
    dispatchMetaCloudApiMessage,
    interpolateWhatsAppTemplate,
    generateWhatsAppDirectLink,
    normalizeE164Phone,
} from "@/lib/whatsapp-engine"

/**
 * Returns tenant's WhatsApp Business Account configuration.
 */
export async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) {
            return { mode: "SIMULATION", defaultCountryCode: "91" }
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { settings: true, countryCode: true, name: true },
        })

        const settings = (tenant?.settings as any) || {}
        const wa = settings.whatsapp || {}

        return {
            phoneNumberId: wa.phoneNumberId || "",
            wabaId: wa.wabaId || "",
            accessToken: wa.accessToken ? "••••••••" + wa.accessToken.slice(-4) : "",
            verifyToken: wa.verifyToken || "genesoft_wa_verify_token",
            defaultCountryCode: wa.defaultCountryCode || (tenant?.countryCode === "US" ? "1" : "91"),
            mode: wa.mode || "SIMULATION",
            senderDisplayName: wa.senderDisplayName || tenant?.name || "Business WhatsApp",
        }
    } catch (err) {
        console.error("Failed to get WhatsApp config:", err)
        return { mode: "SIMULATION", defaultCountryCode: "91" }
    }
}

/**
 * Updates tenant's WhatsApp configuration.
 */
export async function saveWhatsAppConfig(payload: {
    phoneNumberId?: string
    wabaId?: string
    accessToken?: string
    verifyToken?: string
    defaultCountryCode?: string
    mode: "CLOUD_API" | "DIRECT_LINK" | "SIMULATION"
    senderDisplayName?: string
}) {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) {
            return { success: false, error: "Unauthorized tenant session" }
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { settings: true },
        })

        const currentSettings = (tenant?.settings as any) || {}
        const currentWa = currentSettings.whatsapp || {}

        // Only update token if provided (avoid overwriting with masked token)
        let tokenToSave = currentWa.accessToken
        if (payload.accessToken && !payload.accessToken.startsWith("••••")) {
            tokenToSave = payload.accessToken
        }

        const updatedWa: WhatsAppConfig = {
            phoneNumberId: payload.phoneNumberId ?? currentWa.phoneNumberId,
            wabaId: payload.wabaId ?? currentWa.wabaId,
            accessToken: tokenToSave,
            verifyToken: payload.verifyToken || currentWa.verifyToken || "genesoft_wa_verify_token",
            defaultCountryCode: payload.defaultCountryCode || currentWa.defaultCountryCode || "91",
            mode: payload.mode,
            senderDisplayName: payload.senderDisplayName || currentWa.senderDisplayName,
        }

        await prisma.tenant.update({
            where: { id: tenantId },
            data: {
                settings: {
                    ...currentSettings,
                    whatsapp: {
                        ...currentWa,
                        ...updatedWa,
                    },
                },
            },
        })

        revalidatePath("/crm/whatsapp")
        return { success: true }
    } catch (err: any) {
        console.error("Failed to save WhatsApp config:", err)
        return { success: false, error: err.message || "Failed to update configuration" }
    }
}

/**
 * Tests connection to Meta Cloud API or validates credentials.
 */
export async function testWhatsAppConnection(testPhone?: string) {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) return { success: false, error: "Unauthorized" }

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { settings: true, name: true },
        })

        const settings = (tenant?.settings as any) || {}
        const wa: WhatsAppConfig = settings.whatsapp || { mode: "SIMULATION", defaultCountryCode: "91" }

        if (wa.mode === "SIMULATION") {
            return {
                success: true,
                simulated: true,
                message: "Simulation Gateway active. All test transmissions will simulate delivery.",
            }
        }

        if (!wa.phoneNumberId || !wa.accessToken) {
            return {
                success: false,
                error: "Phone Number ID and Permanent Access Token are required for Meta Cloud API.",
            }
        }

        // Test API by requesting phone number metadata from Meta Graph API
        const url = `https://graph.facebook.com/v20.0/${wa.phoneNumberId}`
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${wa.accessToken}` },
        })
        const data = await res.json()

        if (!res.ok) {
            return {
                success: false,
                error: data.error?.message || `Meta Graph API returned HTTP ${res.status}`,
            }
        }

        return {
            success: true,
            simulated: false,
            message: `Connected successfully! Display Name: ${data.verified_name || wa.senderDisplayName || "Verified Account"} (${data.display_phone_number || wa.phoneNumberId})`,
        }
    } catch (err: any) {
        return { success: false, error: err.message || "Connection test failed" }
    }
}

/**
 * Dispatches a WhatsApp template or custom message to a customer.
 */
export async function sendWhatsAppMessage(payload: {
    recipientPhone: string
    contactId?: string
    contactName?: string
    templateKey?: WhatsAppTemplateKey
    variables?: Record<string, string>
    customText?: string
}) {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) return { success: false, error: "Unauthorized" }

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { settings: true, name: true },
        })

        const settings = (tenant?.settings as any) || {}
        const waConfig: WhatsAppConfig = settings.whatsapp || { mode: "SIMULATION", defaultCountryCode: "91" }

        // Determine message text
        let messageText = payload.customText || ""
        if (payload.templateKey && WHATSAPP_TEMPLATES[payload.templateKey]) {
            const tmpl = WHATSAPP_TEMPLATES[payload.templateKey]
            const vars = {
                company_name: tenant?.name || "Our Company",
                ...payload.variables,
            }
            messageText = interpolateWhatsAppTemplate(tmpl.bodyTemplate, vars)
        }

        if (!messageText.trim()) {
            return { success: false, error: "Message content cannot be empty" }
        }

        // Dispatch via Engine
        const dispatchResult = await dispatchMetaCloudApiMessage({
            config: waConfig,
            recipientPhone: payload.recipientPhone,
            messageText,
        })

        const newMessage: WhatsAppMessage = {
            id: `wa_msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            contactId: payload.contactId,
            contactName: payload.contactName,
            recipientPhone: normalizeE164Phone(payload.recipientPhone, waConfig.defaultCountryCode || "91"),
            direction: "OUTBOUND",
            templateKey: payload.templateKey,
            content: messageText,
            status: dispatchResult.status,
            timestamp: new Date().toISOString(),
            errorMessage: dispatchResult.error,
            wamid: dispatchResult.wamid,
            directLink: dispatchResult.directLink,
        }

        // Store in settings.whatsapp.messages (keep last 100)
        const currentMessages: WhatsAppMessage[] = Array.isArray(settings.whatsapp?.messages)
            ? settings.whatsapp.messages
            : []
        const updatedMessages = [newMessage, ...currentMessages].slice(0, 100)

        await prisma.tenant.update({
            where: { id: tenantId },
            data: {
                settings: {
                    ...settings,
                    whatsapp: {
                        ...(settings.whatsapp || {}),
                        messages: updatedMessages,
                    },
                },
            },
        })

        // Also record in polymorphic CommunicationLog if contactId is provided
        if (payload.contactId) {
            try {
                await prisma.communicationLog.create({
                    data: {
                        tenantId,
                        contactId: payload.contactId,
                        type: "NOTE",
                        subject: `WhatsApp: ${payload.templateKey || "Direct Message"}`,
                        content: `[WhatsApp Outbound to +${newMessage.recipientPhone}]\n${messageText}`,
                        loggedBy: "System (WhatsApp API)",
                    },
                })
            } catch (logErr) {
                console.warn("CommunicationLog sync failed (non-critical):", logErr)
            }
        }

        revalidatePath("/crm/whatsapp")
        return {
            success: dispatchResult.success,
            message: newMessage,
            directLink: dispatchResult.directLink,
            simulated: dispatchResult.simulated,
            error: dispatchResult.error,
        }
    } catch (err: any) {
        console.error("sendWhatsAppMessage error:", err)
        return { success: false, error: err.message || "Failed to dispatch message" }
    }
}

/**
 * Convenience action: Shares an Invoice via WhatsApp.
 */
export async function sendInvoiceViaWhatsApp(params: {
    invoiceId: string
    recipientPhone?: string
    templateKey?: "INVOICE_DISPATCH" | "PAYMENT_OVERDUE_REMINDER"
    customNote?: string
}) {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) return { success: false, error: "Unauthorized" }

        const invoice = await prisma.invoice.findFirst({
            where: { id: params.invoiceId, tenant_id: tenantId },
            include: { contact: true },
        })

        if (!invoice) return { success: false, error: "Invoice not found" }

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { name: true, currencyCode: true, settings: true },
        })

        const phone = params.recipientPhone || invoice.contact?.phone || ""
        if (!phone) {
            return { success: false, error: "No contact phone number provided for this customer" }
        }

        const dueDate = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "Due upon receipt"
        const currency = invoice.currency_code || tenant?.currencyCode || "INR"
        const totalFormatted = `${currency} ${Number(invoice.total_amount).toFixed(2)}`

        const portalBase = process.env.NEXT_PUBLIC_APP_URL || "https://erp.genesoft.ai"
        const paymentLink = `${portalBase}/portal/${invoice.contact?.portalToken || invoice.id}`

        // Calculate days overdue if past due date
        let daysOverdue = "0"
        if (invoice.due_date) {
            const diffMs = Date.now() - new Date(invoice.due_date).getTime()
            daysOverdue = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24))).toString()
        }

        const templateKey = params.templateKey || "INVOICE_DISPATCH"
        const variables = {
            customer_name: invoice.customer_name || invoice.contact?.name || "Valued Customer",
            invoice_number: invoice.invoice_number,
            amount: totalFormatted,
            company_name: tenant?.name || "Genesoft ERP",
            due_date: dueDate,
            payment_link: paymentLink,
            days_overdue: daysOverdue,
        }

        return await sendWhatsAppMessage({
            recipientPhone: phone,
            contactId: invoice.contact_id || undefined,
            contactName: invoice.customer_name,
            templateKey,
            variables,
        })
    } catch (err: any) {
        console.error("sendInvoiceViaWhatsApp error:", err)
        return { success: false, error: err.message || "Failed to send invoice via WhatsApp" }
    }
}

/**
 * Returns recent WhatsApp chat messages & history.
 */
export async function getWhatsAppChatHistory(contactId?: string): Promise<{
    messages: WhatsAppMessage[]
    totalCount: number
}> {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) return { messages: [], totalCount: 0 }

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { settings: true },
        })

        const settings = (tenant?.settings as any) || {}
        let messages: WhatsAppMessage[] = Array.isArray(settings.whatsapp?.messages)
            ? settings.whatsapp.messages
            : []

        if (contactId) {
            messages = messages.filter((m) => m.contactId === contactId)
        }

        return {
            messages,
            totalCount: messages.length,
        }
    } catch (err) {
        console.error("getWhatsAppChatHistory error:", err)
        return { messages: [], totalCount: 0 }
    }
}
