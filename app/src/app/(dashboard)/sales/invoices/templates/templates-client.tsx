"use client"

import React, { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
    InvoiceTemplateId,
    InvoiceDB,
    updateTenantDefaultTemplate
} from "@/app/actions/sales/invoices"
import { INVOICE_TEMPLATES, InvoiceTemplateMeta } from "@/components/invoices/templates/invoice-templates"
import { InvoiceTemplateRenderer } from "@/components/invoices/templates/invoice-template-renderer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
    ArrowLeft,
    Palette,
    CheckCircle2,
    Check,
    Sparkles,
    Building2,
    Layout,
    Receipt,
    ExternalLink,
    FileText,
    Eye
} from "lucide-react"
import { toast } from "sonner"

interface TemplatesClientProps {
    defaultTemplate: InvoiceTemplateId
    tenantName: string
}

export function TemplatesClient({ defaultTemplate: initialDefault, tenantName }: TemplatesClientProps) {
    const router = useRouter()
    const [currentDefault, setCurrentDefault] = useState<InvoiceTemplateId>(initialDefault)
    const [previewTemplate, setPreviewTemplate] = useState<InvoiceTemplateId>(initialDefault)
    const [isPending, startTransition] = useTransition()

    const templateKeys = Object.keys(INVOICE_TEMPLATES) as InvoiceTemplateId[]

    // Sample mock invoice for live template demonstration
    const sampleInvoice: InvoiceDB = {
        id: "sample-preview-inv",
        invoice_number: "INV-2026-0891",
        type: "TAX_INVOICE",
        customer_name: "Apex Global Technologies Ltd",
        customer_email: "accounts@apextech.com",
        customer_gstin: "27AAACA9999P1Z1",
        invoice_date: new Date().toISOString(),
        valid_until: new Date(new Date().getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        reference: "PO-AG-88219",
        status: "SENT",
        discount: 2500,
        discount_type: "FIXED",
        notes: "Thank you for choosing Genesoft ERP.",
        terms_and_conditions: "1. Net 15 days payment schedule.\n2. Interest @ 18% p.a. chargeable on overdue accounts.\n3. Goods subject to standard warranty terms.",
        declaration: "We declare that this invoice shows the actual price of the goods or services described and that all particulars are true and correct.",
        signatory_name: "Vikram Malhotra",
        signatory_designation: "Chief Financial Officer",
        signature_url: null,
        supplier_gstin: "27AAAAA0000A1Z5",
        supplier_state: "Maharashtra",
        place_of_supply: "Maharashtra",
        supply_type: "intra",
        pdf_url: null,
        tenant_id: "tenant-demo",
        contact_id: "contact-demo",
        currency_code: "INR",
        is_tax_exempt: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        template_id: previewTemplate,
        invoice_line_items: [
            {
                id: "item-1",
                invoice_id: "sample-preview-inv",
                product_name: "Cloud Infrastructure & Database Architecture",
                description: "Dedicated high-availability PostgreSQL cluster configuration with multi-region replication.",
                qty: 1,
                unit_price: 65000,
                tax_percent: 18,
                hsn_sac: "998313",
                cgst_percent: 9,
                sgst_percent: 9,
                igst_percent: 0,
                cgst_amount: 5850,
                sgst_amount: 5850,
                igst_amount: 0,
                tenant_id: "tenant-demo"
            },
            {
                id: "item-2",
                invoice_id: "sample-preview-inv",
                product_name: "Enterprise ERP Implementation & User Training",
                description: "Onsite technical orientation, ledger data migration, and workflow automation setup.",
                qty: 3,
                unit_price: 15000,
                tax_percent: 18,
                hsn_sac: "998311",
                cgst_percent: 9,
                sgst_percent: 9,
                igst_percent: 0,
                cgst_amount: 4050,
                sgst_amount: 4050,
                igst_amount: 0,
                tenant_id: "tenant-demo"
            }
        ]
    }

    const handleSetDefault = (templateId: InvoiceTemplateId) => {
        startTransition(async () => {
            const res = await updateTenantDefaultTemplate(templateId)
            if (res.success) {
                setCurrentDefault(templateId)
                toast.success(`${INVOICE_TEMPLATES[templateId].name} is now your default invoice template`)
                router.refresh()
            } else {
                toast.error(res.error || "Failed to update default template")
            }
        })
    }

    const getIcon = (id: InvoiceTemplateId) => {
        switch (id) {
            case "CLASSIC":
                return <Building2 className="h-5 w-5" />
            case "MINIMALIST":
                return <Layout className="h-5 w-5" />
            case "COMPACT":
                return <Receipt className="h-5 w-5" />
            case "CREATIVE":
                return <Sparkles className="h-5 w-5" />
            case "MODERN":
            default:
                return <Palette className="h-5 w-5" />
        }
    }

    return (
        <div className="space-y-6 p-6 max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link href="/sales/invoices">
                        <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Back">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                <Palette className="h-6 w-6 text-primary" /> Invoice Template Gallery
                            </h1>
                            <Badge variant="outline" className="text-xs">
                                5 Design Presets
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Choose the design layout that best represents your brand across client invoices and PDF downloads.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Link href="/sales/invoices/new">
                        <Button size="sm" className="h-9 text-xs">
                            <FileText className="mr-1.5 h-4 w-4" /> New Invoice
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Template Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {templateKeys.map((key) => {
                    const meta = INVOICE_TEMPLATES[key]
                    const isDefault = currentDefault === key
                    const isSelected = previewTemplate === key

                    return (
                        <Card
                            key={key}
                            className={`cursor-pointer transition-all hover:shadow-md flex flex-col justify-between ${
                                isSelected
                                    ? "ring-2 ring-primary shadow-xs border-primary"
                                    : "border-border/60 hover:border-border"
                            }`}
                            onClick={() => setPreviewTemplate(key)}
                        >
                            <CardHeader className="p-4 pb-2">
                                <div className="flex items-center justify-between gap-1 mb-2">
                                    <div
                                        className="h-8 w-8 rounded-lg flex items-center justify-center text-white shadow-2xs"
                                        style={{ backgroundColor: meta.accentColor }}
                                    >
                                        {getIcon(key)}
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        {isDefault && (
                                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-[9px] h-4 px-1.5">
                                                Default
                                            </Badge>
                                        )}
                                        <Badge variant="outline" className="text-[9px] h-4 px-1 text-muted-foreground">
                                            {meta.badgeText}
                                        </Badge>
                                    </div>
                                </div>
                                <CardTitle className="text-sm font-bold text-foreground">
                                    {meta.name}
                                </CardTitle>
                                <CardDescription className="text-[11px] line-clamp-1 font-medium text-primary">
                                    {meta.category}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="p-4 pt-0 space-y-3">
                                <p className="text-[11px] text-muted-foreground line-clamp-3 leading-relaxed">
                                    {meta.description}
                                </p>

                                <div className="pt-2 border-t border-border/40 space-y-1 text-[10px] text-muted-foreground">
                                    <p><strong>Recommended:</strong> {meta.recommendedFor}</p>
                                </div>

                                <div className="flex items-center gap-1.5 pt-1">
                                    <Button
                                        variant={isSelected ? "default" : "outline"}
                                        size="sm"
                                        className="w-full text-xs h-7 gap-1"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setPreviewTemplate(key)
                                        }}
                                    >
                                        <Eye className="h-3 w-3" />
                                        {isSelected ? "Viewing Preview" : "Preview"}
                                    </Button>
                                    {!isDefault && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={isPending}
                                            className="h-7 px-2 text-[10px] shrink-0 hover:bg-primary/10 hover:text-primary"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleSetDefault(key)
                                            }}
                                            title="Set as organization default"
                                        >
                                            Set Default
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Live Interactive Preview Canvas */}
            <Card className="border shadow-xs overflow-hidden">
                <CardHeader className="p-4 border-b bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-base font-bold">
                                Live Preview: {INVOICE_TEMPLATES[previewTemplate].name}
                            </CardTitle>
                            {currentDefault === previewTemplate && (
                                <Badge className="bg-emerald-600 text-xs">
                                    Active Default
                                </Badge>
                            )}
                        </div>
                        <CardDescription className="text-xs">
                            Rendering full statutory GST invoice layout with sample client data and line items.
                        </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                        {currentDefault !== previewTemplate && (
                            <Button
                                size="sm"
                                disabled={isPending}
                                onClick={() => handleSetDefault(previewTemplate)}
                                className="h-8 text-xs gap-1.5"
                            >
                                <Check className="h-3.5 w-3.5" /> Make This Org Default
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.print()}
                            className="h-8 text-xs"
                        >
                            Test Print
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="p-6 bg-muted/40 overflow-y-auto max-h-[700px]">
                    <div className="max-w-4xl mx-auto">
                        <InvoiceTemplateRenderer
                            invoice={sampleInvoice}
                            templateId={previewTemplate}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
