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
        ...c,
        name: c.displayName,
    }))

    const invoices = rawInvoices.map((inv: any) => ({

        ...inv,
        contact: inv.contact
            ? {
                  id: inv.contact.id,
                  name: inv.contact.displayName,
                  phone: inv.contact.phone,
              }
            : null,
    })) as any

    const settings = (tenant?.settings as any) || {}
    const messages = Array.isArray(settings.whatsapp?.messages) ? settings.whatsapp.messages : []

    return (
        <WhatsAppClient
            initialConfig={config}
            initialMessages={messages}
            contacts={contacts}
            invoices={invoices}
            companyName={tenant?.name || "Our Company"}
            currencyCode={tenant?.currencyCode || "INR"}
        />
    )
}
