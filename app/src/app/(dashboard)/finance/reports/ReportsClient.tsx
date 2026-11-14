"use client"
import { useTaxRegime } from "@/hooks/use-tax-regime"
import { COMPLIANCE_MODULES_ENABLED } from "@/lib/features"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { getTaxJurisdiction } from "@/lib/tax-jurisdiction"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import type { PnlReport, MonthlyRevenue, CashFlowSummary, TopRevenueContact } from "@/app/actions/finance/reports"

const pct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`

const PERIOD_DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
/** "1 Jan 2026 – 31 Dec 2026" from the report's yyyy-mm-dd dates (UTC, so server and browser agree) */
const periodLabel = (start: string, end: string) => `${PERIOD_DATE.format(new Date(start))} – ${PERIOD_DATE.format(new Date(end))}`

interface ReportsClientProps {
  pnl: PnlReport
  monthly: MonthlyRevenue[]
  cashFlow: CashFlowSummary
  topContacts: TopRevenueContact[]
  selectedYear: number
  selectedQuarter: string
  /** The business's country, from the server, so tax labels are right on first paint */
  countryCode: string
  multiJurisdiction: boolean
}

/** One figure in the summary strip */
function Figure({ label, value, note, negative }: { label: string; value: string; note?: string; negative?: boolean }) {
  return (
    <div className="px-5 py-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${negative ? "text-destructive" : ""}`}>{value}</p>
      {note && <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>}
    </div>
  )
}

/** A label/amount line used in the P&L and cash-flow tables */
function Line({ label, value, strong, muted, negative, sub }: { label: string; value: string; strong?: boolean; muted?: boolean; negative?: boolean; sub?: string }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 px-6 py-2.5 ${strong ? "border-t font-semibold" : ""}`}>
      <div className="min-w-0">
        <p className={`text-sm ${muted ? "text-muted-foreground" : ""} ${strong ? "" : "pl-3"}`}>{label}</p>
        {sub && <p className="pl-3 text-xs text-muted-foreground">{sub}</p>}
      </div>
      <p className={`shrink-0 text-sm tabular-nums ${negative ? "text-destructive" : muted ? "text-muted-foreground" : ""}`}>{value}</p>
    </div>
  )
}

export default function ReportsClient({
  pnl, monthly, cashFlow, topContacts, selectedYear, selectedQuarter, countryCode, multiJurisdiction,
}: ReportsClientProps) {
  // Money in the business's own currency
  const { formatMoney } = useTaxRegime()
  const fmt = (n: number) => formatMoney(n + 0) // + 0 turns -0 into 0, so nothing shows as "-₹0.00"
  /** Amounts taken away are shown in brackets, the accounting way: (₹35,000.00) */
  const less = (n: number) => (n === 0 ? fmt(0) : `(${fmt(Math.abs(n))})`)
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const currentYear = new Date().getFullYear()
  const years = [currentYear, currentYear - 1, currentYear - 2]
  const jurisdiction = getTaxJurisdiction(countryCode)

  const handleFilter = (year: string, quarter: string) => {
    startTransition(() => {
      router.push(`/finance/reports?year=${year}&quarter=${quarter}`)
    })
  }

  const maxMonthly = Math.max(...monthly.map((m) => Math.max(m.revenue, m.expenses)), 1)
  const costLines = [
    { label: "Bills (services and other)", value: pnl.expenses.bills },
    { label: "Expenses", value: pnl.expenses.expenses },
    { label: "Payroll (gross pay)", value: pnl.expenses.payroll },
  ]
  const period = periodLabel(pnl.period.start, pnl.period.end)
  const workingCapital = cashFlow.openingAR - cashFlow.openingAP

  return (
    <div className="space-y-6">
      {/* Header: title, period, tax summary link */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">{period}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2" aria-busy={pending}>
          <Select value={selectedYear.toString()} onValueChange={(y) => handleFilter(y, selectedQuarter)}>
            <SelectTrigger className="w-[100px]" aria-label="Year"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedQuarter} onValueChange={(q) => handleFilter(selectedYear.toString(), q)}>
            <SelectTrigger className="w-[140px]" aria-label="Period"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="full">Full year</SelectItem>
              <SelectItem value="q1">Q1 (Jan–Mar)</SelectItem>
              <SelectItem value="q2">Q2 (Apr–Jun)</SelectItem>
              <SelectItem value="q3">Q3 (Jul–Sep)</SelectItem>
              <SelectItem value="q4">Q4 (Oct–Dec)</SelectItem>
            </SelectContent>
          </Select>
          <Button asChild variant="outline" className="gap-1.5">
            <Link href="/finance/tax-summary">
              {jurisdiction.taxLabel} Summary <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          {COMPLIANCE_MODULES_ENABLED && jurisdiction.financeTaxItems.map((item) => (
            <Button key={item.href} asChild variant="ghost">
              <Link href={item.href}>{item.shortName}</Link>
            </Button>
          ))}
          {multiJurisdiction && (
            <Button asChild variant="ghost">
              <Link href="/settings">Tax settings</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Summary strip: three figures, one card */}
      <Card className="grid grid-cols-1 gap-0 divide-y py-0 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Figure label="Revenue" value={fmt(pnl.revenue.total)} note="Sales before tax, less credit notes" />
        <Figure label="Costs" value={fmt(pnl.expenses.total)} note="Stock, bills, expenses and payroll" />
        <Figure
          label="Net profit"
          value={fmt(pnl.netProfit)}
          negative={pnl.netProfit < 0}
          note={pnl.revenue.total !== 0 ? `${pct(pnl.profitMargin)} margin` : undefined}
        />
      </Card>

      <Tabs defaultValue="pnl">
        <TabsList>
          <TabsTrigger value="pnl">Profit &amp; loss</TabsTrigger>
          <TabsTrigger value="trend">By month</TabsTrigger>
          <TabsTrigger value="cashflow">Cash flow</TabsTrigger>
        </TabsList>

        {/* Profit & loss */}
        <TabsContent value="pnl" className="mt-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2 gap-0 py-0">
              <CardHeader className="px-6 py-4">
                <CardTitle className="text-base">Profit &amp; loss statement</CardTitle>
              </CardHeader>
              <div className="pb-2">
                <Line label="Sales (before tax)" value={fmt(pnl.revenue.sales)} />
                <Line label="Less: credit notes" value={less(pnl.revenue.creditNotes)} muted={pnl.revenue.creditNotes === 0} />
                <Line label="Revenue" value={fmt(pnl.revenue.total)} strong />

                <Line label="Cost of goods sold" sub="Stock purchases" value={less(pnl.expenses.cogs)} muted={pnl.expenses.cogs === 0} />
                <Line label="Gross profit" value={fmt(pnl.grossProfit)} strong negative={pnl.grossProfit < 0} />

                {costLines.map((c) => (
                  <Line key={c.label} label={c.label} value={less(c.value)} muted={c.value === 0} />
                ))}
                <Line label="Operating costs" value={less(pnl.expenses.operating)} strong />

                <div className="mx-3 mt-2 flex items-baseline justify-between gap-4 rounded-md bg-muted px-3 py-3 font-semibold">
                  <p className="text-sm">Net profit / (loss)</p>
                  <p className={`text-base tabular-nums ${pnl.netProfit < 0 ? "text-destructive" : ""}`}>
                    {pnl.netProfit < 0 ? less(pnl.netProfit) : fmt(pnl.netProfit)}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="gap-0 py-0">
              <CardHeader className="px-6 py-4">
                <CardTitle className="text-base">Top customers</CardTitle>
                <CardDescription>Sales before tax in this period</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-6 pb-5">
                {topContacts.length === 0 ? (
                  <p className="py-4 text-sm text-muted-foreground">No invoices in this period yet.</p>
                ) : (
                  topContacts.map((c) => (
                    <div key={c.contactId}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <Link href={`/crm/contacts/${c.contactId}`} className="min-w-0 truncate font-medium hover:underline">
                          {c.displayName}
                        </Link>
                        <span className="shrink-0 tabular-nums">{fmt(c.revenue)}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted" aria-hidden="true">
                        <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.max(2, (c.revenue / (topContacts[0]?.revenue || 1)) * 100)}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{c.invoiceCount} invoice{c.invoiceCount !== 1 ? "s" : ""}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* By month */}
        <TabsContent value="trend" className="mt-4">
          <Card className="gap-0 py-0">
            <CardHeader className="px-6 py-4">
              <CardTitle className="text-base">Revenue and costs by month, {selectedYear}</CardTitle>
              <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" aria-hidden="true" /> Revenue</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-rose-400" aria-hidden="true" /> Costs</span>
              </div>
            </CardHeader>
            <div className="divide-y">
              {monthly.map((m) => (
                <div key={m.month} className="grid grid-cols-[3rem_1fr_auto] items-center gap-4 px-6 py-2.5">
                  <span className="text-sm text-muted-foreground">{m.month}</span>
                  <div className="space-y-1" aria-label={`Revenue ${fmt(m.revenue)}, costs ${fmt(m.expenses)}`}>
                    <div className="h-2 rounded-sm bg-emerald-500" style={{ width: `${m.revenue > 0 ? Math.max(1, (m.revenue / maxMonthly) * 100) : 0}%` }} />
                    <div className="h-2 rounded-sm bg-rose-400" style={{ width: `${m.expenses > 0 ? Math.max(1, (m.expenses / maxMonthly) * 100) : 0}%` }} />
                  </div>
                  <span className={`text-right text-sm tabular-nums ${m.profit < 0 ? "text-destructive" : m.profit === 0 ? "text-muted-foreground" : ""}`}>
                    {m.profit < 0 ? less(m.profit) : fmt(m.profit)}
                  </span>
                </div>
              ))}
            </div>
            <p className="px-6 py-3 text-xs text-muted-foreground border-t">The amount on the right is profit for the month; brackets mean a loss.</p>
          </Card>
        </TabsContent>

        {/* Cash flow */}
        <TabsContent value="cashflow" className="mt-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="gap-0 py-0">
              <CardHeader className="px-6 py-4">
                <CardTitle className="text-base">Cash in and out</CardTitle>
                <CardDescription>Payments received and made in this period</CardDescription>
              </CardHeader>
              <div className="pb-2">
                <Line label="Received from customers" value={fmt(cashFlow.cashIn)} />
                <Line label="Paid to suppliers" value={less(cashFlow.cashOut)} />
                <Line label="Net cash flow" value={cashFlow.netCashFlow < 0 ? less(cashFlow.netCashFlow) : fmt(cashFlow.netCashFlow)} strong negative={cashFlow.netCashFlow < 0} />
              </div>
            </Card>

            <Card className="gap-0 py-0">
              <CardHeader className="px-6 py-4">
                <CardTitle className="text-base">Working capital</CardTitle>
                <CardDescription>What is owed today, all periods</CardDescription>
              </CardHeader>
              <div className="pb-2">
                <Line label="Customers owe you" sub="Accounts receivable" value={fmt(cashFlow.openingAR)} />
                <Line label="You owe suppliers" sub="Accounts payable" value={less(cashFlow.openingAP)} />
                <Line label="Net working capital" value={workingCapital < 0 ? less(workingCapital) : fmt(workingCapital)} strong negative={workingCapital < 0} />
              </div>
              <p className="border-t px-6 py-3 text-xs text-muted-foreground">
                Above zero means customers owe you more than you owe suppliers. <Link href="/finance/receivable" className="underline underline-offset-2 hover:text-foreground">See who owes you</Link>
              </p>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
