"use client"

import { useState } from "react"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Search, 
  Plus, 
  Filter, 
  MoreHorizontal, 
  FileText, 
  Trash2, 
  ExternalLink,
  ArrowUpDown
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { deleteBill } from "@/app/actions/finance/bills"
import { toast } from "sonner"

interface BillsClientProps {
  bills: any[]
  total: number
}

export default function BillsClient({ bills, total }: BillsClientProps) {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredBills = bills.filter(bill => 
    bill.bill_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.contact?.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.contact?.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Paid</Badge>
      case "PARTIALLY_PAID":
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">Partial</Badge>
      case "OPEN":
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">Open</Badge>
      case "VOID":
        return <Badge variant="secondary">Void</Badge>
      default:
        return <Badge variant="outline">Draft</Badge>
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
    }).format(amount)
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this bill?")) {
      try {
        await deleteBill(id)
        toast.success("Bill deleted successfully")
      } catch (err) {
        toast.error("Failed to delete bill")
      }
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendor Bills</h1>
          <p className="text-muted-foreground">Manage your incoming invoices and payment schedules.</p>
        </div>
        <Link href="/finance/bills/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New Bill
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>All Bills</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search bills or vendors..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6 w-[150px]">Bill ID</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>
                  <div className="flex items-center gap-1 cursor-pointer hover:text-foreground">
                    Date <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBills.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No bills found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredBills.map((bill) => (
                  <TableRow key={bill.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="pl-6 font-medium">
                      {bill.bill_number}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{bill.contact?.display_name}</span>
                        {bill.contact?.company_name && (
                          <span className="text-xs text-muted-foreground">{bill.contact.company_name}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(bill.bill_date), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      {bill.due_date ? format(new Date(bill.due_date), "dd MMM yyyy") : "-"}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(bill.status)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(bill.total, bill.currency_code)}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/finance/bills/${bill.id}`}>
                              <FileText className="mr-2 h-4 w-4" /> View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/finance/bills/${bill.id}/edit`}>
                              <ExternalLink className="mr-2 h-4 w-4" /> Edit Bill
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600 focus:text-red-600"
                            onClick={() => handleDelete(bill.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
