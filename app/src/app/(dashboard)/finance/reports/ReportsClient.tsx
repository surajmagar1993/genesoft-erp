"use client"

import { useState, useMemo, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  TrendingUp, TrendingDown, DollarSign, Wallet, ArrowUpRight,
  ArrowDownRight, BarChart3, FileText, Droplets, Users,
  RefreshCw, Download
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"

import type {
  PnlReport, MonthlyRevenue, CashFlowSummary, TopRevenueContact
} from "@/app/actions/finance/reports"

/* ── Formatters ── */
const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)

const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`

/* ── Simple bar component ── */
function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const width = max > 0 ? Math.max(2, (value / max) * 100) : 0
  return (
    <div className="w-full bg-muted rounded-full h-1.5 mt-1">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${width}%` }} />
    </div>
  )
}

/* ── Props ── */
interface ReportsClientProps {
  pnl: PnlReport
  monthly: MonthlyRevenue[]
  cashFlow: CashFlowSummary
  topContacts: TopRevenueContact[]
  selectedYear: number
  selectedQuarter: string
}

export default function ReportsClient({
  pnl, monthly, cashFlow, topContacts, selectedYear, selectedQuarter
}: ReportsClientProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const currentYear = new Date().getFullYear()
  const years = [currentYear, currentYear - 1, currentYear - 2]

  const handleFilter = (year: string, quarter: string) => {
    startTransition(() => {
      router.push(`/finance/reports?year=${year}&quarter=${quarter}`)
    })
  }

  /* ── Monthly chart max for scaling ── */
  const maxMonthly = useMemo(
    () => Math.max(...monthly.map(m => Math.max(m.revenue, m.expenses)), 1),
    [monthly]
  )

  /* ── P&L rows ── */
  const pnlRows = [
    { label: "Sales Revenue", value: pnl.revenue.sales, type: "revenue" },
    { label: "Other Income", value: pnl.revenue.other, type: "revenue" },
    { label: "Total Revenue", value: pnl.revenue.total, type: "total", bold: true },
    { label: "Cost of Goods Sold (COGS)", value: -pnl.expenses.cogs, type: "expense" },
    { label: "Gross Profit", value: pnl.grossProfit, type: "gross", bold: true },
    { label: "Operating Expenses", value: -pnl.expenses.operating, type: "expense" },
    { label: "Net Profit / (Loss)", value: pnl.netProfit, type: "net", bold: true, highlight: true },
  ]

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Profit & Loss, Revenue Trends, and Cash Flow Analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedYear.toString()}
            onValueChange={(y) => handleFilter(y, selectedQuarter)}
          >
            <SelectTrigger className="w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedQuarter}
            onValueChange={(q) => handleFilter(selectedYear.toString(), q)}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full">Full Year</SelectItem>
              <SelectItem value="q1">Q1 (Jan–Mar)</SelectItem>
              <SelectItem value="q2">Q2 (Apr–Jun)</SelectItem>
              <SelectItem value="q3">Q3 (Jul–Sep)</SelectItem>
              <SelectItem value="q4">Q4 (Oct–Dec)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-700">Total Revenue</p>
                <p className="text-2xl font-bold text-emerald-900 mt-1">{fmt(pnl.revenue.total)}</p>
              </div>
              <div className="p-2 bg-emerald-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-100">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-red-700">Total Expenses</p>
                <p className="text-2xl font-bold text-red-900 mt-1">{fmt(pnl.expenses.total)}</p>
              </div>
              <div className="p-2 bg-red-100 rounded-lg">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br border ${pnl.netProfit >= 0
          ? "from-blue-50 to-indigo-50 border-blue-100"
          : "from-rose-50 to-red-50 border-rose-100"}`}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-xs font-medium ${pnl.netProfit >= 0 ? "text-blue-700" : "text-rose-700"}`}>
                  Net Profit
                </p>
                <p className={`text-2xl font-bold mt-1 ${pnl.netProfit >= 0 ? "text-blue-900" : "text-rose-900"}`}>
                  {fmt(pnl.netProfit)}
                </p>
              </div>
              <div className={`p-2 rounded-lg ${pnl.netProfit >= 0 ? "bg-blue-100" : "bg-rose-100"}`}>
                <DollarSign className={`h-5 w-5 ${pnl.netProfit >= 0 ? "text-blue-600" : "text-rose-600"}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-50 to-purple-50 border-violet-100">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-violet-700">Profit Margin</p>
                <p className={`text-2xl font-bold mt-1 ${pnl.profitMargin >= 0 ? "text-violet-900" : "text-rose-700"}`}>
                  {pct(pnl.profitMargin)}
                </p>
              </div>
              <div className="p-2 bg-violet-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabbed Reports ── */}
      <Tabs defaultValue="pnl">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="pnl" className="gap-2">
            <FileText className="h-4 w-4" /> P&L Statement
          </TabsTrigger>
          <TabsTrigger value="trend" className="gap-2">
            <BarChart3 className="h-4 w-4" /> Revenue Trend
          </TabsTrigger>
          <TabsTrigger value="cashflow" className="gap-2">
            <Droplets className="h-4 w-4" /> Cash Flow
          </TabsTrigger>
        </TabsList>

        {/* ── P&L Tab ── */}
        <TabsContent value="pnl" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle>Profit & Loss Statement</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {pnl.period.start} → {pnl.period.end}
                    </Badge>
                  </div>
                  <CardDescription>Income and expenditure for the selected period</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="pl-6">Line Item</TableHead>
                        <TableHead className="text-right pr-6">Amount (INR)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pnlRows.map((row, i) => (
                        <TableRow
                          key={i}
                          className={
                            row.highlight
                              ? row.value >= 0
                                ? "bg-emerald-50/60 font-bold"
                                : "bg-red-50/60 font-bold"
                              : row.bold
                              ? "bg-muted/30 font-semibold"
                              : ""
                          }
                        >
                          <TableCell className="pl-6 py-3">
                            {!row.bold && <span className="mr-2 text-muted-foreground">·</span>}
                            {row.label}
                          </TableCell>
                          <TableCell className={`text-right pr-6 py-3 font-mono ${
                            row.value < 0 ? "text-red-600" :
                            row.type === "net" && row.value >= 0 ? "text-emerald-700" :
                            row.type === "gross" ? "text-blue-700" : ""
                          }`}>
                            {row.value < 0 ? `(${fmt(Math.abs(row.value))})` : fmt(row.value)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* ── Top Revenue Contacts ── */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Top Revenue Customers
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {topContacts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No data available</p>
                  ) : (
                    topContacts.map((c, i) => (
                      <div key={c.contactId} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 font-medium">
                            <span className="text-xs text-muted-foreground w-4">#{i + 1}</span>
                            {c.displayName}
                          </span>
                          <span className="font-semibold text-emerald-700">{fmt(c.revenue)}</span>
                        </div>
                        <MiniBar
                          value={c.revenue}
                          max={topContacts[0]?.revenue ?? 1}
                          color="bg-emerald-400"
                        />
                        <p className="text-xs text-muted-foreground">{c.invoiceCount} invoice{c.invoiceCount !== 1 ? "s" : ""}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── Revenue Trend Tab ── */}
        <TabsContent value="trend" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Revenue vs Expenses — {selectedYear}</CardTitle>
              <CardDescription>Month-by-month performance for the full year</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Bar Chart — pure CSS, no recharts dependency */}
              <div className="space-y-3">
                {monthly.map((m) => (
                  <div key={m.month} className="grid grid-cols-[50px_1fr_1fr_90px] gap-3 items-center">
                    <span className="text-xs font-medium text-muted-foreground">{m.month}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <div
                          className="h-5 rounded bg-emerald-500/80 transition-all"
                          style={{ width: `${maxMonthly > 0 ? Math.max(4, (m.revenue / maxMonthly) * 200) : 4}px` }}
                        />
                        <span className="text-xs text-muted-foreground">{fmt(m.revenue)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div
                          className="h-5 rounded bg-red-400/70 transition-all"
                          style={{ width: `${maxMonthly > 0 ? Math.max(4, (m.expenses / maxMonthly) * 200) : 4}px` }}
                        />
                        <span className="text-xs text-muted-foreground">{fmt(m.expenses)}</span>
                      </div>
                    </div>
                    <div />
                    <div className="text-right">
                      <span className={`text-xs font-semibold ${m.profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {m.profit >= 0 ? "▲" : "▼"} {fmt(Math.abs(m.profit))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Legend */}
              <div className="flex items-center gap-6 mt-6 pt-4 border-t">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-3 h-3 rounded bg-emerald-500/80" /> Revenue
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-3 h-3 rounded bg-red-400/70" /> Expenses
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="text-emerald-600 font-bold">▲</span> / <span className="text-red-500 font-bold">▼</span> Net Profit
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Cash Flow Tab ── */}
        <TabsContent value="cashflow" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cash Flow Summary</CardTitle>
                <CardDescription>Payments received vs paid in the period</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Cash In */}
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <ArrowUpRight className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-emerald-800">Cash Received</p>
                      <p className="text-xs text-emerald-600/80">Customer payments collected</p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-emerald-700">{fmt(cashFlow.cashIn)}</p>
                </div>

                {/* Cash Out */}
                <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <ArrowDownRight className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-red-800">Cash Paid Out</p>
                      <p className="text-xs text-red-600/80">Vendor & bill payments made</p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-red-700">{fmt(cashFlow.cashOut)}</p>
                </div>

                {/* Net */}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                  cashFlow.netCashFlow >= 0
                    ? "bg-blue-50 border-blue-100"
                    : "bg-rose-50 border-rose-100"
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${cashFlow.netCashFlow >= 0 ? "bg-blue-100" : "bg-rose-100"}`}>
                      <Wallet className={`h-5 w-5 ${cashFlow.netCashFlow >= 0 ? "text-blue-600" : "text-rose-600"}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${cashFlow.netCashFlow >= 0 ? "text-blue-800" : "text-rose-800"}`}>
                        Net Cash Flow
                      </p>
                      <p className={`text-xs ${cashFlow.netCashFlow >= 0 ? "text-blue-600/80" : "text-rose-600/80"}`}>
                        {cashFlow.period.start} → {cashFlow.period.end}
                      </p>
                    </div>
                  </div>
                  <p className={`text-xl font-bold ${cashFlow.netCashFlow >= 0 ? "text-blue-700" : "text-rose-700"}`}>
                    {cashFlow.netCashFlow >= 0 ? "" : "-"}{fmt(Math.abs(cashFlow.netCashFlow))}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Working Capital Snapshot */}
            <Card>
              <CardHeader>
                <CardTitle>Working Capital Snapshot</CardTitle>
                <CardDescription>Current outstanding balances (all time)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-3 border-b">
                    <div>
                      <p className="text-sm font-medium">Accounts Receivable</p>
                      <p className="text-xs text-muted-foreground">Money owed to you by customers</p>
                    </div>
                    <span className="text-lg font-bold text-emerald-600">{fmt(cashFlow.openingAR)}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b">
                    <div>
                      <p className="text-sm font-medium">Accounts Payable</p>
                      <p className="text-xs text-muted-foreground">Money you owe to vendors</p>
                    </div>
                    <span className="text-lg font-bold text-red-600">{fmt(cashFlow.openingAP)}</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-semibold">Net Working Capital</p>
                      <p className="text-xs text-muted-foreground">AR minus AP</p>
                    </div>
                    <span className={`text-lg font-bold ${
                      cashFlow.openingAR - cashFlow.openingAP >= 0 ? "text-blue-700" : "text-rose-600"
                    }`}>
                      {fmt(cashFlow.openingAR - cashFlow.openingAP)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-100">
                  <p className="text-xs text-amber-800 leading-relaxed">
                    <strong>💡 Tip:</strong> Positive working capital means you have more money owed to you than you owe — a healthy sign. Aim to keep AR low by following up on overdue invoices.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
