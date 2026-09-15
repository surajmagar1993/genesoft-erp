"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Plus, ArrowLeft, Download, Send, CreditCard, Pencil, Trash2, Calendar, FileText, CheckCircle2, IndianRupee, ArrowRightLeft, Stamp, ShieldCheck, Scale, Truck, MessageSquare, ExternalLink, Loader2, Link2, Copy, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

import { InvoiceDB, deleteInvoice, sendInvoiceEmail, convertProformaToInvoice } from "@/app/actions/sales/invoices"
import { PaymentDB, createPayment, deletePayment, CreatePaymentPayload, PaymentMethod } from "@/app/actions/finance/payments"
import { sendInvoiceViaWhatsApp } from "@/app/actions/crm/whatsapp"
import { generateWhatsAppDirectLink } from "@/lib/whatsapp-engine"
import { COMPANY } from "@/lib/constants/company"

const formatCurrency = (amount: number, currency: string = "INR") =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(amount)

const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

function calcInvoiceTotal(inv: InvoiceDB) {
    const items = inv.invoice_line_items ?? []
    const subtotal = items.reduce((s, li) => s + li.qty * li.unit_price, 0)
    const tax = items.reduce((s, li) => s + li.qty * li.unit_price * (li.tax_percent / 100), 0)
    const disc = inv.discount_type === "PERCENT" ? subtotal * (inv.discount / 100) : inv.discount
    return subtotal + tax - disc
}

interface Props {
    invoice: InvoiceDB & { contact_id?: string }
    payments: PaymentDB[]
}

export default function InvoiceDetailsClient({ invoice, payments: initialPayments }: Props) {
    const router = useRouter()
    const [payments, setPayments] = useState<PaymentDB[]>(initialPayments)
    const [isPending, startTransition] = useTransition()
    
    // Status color mapping
    const getVariant = (s: string) => {
      switch(s) {
        case "DRAFT": return "secondary"
        case "SENT": return "default"
        case "ACCEPTED": return "outline"
        case "PARTIALLY_PAID": return "secondary"
        case "PAID": return "default"
        case "REJECTED": return "destructive"
        case "CANCELLED": return "destructive"
        default: return "default"
      }
    }

    const totalInvoiceAmount = calcInvoiceTotal(invoice)
    const totalPaid = payments.reduce((acc, p) => acc + Number(p.amount), 0)
    const balanceDue = Math.max(0, totalInvoiceAmount - totalPaid)

    const billTo = (invoice as any).billTo || (invoice as any).bill_to || {}
    const ewayBillNo = billTo.ewayBillNo || (invoice as any).ewayBillNo

    // PAYMENT FORM MODAL STATE
    const [openPaymentModal, setOpenPaymentModal] = useState(false)
    const [paymentFormsState, setPaymentFormsState] = useState<CreatePaymentPayload>({
        invoice_id: invoice.id,
        contact_id: invoice.contact_id || "", 
        amount: balanceDue,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: "BANK_TRANSFER",
        reference: "",
        notes: "",
        currency_code: invoice.currency_code || "INR"
    })

    // WHATSAPP DISPATCH MODAL STATE
    const [openWhatsAppModal, setOpenWhatsAppModal] = useState(false)
    const [whatsAppPhone, setWhatsAppPhone] = useState(
        (invoice as any).contact?.phone || billTo.phone || ""
    )
    const [whatsAppTemplate, setWhatsAppTemplate] = useState<"INVOICE_DISPATCH" | "PAYMENT_OVERDUE_REMINDER">("INVOICE_DISPATCH")
    const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false)

    const handleSendWhatsApp = async () => {
        if (!whatsAppPhone) {
            alert("Please enter a valid phone number")
            return
        }
        try {
            setIsSendingWhatsApp(true)
            const res = await sendInvoiceViaWhatsApp({
                invoiceId: invoice.id,
                recipientPhone: whatsAppPhone,
                templateKey: whatsAppTemplate,
            })
            if (res.success) {
                alert(res.simulated ? "WhatsApp message simulated & recorded in timeline!" : "WhatsApp message dispatched successfully!")
                setOpenWhatsAppModal(false)
            } else {
                alert(res.error || "Failed to dispatch WhatsApp message")
            }
        } catch (err: any) {
            alert(err.message || "WhatsApp dispatch error")
        } finally {
            setIsSendingWhatsApp(false)
        }
    }

    const handleOpenWhatsAppDirect = () => {
        const portalBase = typeof window !== "undefined" ? window.location.origin : "https://erp.genesoft.ai"
        const text = `Hello ${invoice.customer_name}, your invoice ${invoice.invoice_number} for ${invoice.currency_code || "INR"} ${totalInvoiceAmount.toFixed(2)} from ${COMPANY.name} is ready. View & pay online: ${portalBase}/portal/${invoice.id}. Thank you!`
        const link = generateWhatsAppDirectLink(whatsAppPhone || "", text)
        window.open(link, "_blank")
    }

    // ONLINE PAYMENT GATEWAY LINK STATE
    const [openPaymentLinkModal, setOpenPaymentLinkModal] = useState(false)
    const [copiedPaymentLink, setCopiedPaymentLink] = useState(false)

    const getPortalPaymentUrl = () => {
        const origin = typeof window !== "undefined" ? window.location.origin : "https://erp.genesoft.ai"
        return `${origin}/portal/${invoice.id}?pay=true`
    }

    const handleCopyPaymentLink = () => {
        const url = getPortalPaymentUrl()
        if (typeof navigator !== "undefined" && navigator.clipboard) {
            navigator.clipboard.writeText(url)
        }
        setCopiedPaymentLink(true)
        setTimeout(() => setCopiedPaymentLink(false), 2500)
    }

    const handleRecordPayment = async (e: React.FormEvent) => {
        e.preventDefault()
        startTransition(async () => {
            const { error } = await createPayment({
                ...paymentFormsState, 
                amount: Number(paymentFormsState.amount)
            })
            if (error) {
                alert(`Error recording payment: ${error}`)
            } else {
                setOpenPaymentModal(false)
                // Reload page to re-fetch Server side properly
                router.refresh()
            }
        })
    }

    const handleDeletePayment = (paymentId: string) => {
        startTransition(async () => {
            const { error } = await deletePayment(paymentId)
            if (error) {
                alert(`Error deleting payment: ${error}`)
            } else {
                router.refresh()
            }
        })
    }

    const handleDeleteInvoice = () => {
        if (!confirm("Are you sure you want to delete this invoice?")) return
        startTransition(async () => {
            const { error } = await deleteInvoice(invoice.id)
            if (!error) {
                router.push("/sales/invoices")
            } else {
                alert(`Failed to delete invoice: ${error}`)
            }
        })
    }

    const handleConvertToInvoice = () => {
        if (!confirm(`Convert Proforma Invoice ${invoice.invoice_number} to an official GST Tax Invoice? This will generate the next official INV- sequence number.`)) {
            return
        }
        startTransition(async () => {
            const res = await convertProformaToInvoice(invoice.id)
            if (res.success) {
                alert(`Successfully converted to Tax Invoice: ${res.newInvoiceNumber}`)
                router.refresh()
            } else {
                alert(`Conversion failed: ${res.error}`)
            }
        })
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/sales/invoices")}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight">{invoice.invoice_number}</h1>
                            {invoice.type === "PROFORMA" && (
                                <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider text-xs px-2.5 py-0.5">
                                    PROFORMA INVOICE
                                </Badge>
                            )}
                            <Badge variant={getVariant(invoice.status) as any} className="uppercase px-2 h-6 tracking-wider font-semibold text-xs">
                                {invoice.status.replace('_', ' ')}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground mt-1">
                            Billed to <span className="font-semibold text-foreground">{invoice.customer_name}</span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm">
                            <Download className="mr-2 h-4 w-4" />
                            PDF
                        </Button>
                    </a>
                    <Button
                        variant="outline"
                        size="sm"
                        className="border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-semibold"
                        onClick={() => setOpenWhatsAppModal(true)}
                    >
                        <MessageSquare className="mr-1.5 h-4 w-4 text-emerald-600" />
                        WhatsApp
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="border-indigo-500/40 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 font-semibold"
                        onClick={() => setOpenPaymentLinkModal(true)}
                    >
                        <CreditCard className="mr-1.5 h-4 w-4 text-indigo-600" />
                        Pay Link
                    </Button>
                    {invoice.type === "PROFORMA" && (
                        <Button
                            size="sm"
                            variant="default"
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                            onClick={handleConvertToInvoice}
                            disabled={isPending}
                        >
                            <ArrowRightLeft className="mr-2 h-4 w-4" />
                            Convert to Tax Invoice
                        </Button>
                    )}
                    {invoice.type === "TAX_INVOICE" && (
                        ewayBillNo ? (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="border-emerald-500 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                                onClick={() => router.push("/sales/eway-bills")}
                            >
                                <Truck className="mr-2 h-4 w-4 text-emerald-600" />
                                EWB #{ewayBillNo}
                            </Button>
                        ) : (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className={totalInvoiceAmount >= 50000 ? "border-blue-400 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 font-semibold" : ""}
                                onClick={() => router.push("/sales/eway-bills")}
                            >
                                <Truck className="mr-2 h-4 w-4 text-blue-600" />
                                Generate E-Way Bill
                            </Button>
                        )
                    )}
                    <Button variant="outline" size="sm" onClick={() => router.push(`/sales/invoices/${invoice.id}/edit`)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDeleteInvoice} className="text-destructive hover:bg-destructive/10">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                    </Button>
                    <Button 
                        size="sm" 
                        disabled={balanceDue <= 0 || isPending}
                        onClick={() => setOpenPaymentModal(true)}
                    >
                        <CreditCard className="mr-2 h-4 w-4" />
                        Record Payment
                    </Button>
                </div>
            </div>

            {/* Rule 138 E-Way Bill Requirement Notice */}
            {invoice.type === "TAX_INVOICE" && totalInvoiceAmount >= 50000 && !ewayBillNo && (
                <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-amber-800 dark:text-amber-300">
                    <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-amber-600 shrink-0" />
                        <span>
                            <strong>Rule 138 Notice:</strong> Consignment value exceeds ₹50,000. Statutory Indian E-Way Bill is required before movement of goods.
                        </span>
                    </div>
                    <Button size="sm" variant="outline" className="h-7 text-xs bg-background text-amber-800 dark:text-amber-200 border-amber-300 shrink-0" onClick={() => router.push("/sales/eway-bills")}>
                        Create E-Way Bill &rarr;
                    </Button>
                </div>
            )}

            {/* Statutory Tax Exemption Notice */}
            {Boolean(invoice.is_tax_exempt) && (
                <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>
                            <strong>Statutory Tax Exemption:</strong> Supplied at 0.00% tax under exemption category{" "}
                            <span className="font-semibold">{invoice.tax_exemption_reason || "Statutory Exemption"}</span>
                            {invoice.tax_exemption_certificate && <span className="font-mono ml-1 font-medium">[{invoice.tax_exemption_certificate}]</span>}.
                        </span>
                    </div>
                    <Badge variant="outline" className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-400">
                        Tax Exempt (0.00%)
                    </Badge>
                </div>
            )}

            {/* Quick Stats Banner */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-muted/30">
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Total Amount</p>
                        <p className="text-xl font-bold">{formatCurrency(totalInvoiceAmount, invoice.currency_code)}</p>
                    </CardContent>
                </Card>
                <Card className="bg-emerald-500/10 border-emerald-500/20">
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wider mb-1">Amount Paid</p>
                        <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(totalPaid, invoice.currency_code)}
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-orange-500/10 border-orange-500/20">
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-orange-600 dark:text-orange-400 font-medium uppercase tracking-wider mb-1">Balance Due</p>
                        <p className="text-xl font-bold text-orange-700 dark:text-orange-400">
                          {formatCurrency(balanceDue, invoice.currency_code)}
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-muted/30">
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Due Date</p>
                        <p className="text-xl font-bold">{formatDate(invoice.valid_until)}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                
                {/* Information Column */}
                <div className="md:col-span-1 space-y-6">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <FileText className="h-4 w-4 text-primary" /> Invoice Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div className="grid grid-cols-2 gap-1 border-b pb-3">
                                <span className="text-muted-foreground">Invoice Date</span>
                                <span className="font-medium text-right">{formatDate(invoice.invoice_date)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1 border-b pb-3">
                                <span className="text-muted-foreground">Reference #</span>
                                <span className="font-medium text-right">{invoice.reference || "—"}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1 pb-1">
                                <span className="text-muted-foreground">Customer Email</span>
                                <span className="font-medium text-right break-words">{invoice.customer_email || "—"}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <IndianRupee className="h-4 w-4 text-primary" /> Line Items
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {(invoice.invoice_line_items ?? []).map((li, i) => (
                                    <div key={li.id || i} className="flex justify-between text-sm py-2 border-b last:border-0 last:pb-0">
                                        <div>
                                            <p className="font-medium">{li.product_name}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {li.qty} × {formatCurrency(li.unit_price, invoice.currency_code)}
                                            </p>
                                        </div>
                                        <div className="font-semibold text-right">
                                            {formatCurrency(li.qty * li.unit_price, invoice.currency_code)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Authorized Signatory Block */}
                    <Card className="border-primary/20 bg-muted/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Stamp className="h-4 w-4 text-primary" /> Authorized Signatory
                                </span>
                                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                                    Verified
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="rounded border border-dashed border-primary/30 p-3 bg-card text-center space-y-1">
                                <p className="text-xs font-semibold text-primary">For {invoice.tenants?.name || COMPANY.name}</p>
                                <div className="py-1">
                                    <Badge variant="secondary" className="text-[10px] font-mono tracking-wider">
                                        ✓ DIGITALLY AUTHENTICATED
                                    </Badge>
                                </div>
                                <p className="text-sm font-bold text-foreground">{invoice.signatory_name || "Authorized Representative"}</p>
                                <p className="text-xs text-muted-foreground">{invoice.signatory_designation || "Authorized Signatory"}</p>
                                <p className="text-[10px] text-muted-foreground pt-1">
                                    Date: {formatDate(invoice.invoice_date)}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Terms & Conditions */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Scale className="h-4 w-4 text-primary" /> Terms &amp; Conditions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {invoice.terms_and_conditions ? (
                                <div className="space-y-1 text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                                    {invoice.terms_and_conditions}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground italic">Standard commercial terms apply.</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Statutory Declaration */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-primary" /> Statutory Declaration
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                {invoice.declaration || "We declare that this invoice shows the actual price of the goods or services described and that all particulars are true and correct."}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Column */}
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Payment Ledger</CardTitle>
                            <CardDescription>History of receipts against this invoice.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {balanceDue > 0 && (
                                <div className="mb-4 p-3 rounded-lg border border-indigo-500/30 bg-indigo-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600">
                                            <CreditCard className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground text-xs">Online Payment Gateway</p>
                                            <p className="text-muted-foreground text-[11px]">Clients can pay outstanding {formatCurrency(balanceDue, invoice.currency_code)} directly via Stripe or PayPal checkout.</p>
                                        </div>
                                    </div>
                                    <Button size="sm" variant="outline" className="h-8 text-xs border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 shrink-0" onClick={() => setOpenPaymentLinkModal(true)}>
                                        <Link2 className="mr-1.5 h-3.5 w-3.5" />
                                        Share Pay Link
                                    </Button>
                                </div>
                            )}
                            {payments.length === 0 ? (
                                <div className="text-center p-8 border border-dashed rounded-lg bg-muted/20">
                                    <p className="text-muted-foreground">No payments recorded yet.</p>
                                    <Button 
                                        variant="link" 
                                        className="mt-2" 
                                        onClick={() => setOpenPaymentModal(true)}
                                        disabled={balanceDue <= 0}
                                    >
                                        Record the first payment
                                    </Button>
                                </div>
                            ) : (
                                <div className="rounded-md border bg-muted/10 overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                <TableHead>Date</TableHead>
                                                <TableHead>Method</TableHead>
                                                <TableHead>Ref</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                                <TableHead className="text-right w-16"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {payments.map(p => (
                                                <TableRow key={p.id}>
                                                    <TableCell className="font-medium">{formatDate(p.payment_date)}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="text-xs font-semibold uppercase">{p.payment_method.replace('_', ' ')}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">{p.reference || "—"}</TableCell>
                                                    <TableCell className="text-right font-medium text-emerald-600">
                                                        {formatCurrency(p.amount, invoice.currency_code)}
                                                    </TableCell>
                                                    <TableCell className="text-right p-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            disabled={isPending}
                                                            onClick={() => {
                                                                if (confirm("Delete this payment? Invoice status will recalculate.")) {
                                                                    handleDeletePayment(p.id)
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-destructive/80" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            <TableRow className="bg-muted/20 hover:bg-muted/20 border-t-2">
                                                <TableCell colSpan={3} className="font-semibold text-right">Total Paid</TableCell>
                                                <TableCell className="text-right font-bold text-emerald-700">{formatCurrency(totalPaid, invoice.currency_code)}</TableCell>
                                                <TableCell></TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* RECORD PAYMENT DIALOG */}
            <Dialog open={openPaymentModal} onOpenChange={setOpenPaymentModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Record Payment</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleRecordPayment} className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="amount">Amount *</Label>
                            <Input
                                id="amount"
                                type="number"
                                step="any"
                                max={balanceDue}
                                required
                                disabled={isPending}
                                value={paymentFormsState.amount}
                                onChange={(e) => setPaymentFormsState((s: CreatePaymentPayload) => ({ ...s, amount: Number(e.target.value) }))}
                            />
                            <p className="text-xs text-muted-foreground">Balance due: {formatCurrency(balanceDue, invoice.currency_code)}</p>
                        </div>
                        
                        <div className="grid gap-2">
                            <Label htmlFor="payment_date">Payment Date *</Label>
                            <Input
                                id="payment_date"
                                type="date"
                                required
                                disabled={isPending}
                                value={paymentFormsState.payment_date}
                                onChange={(e) => setPaymentFormsState((s: CreatePaymentPayload) => ({ ...s, payment_date: e.target.value }))}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="method">Payment Method *</Label>
                            <Select 
                                value={paymentFormsState.payment_method} 
                                onValueChange={(v) => setPaymentFormsState((s: CreatePaymentPayload) => ({ ...s, payment_method: v as PaymentMethod }))}
                                disabled={isPending}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select method" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                                    <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                                    <SelectItem value="DEBIT_CARD">Debit Card</SelectItem>
                                    <SelectItem value="UPI">UPI</SelectItem>
                                    <SelectItem value="CASH">Cash</SelectItem>
                                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                                    <SelectItem value="OTHER">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="reference">Reference / Transaction ID</Label>
                            <Input
                                id="reference"
                                type="text"
                                disabled={isPending}
                                value={paymentFormsState.reference || ""}
                                onChange={(e) => setPaymentFormsState((s: CreatePaymentPayload) => ({ ...s, reference: e.target.value }))}
                                placeholder="TRX-93821731..."
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                disabled={isPending}
                                value={paymentFormsState.notes || ""}
                                onChange={(e) => setPaymentFormsState((s: CreatePaymentPayload) => ({ ...s, notes: e.target.value }))}
                                placeholder="Additional details..."
                                rows={2}
                            />
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpenPaymentModal(false)} disabled={isPending}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isPending}>
                                Save Payment
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* WHATSAPP DISPATCH MODAL */}
            <Dialog open={openWhatsAppModal} onOpenChange={setOpenWhatsAppModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-emerald-600" />
                            Share Invoice via WhatsApp
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-3 text-xs">
                        <div className="grid gap-1.5">
                            <Label htmlFor="waPhone">Recipient Phone Number</Label>
                            <Input
                                id="waPhone"
                                value={whatsAppPhone}
                                onChange={(e) => setWhatsAppPhone(e.target.value)}
                                placeholder="+91 98765 43210"
                                className="font-mono text-xs"
                            />
                        </div>

                        <div className="grid gap-1.5">
                            <Label htmlFor="waTmpl">Message Template</Label>
                            <Select
                                value={whatsAppTemplate}
                                onValueChange={(v: any) => setWhatsAppTemplate(v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select template" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="INVOICE_DISPATCH">Standard Invoice & Payment Link</SelectItem>
                                    <SelectItem value="PAYMENT_OVERDUE_REMINDER">Payment Overdue Dunning Reminder</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="p-3 bg-muted/40 rounded-lg border space-y-1">
                            <span className="font-semibold text-muted-foreground text-[11px]">Message Preview:</span>
                            <p className="text-xs text-foreground bg-[#d9fdd3] text-emerald-950 dark:bg-emerald-900/60 dark:text-emerald-100 p-2.5 rounded-lg whitespace-pre-wrap">
                                {whatsAppTemplate === "INVOICE_DISPATCH"
                                    ? `Hello ${invoice.customer_name}, your invoice ${invoice.invoice_number} for ${invoice.currency_code || "INR"} ${totalInvoiceAmount.toFixed(2)} is ready. Due Date: ${formatDate(invoice.valid_until)}. View & pay online. Thank you!`
                                    : `Dear ${invoice.customer_name}, a reminder that invoice ${invoice.invoice_number} for ${invoice.currency_code || "INR"} ${totalInvoiceAmount.toFixed(2)} was due on ${formatDate(invoice.valid_until)}. Please settle the balance.`}
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="flex items-center justify-between sm:justify-between pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleOpenWhatsAppDirect}
                            className="text-xs"
                        >
                            <ExternalLink className="h-3.5 w-3.5 mr-1" />
                            Open Web
                        </Button>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setOpenWhatsAppModal(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleSendWhatsApp}
                                disabled={isSendingWhatsApp || !whatsAppPhone}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1"
                            >
                                {isSendingWhatsApp && <Loader2 className="h-3 w-3 animate-spin" />}
                                Send WhatsApp
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ONLINE PAYMENT LINK MODAL */}
            <Dialog open={openPaymentLinkModal} onOpenChange={setOpenPaymentLinkModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            <CreditCard className="h-5 w-5 text-indigo-600" />
                            Online Customer Payment Link
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <p className="text-sm text-muted-foreground">
                            Share this link with <span className="font-semibold text-foreground">{invoice.customer_name}</span> to collect payment online via Stripe (Cards, Apple Pay, Google Pay) or PayPal.
                        </p>

                        <div className="p-3 bg-muted/40 rounded-lg border space-y-2">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">Invoice Reference:</span>
                                <span className="font-medium">{invoice.invoice_number}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">Outstanding Balance:</span>
                                <span className="font-bold text-orange-600 dark:text-orange-400">
                                    {formatCurrency(balanceDue, invoice.currency_code)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">Supported Gateways:</span>
                                <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
                                    Stripe &bull; PayPal
                                </span>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Payment URL</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    readOnly
                                    value={getPortalPaymentUrl()}
                                    className="text-xs font-mono select-all bg-muted/30"
                                    onClick={(e) => (e.target as HTMLInputElement).select()}
                                />
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleCopyPaymentLink}
                                    className="shrink-0 font-semibold"
                                >
                                    {copiedPaymentLink ? (
                                        <>
                                            <Check className="h-4 w-4 mr-1.5 text-emerald-300" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-4 w-4 mr-1.5" />
                                            Copy Link
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        <div className="rounded-lg bg-indigo-50/70 dark:bg-indigo-950/30 p-3 border border-indigo-200 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-300 flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                            <span>
                                Once settled online, real-time webhooks automatically record the transaction and update this invoice&apos;s status to <strong>PAID</strong>.
                            </span>
                        </div>
                    </div>
                    <DialogFooter className="flex items-center justify-between sm:justify-between pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(getPortalPaymentUrl(), "_blank")}
                            className="text-xs"
                        >
                            <ExternalLink className="h-3.5 w-3.5 mr-1" />
                            Preview Portal
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="default"
                            onClick={() => setOpenPaymentLinkModal(false)}
                        >
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
