"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Search, Plus, Trash2, IndianRupee, CreditCard, Banknote, Calendar, Receipt } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { PaymentDB, deletePayment } from "@/app/actions/finance/payments"

/* ── Helpers ── */
const formatCurrency = (amount: number, currency: string = "INR") =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(amount)

const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

interface Props {
    payments: PaymentDB[]
}

export default function PaymentsClient({ payments: initialPayments }: Props) {
    const router = useRouter()
    const [payments, setPayments] = useState<PaymentDB[]>(initialPayments)
    const [searchQuery, setSearchQuery] = useState("")
    const [isPending, startTransition] = useTransition()

    const filteredPayments = payments.filter((p) => {
        const query = searchQuery.toLowerCase()
        const matchesRef = p.reference?.toLowerCase().includes(query)
        const matchesInvoice = p.invoices?.invoice_number?.toLowerCase().includes(query)
        const matchesBill = p.bills?.bill_number?.toLowerCase().includes(query)
        const matchesContact = p.contacts?.display_name?.toLowerCase().includes(query)
        return matchesRef || matchesInvoice || matchesBill || matchesContact
    })

    const handleDelete = (id: string) => {
        startTransition(async () => {
            const { error } = await deletePayment(id)
            if (!error) {
                setPayments((prev) => prev.filter((p) => p.id !== id))
            } else {
                alert(`Failed to delete payment: ${error}`)
            }
        })
    }

    const totalInbound = payments
        .filter(p => p.type === "INBOUND")
        .reduce((acc, p) => acc + Number(p.amount), 0)
    
    const totalOutbound = payments
        .filter(p => p.type === "OUTBOUND")
        .reduce((acc, p) => acc + Number(p.amount), 0)

    const thisMonthPayments = payments.filter(p => {
        const date = new Date(p.payment_date)
        const now = new Date()
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    }).reduce((acc, p) => acc + (p.type === "INBOUND" ? 1 : -1) * Number(p.amount), 0)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Payments Ledger</h1>
                    <p className="text-muted-foreground mt-1">Track payments received across invoices</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-emerald-500/5 border-emerald-500/20">
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2">
                            <IndianRupee className="h-4 w-4 text-emerald-500" />
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Inbound</p>
                        </div>
                        <p className="text-2xl font-bold mt-1 text-emerald-600">{formatCurrency(totalInbound)}</p>
                    </CardContent>
                </Card>
                <Card className="bg-orange-500/5 border-orange-500/20">
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2">
                            <IndianRupee className="h-4 w-4 text-orange-500" />
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Outbound</p>
                        </div>
                        <p className="text-2xl font-bold mt-1 text-orange-600">{formatCurrency(totalOutbound)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-blue-500" />
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Net Cash Flow (MoM)</p>
                        </div>
                        <p className={`text-2xl font-bold mt-1 ${thisMonthPayments >= 0 ? 'text-blue-600' : 'text-destructive'}`}>
                            {formatCurrency(thisMonthPayments)}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-purple-500" />
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Transactions</p>
                        </div>
                        <p className="text-2xl font-bold mt-1 text-purple-600">{payments.length}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search & Ledger */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-4 items-center justify-between mb-6">
                        <div className="relative max-w-sm w-full">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search reference, invoice #, customer..."
                                className="pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="rounded-md border bg-muted/30">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Ref #</TableHead>
                                    <TableHead>Entity (Customer/Vendor)</TableHead>
                                    <TableHead>Method</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPayments.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                            No payments found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredPayments.map((p) => {
                                        const isOutbound = p.type === "OUTBOUND"
                                        return (
                                            <TableRow key={p.id}>
                                                <TableCell className="font-medium whitespace-nowrap">{formatDate(p.payment_date)}</TableCell>
                                                <TableCell>
                                                    <Badge variant={isOutbound ? "outline" : "secondary"} className={`text-[10px] tracking-widest uppercase font-bold px-1.5 ${isOutbound ? 'border-orange-500 text-orange-600' : 'bg-emerald-500/10 text-emerald-700'}`}>
                                                        {isOutbound ? "Outbound" : "Inbound"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {p.invoice_id ? (
                                                        <span 
                                                          onClick={() => router.push(`/sales/invoices/${p.invoice_id}`)}
                                                          className="text-blue-600 hover:underline cursor-pointer font-medium"
                                                        >
                                                            {p.invoices?.invoice_number || "—"}
                                                        </span>
                                                    ) : p.bill_id ? (
                                                        <span 
                                                          onClick={() => router.push(`/finance/bills/${p.bill_id}`)}
                                                          className="text-orange-600 hover:underline cursor-pointer font-medium"
                                                        >
                                                            {p.bills?.bill_number || "—"}
                                                        </span>
                                                    ) : "—"}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-medium">{p.contacts?.display_name || p.contacts?.company_name || "—"}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="ghost" className="flex w-fit items-center gap-1.5 uppercase tracking-wider text-[10px] font-semibold text-muted-foreground p-0">
                                                        {p.payment_method === "BANK_TRANSFER" ? <Banknote className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
                                                        {p.payment_method.replace('_', ' ')}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className={`text-right font-bold ${isOutbound ? 'text-orange-600' : 'text-emerald-600'}`}>
                                                    {isOutbound ? "-" : ""}{formatCurrency(p.amount, p.currency_code)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        disabled={isPending}
                                                        onClick={() => {
                                                            if (confirm("Are you sure you want to delete this payment? Balance will be recalculated.")) {
                                                                handleDelete(p.id)
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
