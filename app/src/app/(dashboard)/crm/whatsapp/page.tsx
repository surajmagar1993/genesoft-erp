import { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { getTenantId } from "@/lib/get-tenant-id"
import { getWhatsAppConfig } from "@/app/actions/crm/whatsapp"
import WhatsAppClient from "./whatsapp-client"

export const metadata: Metadata = {
    title: "WhatsApp Business Hub | Genesoft ERP",
    description: "Enterprise WhatsApp Business API communication console, invoice dispatcher, and template messaging hub.",
}

export default async function WhatsAppHubPage() {
    const tenantId = await getTenantId()
    if (!tenantId) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                Please log in to access the WhatsApp Business Hub.
            </div>
        )
    }

    const [config, tenant, rawContacts, rawInvoices] = await Promise.all([
        getWhatsAppConfig(),
        prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { name: true, currencyCode: true, settings: true },
        }),
        prisma.contact.findMany({
            where: {
                tenantId,
                phone: { not: null },
            },
            select: {
                id: true,
                displayName: true,
                phone: true,
                email: true,
                type: true,
                updatedAt: true,
            },
            take: 50,
            orderBy: { updatedAt: "desc" },
        }),
        prisma.invoice.findMany({
            where: {
                tenantId,
            },
            include: {
                contact: {
                    select: { id: true, displayName: true, phone: true },
                },
            },
            take: 30,
            orderBy: { invoiceDate: "desc" },
        }),
    ])

    const contacts = rawContacts.map((c: any) => ({
        id: c.id,
        name: c.displayName,
        phone: c.phone,
        email: c.email,
        type: c.type,
        updatedAt: c.updatedAt ? c.updatedAt.toISOString() : new Date().toISOString(),
    }))

    const invoices = rawInvoices.map((inv: any) => ({
        id: inv.id,
        invoice_number: inv.invoiceNumber || "",
        customer_name: inv.contact?.displayName || (inv.billTo as any)?.name || "Customer",
        total_amount: Number(inv.total) || 0,
        status: inv.status,
        due_date: inv.dueDate ? inv.dueDate.toISOString() : null,
        contact: inv.contact
            ? {
                  id: inv.contact.id,
                  name: inv.contact.displayName,
                  phone: inv.contact.phone,
              }
            : null,
    }))

    const settings = (tenant?.settings as any) || {}
    const rawMessages = Array.isArray(settings.whatsapp?.messages) ? settings.whatsapp.messages : []
    const messages = JSON.parse(JSON.stringify(rawMessages))

    return (
        <WhatsAppClient
            initialConfig={JSON.parse(JSON.stringify(config))}
            initialMessages={messages}
            contacts={contacts}
            invoices={invoices}
            companyName={tenant?.name || "Our Company"}
            currencyCode={tenant?.currencyCode || "INR"}
        />
    )
}
