"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Plus, Search, Filter, Download, Upload, MoreHorizontal,
    Mail, Phone, Building2, User, Pencil, Trash2, Receipt, Eye, Loader2,
} from "lucide-react"
import { deleteContact, type Contact } from "@/app/actions/crm/contacts"

interface Props {
    initialContacts: Contact[]
}

export default function ContactsClient({ initialContacts }: Props) {
    const router = useRouter()
    const [contacts, setContacts] = useState<Contact[]>(initialContacts)
    const [searchQuery, setSearchQuery] = useState("")
    const [filterType, setFilterType] = useState<"all" | "INDIVIDUAL" | "COMPANY">("all")
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [, startTransition] = useTransition()

    const filteredContacts = contacts.filter((c) => {
        const matchesSearch =
            c.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.email ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.gstin ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.pan ?? "").toLowerCase().includes(searchQuery.toLowerCase())
        const matchesType = filterType === "all" || c.type === filterType
        return matchesSearch && matchesType
    })

    const handleDelete = (id: string) => {
        setDeletingId(id)
        startTransition(async () => {
            const { error } = await deleteContact(id)
            if (!error) {
                setContacts((prev) => prev.filter((c) => c.id !== id))
            }
            setDeletingId(null)
        })
    }

    const totalBalance = contacts.reduce((sum, c) => sum + (c.balance ?? 0), 0)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
                    <p className="text-muted-foreground mt-1">Manage customers, vendors, and leads</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />Import
                    </Button>
                    <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />Export
                    </Button>
                    <Button size="sm" onClick={() => router.push("/crm/contacts/new")}>
                        <Plus className="h-4 w-4 mr-2" />New Contact
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-muted-foreground">Total Contacts</p>
                        <p className="text-2xl font-bold">{contacts.length}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-muted-foreground">Companies</p>
                        <p className="text-2xl font-bold">{contacts.filter((c) => c.type === "COMPANY").length}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-muted-foreground">Individuals</p>
                        <p className="text-2xl font-bold">{contacts.filter((c) => c.type === "INDIVIDUAL").length}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-muted-foreground">Total Outstanding</p>
                        <p className="text-2xl font-bold">₹{totalBalance.toLocaleString("en-IN")}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search contacts, emails, IDs..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button variant="outline" className="gap-2">
                    <Filter className="h-4 w-4" />Filter
                </Button>
                <div className="ml-auto flex gap-2">
                    <Badge variant={filterType === "all" ? "default" : "outline"} className="cursor-pointer" onClick={() => setFilterType("all")}>All</Badge>
                    <Badge variant={filterType === "COMPANY" ? "default" : "outline"} className="cursor-pointer" onClick={() => setFilterType("COMPANY")}>Companies</Badge>
                    <Badge variant={filterType === "INDIVIDUAL" ? "default" : "outline"} className="cursor-pointer" onClick={() => setFilterType("INDIVIDUAL")}>Individuals</Badge>
                </div>
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Contact</TableHead>
                            <TableHead>Contact Info</TableHead>
                            <TableHead>Tax IDs</TableHead>
                            <TableHead>Group</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredContacts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    No contacts found.
                                </TableCell>
                            </TableRow>
                        ) : filteredContacts.map((contact) => (
                            <TableRow key={contact.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                            {contact.type === "COMPANY" ? (
                                                <Building2 className="h-5 w-5 text-primary" />
                                            ) : (
                                                <User className="h-5 w-5 text-primary" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium leading-none">{contact.display_name}</p>
                                            <p className="text-sm text-muted-foreground capitalize mt-1">
                                                {contact.type.toLowerCase()}
                                            </p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="space-y-1">
                                        <div className="flex items-center text-sm">
                                            <Mail className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                            {contact.email}
                                        </div>
                                        <div className="flex items-center text-sm text-muted-foreground">
                                            <Phone className="mr-2 h-3.5 w-3.5" />
                                            {contact.phone}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="space-y-1 text-sm">
                                        {contact.gstin && (
                                            <div className="flex justify-between gap-4">
                                                <span className="text-muted-foreground">GST:</span>
                                                <span className="font-medium">{contact.gstin}</span>
                                            </div>
                                        )}
                                        {contact.pan && (
                                            <div className="flex justify-between gap-4">
                                                <span className="text-muted-foreground">PAN:</span>
                                                <span className="font-medium">{contact.pan}</span>
                                            </div>
                                        )}
                                        {!contact.gstin && !contact.pan && (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className="capitalize">
                                        {contact.customer_group}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                    {(contact.balance ?? 0) > 0 ? (
                                        <span className="text-destructive">₹{contact.balance.toLocaleString("en-IN")}</span>
                                    ) : (
                                        <span className="text-muted-foreground">₹0</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" disabled={deletingId === contact.id}>
                                                {deletingId === contact.id
                                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                                    : <MoreHorizontal className="h-4 w-4" />}
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem>
                                                <Eye className="h-4 w-4 mr-2" />View Details
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => router.push(`/crm/contacts/${contact.id}/edit`)}>
                                                <Pencil className="h-4 w-4 mr-2" />Edit Contact
                                            </DropdownMenuItem>
                                            <DropdownMenuItem>
                                                <Receipt className="h-4 w-4 mr-2" />View Transactions
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                className="text-destructive focus:text-destructive"
                                                onClick={() => handleDelete(contact.id)}
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />Delete Contact
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    )
}
