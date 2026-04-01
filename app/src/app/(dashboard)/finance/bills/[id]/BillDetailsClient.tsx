"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CreditCard, Pencil, Trash2, FileText, Wallet, Calendar, User } from "lucide-react"

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
    DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

import { deleteBill } from "@/app/actions/finance/bills"
import { createPayment, deletePayment, CreatePaymentPayload, PaymentMethod } from "@/app/actions/finance/payments"

const formatCurrency = (amount: number, currency: string = "INR") =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(amount)

const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

interface Props {
    bill: any // BillDB with related data
}

export default function BillDetailsClient({ bill }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    
    // Status color mapping
    const getStatusVariant = (s: string) => {
      switch(s) {
        case "DRAFT": return "secondary"
        case "OPEN": return "default"
        case "PARTIALLY_PAID": return "secondary"
        case "PAID": return "default"
        case "VOID": return "destructive"
        default: return "default"
      }
    }

    const payments = bill.payments || []
    const totalBillAmount = Number(bill.total || 0)
    const totalPaid = payments.reduce((acc: number, p: any) => acc + Number(p.amount), 0)
    const balanceDue = Math.max(0, totalBillAmount - totalPaid)

    // PAYMENT FORM MODAL STATE
    const [openPaymentModal, setOpenPaymentModal] = useState(false)
    const [paymentFormsState, setPaymentFormsState] = useState<CreatePaymentPayload>({
        bill_id: bill.id,
        contact_id: bill.contact_id,
        amount: balanceDue,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: "BANK_TRANSFER",
        type: "OUTBOUND",
        reference: "",
        notes: "",
        currency_code: bill.currency_code || "INR"
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
                router.refresh()
            }
        })
    }

    const handleDeletePayment = (paymentId: string) => {
        if (!confirm("Are you sure you want to delete this payment?")) return
        startTransition(async () => {
            const { error } = await deletePayment(paymentId)
            if (error) {
                alert(`Error deleting payment: ${error}`)
            } else {
                router.refresh()
            }
        })
    }

    const handleDeleteBill = () => {
        if (!confirm("Are you sure you want to delete this bill?")) return
        startTransition(async () => {
            const { error } = await deleteBill(bill.id)
            if (!error) {
                router.push("/finance/bills")
            } else {
                alert(`Failed to delete bill: ${error}`)
            }
        })
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/finance/bills")}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight">{bill.bill_number}</h1>
                            <Badge variant={getStatusVariant(bill.status) as any} className="uppercase px-2 h-6 tracking-wider font-semibold text-xs">
                                {bill.status.replace('_', ' ')}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground mt-1 flex items-center gap-2">
                             Vendor: <span className="font-semibold text-foreground">{bill.contacts?.display_name}</span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => router.push(`/finance/bills/${bill.id}/edit`)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDeleteBill} className="text-destructive hover:bg-destructive/10">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                    </Button>
                    <Button 
                        size="sm" 
                        disabled={balanceDue <= 0 || isPending}
                        onClick={() => {
                            setPaymentFormsState(s => ({ ...s, amount: balanceDue }))
                            setOpenPaymentModal(true)
                        }}
                    >
                        <CreditCard className="mr-2 h-4 w-4" />
                        Pay Bill
                    </Button>
                </div>
            </div>

            {/* Quick Stats Banner */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Bill Amount</p>
                        <p className="text-xl font-bold">{formatCurrency(totalBillAmount, bill.currency_code)}</p>
                    </CardContent>
                </Card>
                <Card className="bg-emerald-500/10 border-emerald-500/20">
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wider mb-1">Paid</p>
                        <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(totalPaid, bill.currency_code)}
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-orange-500/10 border-orange-500/20 shadow-sm border-2">
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-orange-600 dark:text-orange-400 font-medium uppercase tracking-wider mb-1">Balance Due</p>
                        <p className="text-xl font-bold text-orange-700 dark:text-orange-400">
                          {formatCurrency(balanceDue, bill.currency_code)}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Due Date</p>
                        <p className="text-xl font-bold">{formatDate(bill.due_date)}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Information Column */}
                <div className="md:col-span-1 space-y-6">
                    <Card>
                        <CardHeader className="pb-3 border-b mb-4">
                            <CardTitle className="text-base flex items-center gap-2 font-bold">
                                <FileText className="h-4 w-4 text-primary" /> Bill Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div className="flex justify-between items-center pb-2 border-b">
                                <span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Bill Date</span>
                                <span className="font-medium">{formatDate(bill.bill_date)}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b">
                                <span className="text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> Vendor</span>
                                <span className="font-medium">{bill.contacts?.display_name}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Currency</span>
                                <span className="font-medium">{bill.currency_code}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3 border-b mb-4">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Wallet className="h-4 w-4 text-primary" /> Vendor Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-2">
                             <p className="font-semibold text-base">{bill.contacts?.company_name || bill.contacts?.display_name}</p>
                             <p className="text-muted-foreground">{bill.contacts?.email}</p>
                             <p className="text-muted-foreground">{bill.contacts?.phone}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Column */}
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Items & Services</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="pl-6">Description</TableHead>
                                        <TableHead className="text-right">Qty</TableHead>
                                        <TableHead className="text-right">Price</TableHead>
                                        <TableHead className="text-right pr-6">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(bill.bill_items || []).map((item: any) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="pl-6 font-medium">{item.description}</TableCell>
                                            <TableCell className="text-right">{Number(item.quantity)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(Number(item.unit_price), bill.currency_code)}</TableCell>
                                            <TableCell className="text-right pr-6 font-semibold">{formatCurrency(Number(item.line_total), bill.currency_code)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <div className="p-6 border-t bg-muted/20 flex flex-col items-end space-y-2">
                                <div className="flex justify-between w-full max-w-[200px] text-sm">
                                    <span className="text-muted-foreground">Subtotal:</span>
                                    <span>{formatCurrency(Number(bill.subtotal), bill.currency_code)}</span>
                                </div>
                                <div className="flex justify-between w-full max-w-[200px] text-sm">
                                    <span className="text-muted-foreground">Tax:</span>
                                    <span>{formatCurrency(Number(bill.tax_amount), bill.currency_code)}</span>
                                </div>
                                <div className="flex justify-between w-full max-w-[200px] text-lg font-bold border-t pt-2">
                                    <span>Total:</span>
                                    <span className="text-primary">{formatCurrency(totalBillAmount, bill.currency_code)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Payment History</CardTitle>
                            <CardDescription>Records of payments made towards this bill.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {(bill.payments || []).length === 0 ? (
                                <div className="text-center p-8 border border-dashed rounded-lg bg-muted/10">
                                    <p className="text-muted-foreground">No payments recorded for this bill.</p>
                                </div>
                            ) : (
                                <div className="rounded-md border overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Method</TableHead>
                                                <TableHead>Reference</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {bill.payments.map((p: any) => (
                                                <TableRow key={p.id}>
                                                    <TableCell>{formatDate(p.payment_date)}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{p.payment_method.replace('_', ' ')}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">{p.reference || "—"}</TableCell>
                                                    <TableCell className="text-right font-bold text-emerald-600">{formatCurrency(p.amount, bill.currency_code)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            disabled={isPending}
                                                            onClick={() => handleDeletePayment(p.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
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
                                onChange={(e) => setPaymentFormsState((s) => ({ ...s, amount: Number(e.target.value) }))}
                            />
                        </div>
                        
                        <div className="grid gap-2">
                            <Label htmlFor="payment_date">Payment Date *</Label>
                            <Input
                                id="payment_date"
                                type="date"
                                required
                                disabled={isPending}
                                value={paymentFormsState.payment_date}
                                onChange={(e) => setPaymentFormsState((s) => ({ ...s, payment_date: e.target.value }))}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="method">Payment Method *</Label>
                            <Select 
                                value={paymentFormsState.payment_method} 
                                onValueChange={(v) => setPaymentFormsState((s) => ({ ...s, payment_method: v as PaymentMethod }))}
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
                            <Label htmlFor="reference">Reference / ID</Label>
                            <Input
                                id="reference"
                                type="text"
                                value={paymentFormsState.reference || ""}
                                onChange={(e) => setPaymentFormsState((s) => ({ ...s, reference: e.target.value }))}
                                placeholder="UTR # or Check #"
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
