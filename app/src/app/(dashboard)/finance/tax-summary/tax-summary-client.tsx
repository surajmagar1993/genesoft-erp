"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Percent, ArrowDownLeft, ArrowUpRight, Scale, Info } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getTaxSummary, type TaxSummaryReport } from "@/app/actions/finance/tax-summary"

const pad = (n: number) => String(n).padStart(2, "0")
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function presetRange(preset: "this-month" | "last-month" | "this-quarter" | "this-year") {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    switch (preset) {
        case "this-month": return { from: iso(new Date(y, m, 1)), to: iso(new Date(y, m + 1, 0)) }
        case "last-month": return { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) }
        case "this-quarter": {
            const q = Math.floor(m / 3) * 3
            return { from: iso(new Date(y, q, 1)), to: iso(new Date(y, q + 3, 0)) }
        }
        case "this-year": return { from: iso(new Date(y, 0, 1)), to: iso(new Date(y, 11, 31)) }
    }
}

export function TaxSummaryClient({ initial }: { initial: TaxSummaryReport }) {
    const [report, setReport] = useState(initial)
    const [from, setFrom] = useState(initial.from)
    const [to, setTo] = useState(initial.to)
    const [isPending, startTransition] = useTransition()

    const money = (n: number) =>
        new Intl.NumberFormat(report.locale, { style: "currency", currency: report.currency, maximumFractionDigits: 2 }).format(n)

    const load = (range: { from: string; to: string }) => {
        setFrom(range.from)
        setTo(range.to)
        startTransition(async () => {
            try {
                setReport(await getTaxSummary(range))
            } catch (err) {
                toast.error(err instanceof Error ? err.message : "Couldn't load the tax summary")
            }
        })
    }

    const isIndia = report.mode === "IN_GST"
    const label = report.taxLabel

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <Percent className="h-6 w-6 text-primary" /> {label} Summary
                </h1>
                <p className="text-sm text-muted-foreground">
                    {label} charged on sales, less credit notes and {label} paid on purchases, for the period you choose.
                    {report.taxId ? ` ${report.taxIdLabel}: ${report.taxId}.` : ` Add your ${report.taxIdLabel} in Settings → Organization.`}
                </p>
            </div>

            <Card>
                <CardContent className="p-4 flex flex-col md:flex-row md:items-end gap-3">
                    <div className="grid grid-cols-2 gap-3 flex-1 max-w-md">
                        <div className="space-y-1">
                            <Label htmlFor="from" className="text-xs">From</Label>
                            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="to" className="text-xs">To</Label>
                            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                        </div>
                    </div>
                    <Button onClick={() => load({ from, to })} disabled={isPending}>Show</Button>
                    <div className="flex flex-wrap gap-2">
                        {([["this-month", "This month"], ["last-month", "Last month"], ["this-quarter", "This quarter"], ["this-year", "This year"]] as const).map(([key, text]) => (
                            <Button key={key} variant="outline" size="sm" disabled={isPending} onClick={() => load(presetRange(key))}>{text}</Button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase"><ArrowUpRight className="h-4 w-4 text-emerald-600" /> {label} on sales</div>
                        <div className="text-2xl font-bold mt-1">{money(report.sales.tax - report.creditNotes.tax)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {report.sales.invoiceCount} invoice{report.sales.invoiceCount === 1 ? "" : "s"}
                            {report.creditNotes.count > 0 && `, less ${money(report.creditNotes.tax)} on ${report.creditNotes.count} credit note${report.creditNotes.count === 1 ? "" : "s"}`}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase"><ArrowDownLeft className="h-4 w-4 text-blue-600" /> {label} on purchases</div>
                        <div className="text-2xl font-bold mt-1">{money(report.purchases.tax)}</div>
                        <p className="text-xs text-muted-foreground mt-1">{report.purchases.billCount} bills, {report.purchases.expenseCount} expenses</p>
                    </CardContent>
                </Card>
                <Card className={report.netTaxPayable >= 0 ? "border-amber-500/40" : "border-emerald-500/40"}>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase"><Scale className="h-4 w-4" /> {report.netTaxPayable >= 0 ? `Net ${label} payable` : `Net ${label} refundable / carried forward`}</div>
                        <div className="text-2xl font-bold mt-1">{money(Math.abs(report.netTaxPayable))}</div>
                        <p className="text-xs text-muted-foreground mt-1">Sales {label} − credit notes − purchase {label}</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Sales by {label} rate</CardTitle>
                    <CardDescription>Taxable value and {label} from issued tax invoices in this period.</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Rate</TableHead>
                                <TableHead className="text-right">Taxable value</TableHead>
                                {isIndia && <TableHead className="text-right">CGST</TableHead>}
                                {isIndia && <TableHead className="text-right">SGST</TableHead>}
                                {isIndia && <TableHead className="text-right">IGST</TableHead>}
                                <TableHead className="text-right">Total {label}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {report.sales.byRate.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={isIndia ? 6 : 3} className="text-center text-sm text-muted-foreground py-8">No issued tax invoices in this period.</TableCell>
                                </TableRow>
                            )}
                            {report.sales.byRate.map((row) => (
                                <TableRow key={row.rate}>
                                    <TableCell className="font-medium">{row.rate}%</TableCell>
                                    <TableCell className="text-right">{money(row.taxable)}</TableCell>
                                    {isIndia && <TableCell className="text-right">{money(row.cgst)}</TableCell>}
                                    {isIndia && <TableCell className="text-right">{money(row.sgst)}</TableCell>}
                                    {isIndia && <TableCell className="text-right">{money(row.igst)}</TableCell>}
                                    <TableCell className="text-right font-semibold">{money(row.tax)}</TableCell>
                                </TableRow>
                            ))}
                            {report.sales.byRate.length > 0 && (
                                <TableRow className="bg-muted/30 font-semibold">
                                    <TableCell>Total</TableCell>
                                    <TableCell className="text-right">{money(report.sales.taxable)}</TableCell>
                                    {isIndia && <TableCell className="text-right">{money(report.sales.cgst)}</TableCell>}
                                    {isIndia && <TableCell className="text-right">{money(report.sales.sgst)}</TableCell>}
                                    {isIndia && <TableCell className="text-right">{money(report.sales.igst)}</TableCell>}
                                    <TableCell className="text-right">{money(report.sales.tax)}</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                    This is a working summary from your books, not a filed return. File with your tax authority (or your accountant) using these figures.
                    Direct filing will be added once Genesoft ERP is connected to the official {isIndia ? "GST" : label} systems.
                </p>
            </div>
        </div>
    )
}
