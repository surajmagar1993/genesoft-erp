"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { ArrowUpRight, ArrowDownLeft, Receipt, CreditCard, History } from "lucide-react"

interface LedgerEntry {
  id: string
  type: string
  amount: any
  balance: any
  referenceId: string | null
  description: string | null
  date: string | Date
}

interface LedgerTableProps {
  entries: LedgerEntry[]
}

export function LedgerTable({ entries }: LedgerTableProps) {
  if (!entries || entries.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <History className="h-12 w-12 mb-4 opacity-20" />
          <p>No ledger entries found for this contact.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Transaction History</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[150px]">Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className="text-right">Debit (+)</TableHead>
              <TableHead className="text-right">Credit (-)</TableHead>
              <TableHead className="text-right font-bold">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const amount = Number(entry.amount)
              const isDebit = amount > 0
              const isCredit = amount < 0

              return (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">
                    {format(new Date(entry.date), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                       {getTypeIcon(entry.type)}
                       <Badge variant="outline" className={getTypeColor(entry.type)}>
                         {entry.type.replace('_', ' ')}
                       </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs uppercase opacity-70">
                    {entry.referenceId || "—"}
                  </TableCell>
                  <TableCell className="text-right text-red-600 font-medium">
                    {isDebit ? `+${Math.abs(amount).toLocaleString()}` : ""}
                  </TableCell>
                  <TableCell className="text-right text-green-600 font-medium">
                    {isCredit ? `-${Math.abs(amount).toLocaleString()}` : ""}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {Number(entry.balance).toLocaleString()}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function getTypeIcon(type: string) {
  switch (type) {
    case "INVOICE": return <Receipt className="h-4 w-4 text-orange-500" />
    case "PAYMENT": return <CreditCard className="h-4 w-4 text-green-500" />
    case "REFUND": return <ArrowUpRight className="h-4 w-4 text-blue-500" />
    case "CREDIT_NOTE": return <ArrowDownLeft className="h-4 w-4 text-purple-500" />
    default: return <History className="h-4 w-4 text-gray-500" />
  }
}

function getTypeColor(type: string) {
  switch (type) {
    case "INVOICE": return "bg-orange-50 text-orange-700 border-orange-200"
    case "PAYMENT": return "bg-green-50 text-green-700 border-green-200"
    case "REFUND": return "bg-blue-50 text-blue-700 border-blue-200"
    case "CREDIT_NOTE": return "bg-purple-50 text-purple-700 border-purple-200"
    default: return "bg-gray-50 text-gray-700 border-gray-200"
  }
}
