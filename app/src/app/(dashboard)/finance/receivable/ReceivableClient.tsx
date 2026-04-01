"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowUpRight, 
  Clock, 
  AlertCircle, 
  TrendingUp, 
  ExternalLink,
  ChevronRight,
  Filter,
  Download
} from "lucide-react"
import Link from "next/link"
import { ReceivableSummary, DebtorSummary } from "@/app/actions/finance/receivable"

interface ReceivableClientProps {
  summary: ReceivableSummary
  debtors: DebtorSummary[]
}

export default function ReceivableClient({ summary, debtors }: ReceivableClientProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: summary.currency || "INR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const agingBuckets = [
    { label: "0-30 Days", value: summary.agingBuckets.current, color: "bg-blue-500" },
    { label: "31-60 Days", value: summary.agingBuckets.thirtyToSixty, color: "bg-amber-400" },
    { label: "61-90 Days", value: summary.agingBuckets.sixtyToNinety, color: "bg-orange-500" },
    { label: "90+ Days", value: summary.agingBuckets.ninetyPlus, color: "bg-red-600" },
  ]

  const maxBucketValue = Math.max(...agingBuckets.map(b => b.value), 1)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accounts Receivable</h1>
          <p className="text-muted-foreground">Manage and track outstanding customer balances.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" /> Export Report
          </Button>
          <Button size="sm">
            <Filter className="mr-2 h-4 w-4" /> Filter
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active across {debtors.length} customers
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-red-100 bg-red-50/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalOverdue)}</div>
            <p className="text-xs text-red-500/80 mt-1">
              {summary.totalOutstanding > 0 
                ? `${((summary.totalOverdue / summary.totalOutstanding) * 100).toFixed(1)}% of total debt`
                : "No outstanding debt"}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aging Bucket (90+)</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.agingBuckets.ninetyPlus)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              High risk collection
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Healthy Bucket (0-30)</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.agingBuckets.current)}</div>
            <p className="text-xs text-green-600 mt-1">
              Current receivables
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        {/* Aging Analysis Chart */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Aging Analysis</CardTitle>
            <CardDescription>Breakdown of debt by age</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {agingBuckets.map((bucket) => (
                <div key={bucket.label} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{bucket.label}</span>
                    <span className="text-muted-foreground">{formatCurrency(bucket.value)}</span>
                  </div>
                  <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${bucket.color} transition-all duration-1000 ease-out`}
                      style={{ width: `${(bucket.value / maxBucketValue) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 bg-muted/50 rounded-lg text-sm italic text-muted-foreground">
              Tip: Targeted follow-ups for the 61-90 day bucket can improve cash flow by up to 15%.
            </div>
          </CardContent>
        </Card>

        {/* Top Debtors Table */}
        <Card className="md:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Top Debtors</CardTitle>
              <CardDescription>Customers with highest outstanding balances</CardDescription>
            </div>
            <Link href="/crm/contacts">
              <Button variant="ghost" size="sm">
                View All <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Customer</TableHead>
                  <TableHead>Total Owed</TableHead>
                  <TableHead>Overdue</TableHead>
                  <TableHead className="text-right pr-6">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debtors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No active debtors found.
                    </TableCell>
                  </TableRow>
                ) : (
                  debtors.map((debtor) => (
                    <TableRow key={debtor.contactId} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="pl-6 font-medium">
                        {debtor.displayName}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(debtor.totalOwed)}
                      </TableCell>
                      <TableCell>
                        {debtor.overdue > 0 ? (
                          <Badge variant="destructive" className="font-normal">
                            {formatCurrency(debtor.overdue)} Overdue
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="font-normal text-muted-foreground">
                            Current
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Link href={`/crm/contacts/${debtor.contactId}`}>
                          <Button variant="ghost" size="icon" title="View Statement">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
