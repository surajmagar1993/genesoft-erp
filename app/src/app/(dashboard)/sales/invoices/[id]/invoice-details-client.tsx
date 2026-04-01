"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, ArrowLeft, Download, Send, CreditCard, Pencil, Trash2, Calendar, FileText, CheckCircle2, IndianRupee } from "lucide-react"

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

import { InvoiceDB, deleteInvoice, sendInvoiceEmail } from "@/app/actions/sales/invoices"
import { PaymentDB, createPayment, deletePayment, CreatePaymentPayload, PaymentMethod } from "@/app/actions/finance/payments"

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
            const { error } = await deletePayment(paymentId, invoice.id)
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
                </div>

                {/* Main Content Column */}
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Payment Ledger</CardTitle>
                            <CardDescription>History of receipts against this invoice.</CardDescription>
                        </CardHeader>
                        <CardContent>
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
        </div>
    )
}
