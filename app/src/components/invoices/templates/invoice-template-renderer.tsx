"use client"

import React from "react"
import { InvoiceDB, InvoiceTemplateId } from "@/app/actions/sales/invoices"
import { TemplateModern } from "./template-modern"
import { TemplateClassic } from "./template-classic"
import { TemplateMinimalist } from "./template-minimalist"
import { TemplateCompact } from "./template-compact"
import { TemplateCreative } from "./template-creative"

interface InvoiceTemplateRendererProps {
    invoice: InvoiceDB
    templateId?: InvoiceTemplateId
    className?: string
}

export function InvoiceTemplateRenderer({
    invoice,
    templateId,
    className = ""
}: InvoiceTemplateRendererProps) {
    const selectedTemplate: InvoiceTemplateId = templateId || invoice.template_id || "MODERN"

    const renderTemplate = () => {
        switch (selectedTemplate) {
            case "CLASSIC":
                return <TemplateClassic invoice={invoice} />
            case "MINIMALIST":
                return <TemplateMinimalist invoice={invoice} />
            case "COMPACT":
                return <TemplateCompact invoice={invoice} />
            case "CREATIVE":
                return <TemplateCreative invoice={invoice} />
            case "MODERN":
            default:
                return <TemplateModern invoice={invoice} />
        }
    }

    return (
        <div className={`invoice-template-container ${className}`}>
            {renderTemplate()}
        </div>
    )
}
