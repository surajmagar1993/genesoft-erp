"use client"

import React, { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { InvoiceDB, InvoiceTemplateId, updateInvoiceTemplate, updateTenantDefaultTemplate } from "@/app/actions/sales/invoices"
import { INVOICE_TEMPLATES, InvoiceTemplateMeta } from "./templates/invoice-templates"
import { InvoiceTemplateRenderer } from "./templates/invoice-template-renderer"
import { Printer, Download, Check, Palette, Sparkles, Building2, Layout, Receipt, Sliders } from "lucide-react"
import { toast } from "sonner"

interface InvoiceTemplateDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    invoice: InvoiceDB
    onTemplateChanged?: (newTemplate: InvoiceTemplateId) => void
}

export function InvoiceTemplateDialog({
    open,
    onOpenChange,
    invoice,
    onTemplateChanged
}: InvoiceTemplateDialogProps) {
    const router = useRouter()
    const [selectedTemplate, setSelectedTemplate] = useState<InvoiceTemplateId>(
        invoice.template_id || "MODERN"
    )
    const [isPending, startTransition] = useTransition()

    const templateKeys = Object.keys(INVOICE_TEMPLATES) as InvoiceTemplateId[]

    const getTemplateIcon = (id: InvoiceTemplateId) => {
        switch (id) {
            case "CLASSIC":
                return <Building2 className="h-4 w-4" />
            case "MINIMALIST":
                return <Layout className="h-4 w-4" />
            case "COMPACT":
                return <Receipt className="h-4 w-4" />
            case "CREATIVE":
                return <Sparkles className="h-4 w-4" />
            case "MODERN":
            default:
                return <Palette className="h-4 w-4" />
        }
    }

    const handleSaveInvoiceDefault = () => {
        startTransition(async () => {
            const res = await updateInvoiceTemplate(invoice.id, selectedTemplate)
            if (res.success) {
                toast.success(`Template updated to ${INVOICE_TEMPLATES[selectedTemplate].name}`)
                if (onTemplateChanged) onTemplateChanged(selectedTemplate)
                router.refresh()
                onOpenChange(false)
            } else {
                toast.error(res.error || "Failed to save template preference")
            }
        })
    }

    const handleSaveOrgDefault = () => {
        startTransition(async () => {
            const res = await updateTenantDefaultTemplate(selectedTemplate)
            if (res.success) {
                toast.success(`${INVOICE_TEMPLATES[selectedTemplate].name} set as organization default`)
                router.refresh()
            } else {
                toast.error(res.error || "Failed to set default template")
            }
        })
    }

    const handlePrint = () => {
        window.print()
    }

    const handleDownloadPdf = () => {
        const url = `/api/invoices/${invoice.id}/pdf?template=${selectedTemplate.toLowerCase()}`
        window.open(url, "_blank")
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                {/* Header */}
                <DialogHeader className="p-4 border-b bg-muted/30">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pr-6">
                        <div>
                            <DialogTitle className="text-lg font-bold flex items-center gap-2">
                                <Palette className="h-5 w-5 text-primary" /> Invoice Template Studio
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                Preview, customize, and apply professional layout designs to #{invoice.invoice_number}
                            </DialogDescription>
                        </div>

                        {/* Top quick actions */}
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handlePrint}
                                className="h-8 text-xs gap-1.5"
                            >
                                <Printer className="h-3.5 w-3.5" /> Print
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownloadPdf}
                                className="h-8 text-xs gap-1.5"
                            >
                                <Download className="h-3.5 w-3.5" /> PDF
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                {/* Template Selector Ribbon */}
                <div className="bg-muted/15 border-b p-3 overflow-x-auto">
                    <div className="flex gap-2 min-w-max">
                        {templateKeys.map((key) => {
                            const meta = INVOICE_TEMPLATES[key]
                            const isSelected = selectedTemplate === key
                            return (
                                <button
                                    key={key}
                                    onClick={() => setSelectedTemplate(key)}
                                    className={`flex items-center gap-2.5 p-2 rounded-lg border text-left transition-all ${
                                        isSelected
                                            ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary"
                                            : "border-border/60 bg-card hover:bg-muted/50"
                                    }`}
                                >
                                    <div
                                        className="h-8 w-8 rounded flex items-center justify-center text-white shrink-0 shadow-2xs"
                                        style={{ backgroundColor: meta.accentColor }}
                                    >
                                        {getTemplateIcon(key)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs font-bold text-foreground">{meta.name}</span>
                                            {isSelected && (
                                                <Badge variant="secondary" className="text-[9px] h-4 px-1 bg-primary text-primary-foreground">
                                                    Active
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground line-clamp-1">{meta.category}</p>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Preview Canvas */}
                <div className="flex-1 bg-muted/40 p-4 sm:p-6 overflow-y-auto">
                    <div className="max-w-4xl mx-auto">
                        <InvoiceTemplateRenderer
                            invoice={invoice}
                            templateId={selectedTemplate}
                        />
                    </div>
                </div>

                {/* Footer Controls */}
                <DialogFooter className="p-3 border-t bg-card flex flex-col sm:flex-row items-center justify-between gap-2">
                    <div className="text-xs text-muted-foreground hidden sm:block">
                        Current: <strong className="text-foreground">{INVOICE_TEMPLATES[selectedTemplate].name}</strong> — {INVOICE_TEMPLATES[selectedTemplate].recommendedFor}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            className="text-xs h-8"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={isPending}
                            onClick={handleSaveOrgDefault}
                            className="text-xs h-8"
                            title="Set this template as the default for all future invoices"
                        >
                            Set as Org Default
                        </Button>
                        <Button
                            size="sm"
                            disabled={isPending}
                            onClick={handleSaveInvoiceDefault}
                            className="text-xs h-8 gap-1.5"
                        >
                            <Check className="h-3.5 w-3.5" /> Apply to This Invoice
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
