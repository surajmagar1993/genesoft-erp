import React from "react"
import { getTenantId } from "@/lib/get-tenant-id"
import { prisma } from "@/lib/prisma"
import { InvoiceTemplateId } from "@/app/actions/sales/invoices"
import { TemplatesClient } from "./templates-client"

export const dynamic = "force-dynamic"

export default async function InvoiceTemplatesPage() {
    const tenantId = await getTenantId()
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true, name: true }
    })

    const tenantSettings = (tenant?.settings as Record<string, any>) || {}
    const defaultTemplate: InvoiceTemplateId = (tenantSettings.invoice_template as InvoiceTemplateId) || "MODERN"

    return (
        <TemplatesClient
            defaultTemplate={defaultTemplate}
            tenantName={tenant?.name || "Company"}
        />
    )
}
