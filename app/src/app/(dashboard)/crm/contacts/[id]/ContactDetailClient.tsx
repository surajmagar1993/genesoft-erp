"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import {
  ArrowLeft, Pencil, Phone, Mail, Building2, Globe,
  IndianRupee, TrendingUp, TrendingDown, AlertTriangle,
  FileText, CreditCard, Download, Calendar, Banknote
} from "lucide-react"
import { useRouter } from "next/navigation"
import type { Contact } from "@/app/actions/crm/contacts"
import type { CustomerLedgerData, LedgerEntry } from "@/app/actions/crm/ledger"
import type { Task } from "@/app/actions/crm/tasks"
import type { CommunicationLog } from "@/app/actions/crm/communications"
import EntityTasks from "@/components/crm/EntityTasks"
import EntityCommunications from "@/components/crm/EntityCommunications"

import { formatCurrency } from "@/lib/utils"

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    })
}

interface Props {
  contact: Contact
  ledger: CustomerLedgerData
  initialTasks: Task[]
  initialLogs: CommunicationLog[]
}

export default function ContactDetailClient({ contact, ledger, initialTasks, initialLogs }: Props) {
  const router = useRouter()
  const { entries, summary } = ledger

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/crm/contacts")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{contact.display_name}</h1>
              <Badge variant="outline" className="capitalize">
                {contact.type?.toLowerCase() || "individual"}
              </Badge>
              {contact.customer_group && (
                <Badge variant="secondary" className="text-xs uppercase">
                  {contact.customer_group}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {contact.email || "No email"} • {contact.phone || "No phone"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/crm/contacts/${contact.id}/edit`)}>
            <Pencil className="h-4 w-4 mr-2" /> Edit
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Invoiced</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(summary.totalInvoiced, summary.currency)}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Paid</p>
                <p className="text-2xl font-bold mt-1 text-emerald-600">{formatCurrency(summary.totalPaid, summary.currency)}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Outstanding</p>
                <p className={`text-2xl font-bold mt-1 ${summary.outstandingBalance > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                  {formatCurrency(summary.outstandingBalance, summary.currency)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Banknote className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Overdue</p>
                <p className={`text-2xl font-bold mt-1 ${summary.overdueAmount > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                  {formatCurrency(summary.overdueAmount, summary.currency)}
                </p>
              </div>
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${summary.overdueAmount > 0 ? "bg-red-500/10" : "bg-muted"}`}>
                <AlertTriangle className={`h-5 w-5 ${summary.overdueAmount > 0 ? "text-red-500" : "text-muted-foreground"}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="ledger" className="w-full">
            <TabsList className="grid w-full grid-cols-4 max-w-[520px] bg-muted/50 border shadow-sm">
              <TabsTrigger value="ledger" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Ledger</TabsTrigger>
              <TabsTrigger value="overview" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Details</TabsTrigger>
              <TabsTrigger value="notes" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Notes</TabsTrigger>
              <TabsTrigger value="tasks" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Tasks</TabsTrigger>
            </TabsList>

            {/* LEDGER TAB */}
            <TabsContent value="ledger" className="mt-6">
              <Card className="shadow-sm border-muted/60">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-base">Customer Ledger</CardTitle>
                    <CardDescription>All invoices and payments for this customer</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {entries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 bg-muted/20 rounded-xl border-2 border-dashed border-muted/50">
                      <FileText className="h-8 w-8 text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground">No transactions found.</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Create an invoice to start tracking.</p>
                    </div>
                  ) : (
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead className="w-[100px]">Date</TableHead>
                            <TableHead className="w-[90px]">Type</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead className="text-right w-[120px]">Debit</TableHead>
                            <TableHead className="text-right w-[120px]">Credit</TableHead>
                            <TableHead className="text-right w-[130px]">Balance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {entries.map((entry) => (
                            <TableRow key={`${entry.type}-${entry.id}`} className="hover:bg-muted/20">
                              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                {formatDate(entry.date)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] h-5 uppercase px-1.5 ${
                                    entry.type === "INVOICE"
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  }`}
                                >
                                  {entry.type === "INVOICE" ? (
                                    <><FileText className="h-3 w-3 mr-1" /> INV</>
                                  ) : (
                                    <><CreditCard className="h-3 w-3 mr-1" /> PMT</>
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <span className="text-sm font-medium">{entry.reference}</span>
                                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">{entry.description}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm">
                                {entry.debit > 0 ? (
                                  <span className="text-red-600">{formatCurrency(entry.debit, entry.currency_code)}</span>
                                ) : (
                                  <span className="text-muted-foreground/40">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm">
                                {entry.credit > 0 ? (
                                  <span className="text-emerald-600">{formatCurrency(entry.credit, entry.currency_code)}</span>
                                ) : (
                                  <span className="text-muted-foreground/40">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm font-semibold">
                                <span className={entry.balance > 0 ? "text-amber-600" : entry.balance < 0 ? "text-emerald-600" : ""}>
                                  {formatCurrency(entry.balance, entry.currency_code)}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                          {/* Footer totals */}
                          <TableRow className="bg-muted/40 font-semibold border-t-2">
                            <TableCell colSpan={3} className="text-right text-sm">
                              Closing Balance
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm text-red-600">
                              {formatCurrency(summary.totalInvoiced, summary.currency)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm text-emerald-600">
                              {formatCurrency(summary.totalPaid, summary.currency)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              <span className={summary.outstandingBalance > 0 ? "text-amber-600" : "text-emerald-600"}>
                                {formatCurrency(summary.outstandingBalance, summary.currency)}
                              </span>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="mt-6">
              <Card className="shadow-sm border-muted/60">
                <CardHeader className="pb-0">
                  <CardTitle className="text-base">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="text-sm font-medium">{contact.email || "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Phone</p>
                          <p className="text-sm font-medium">{contact.phone || "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">GSTIN</p>
                          <p className="text-sm font-medium font-mono">{contact.gstin || "—"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Country</p>
                          <p className="text-sm font-medium">{contact.country_code || "IN"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Banknote className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Currency</p>
                          <p className="text-sm font-medium">{contact.currency_code || "INR"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Created</p>
                          <p className="text-sm font-medium">{formatDate(contact.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* NOTES TAB */}
            <TabsContent value="notes" className="mt-6">
              <Card className="shadow-sm border-muted/60">
                <CardHeader className="pb-0">
                  <CardTitle className="text-base">Communication Log</CardTitle>
                  <CardDescription>Track all interactions for this contact</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <EntityCommunications entityId={contact.id} entityType="contact" initialLogs={initialLogs} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* TASKS TAB */}
            <TabsContent value="tasks" className="mt-6">
              <Card className="shadow-sm border-muted/60">
                <CardHeader className="pb-0">
                  <CardTitle className="text-base">Tasks & Activities</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <EntityTasks entityId={contact.id} entityType="contact" initialTasks={initialTasks} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Quick Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Type</span>
                <Badge variant="outline" className="capitalize">{contact.type?.toLowerCase() || "individual"}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Group</span>
                <span className="text-sm font-medium capitalize">{contact.customer_group || "—"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={contact.is_active ? "default" : "secondary"}>
                  {contact.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">PAN</span>
                <span className="text-sm font-mono">{contact.pan || "—"}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Account Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Invoiced</span>
                <span className="text-sm font-medium">{formatCurrency(summary.totalInvoiced, summary.currency)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Paid</span>
                <span className="text-sm font-medium text-emerald-600">{formatCurrency(summary.totalPaid, summary.currency)}</span>
              </div>
              <hr className="border-border/50" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Balance Due</span>
                <span className={`text-sm font-bold ${summary.outstandingBalance > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                  {formatCurrency(summary.outstandingBalance, summary.currency)}
                </span>
              </div>
              {summary.overdueAmount > 0 && (
                <div className="flex justify-between items-center pt-1">
                  <span className="text-sm text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> Overdue
                  </span>
                  <span className="text-sm font-bold text-red-600">
                    {formatCurrency(summary.overdueAmount, summary.currency)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
