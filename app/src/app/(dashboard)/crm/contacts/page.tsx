"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Plus,
    Search,
    Filter,
    Download,
    Upload,
    MoreHorizontal,
    Mail,
    Phone,
    Building2,
    User,
    Pencil,
    Trash2,
    Receipt,
    Eye,
} from "lucide-react"
import { COUNTRIES } from "@/lib/constants/countries"
import { ContactFormDialog } from "@/components/crm/contact-form-dialog"

interface Contact {
    id: string
    displayName: string
    type: "INDIVIDUAL" | "COMPANY"
    email: string
    phone: string
    gstin: string
    pan: string
    customerGroup: string
    countryCode: string
    currencyCode: string
    balance: number
    isActive: boolean
}

const initialContacts: Contact[] = [
    {
        id: "1",
        displayName: "VM Edulife Private Limited",
        type: "COMPANY",
        email: "info@vmedulife.com",
        phone: "+91 20 1234 5678",
        gstin: "27AAECV5149A1ZH",
        pan: "AAECV5149A",
        customerGroup: "dealer",
        countryCode: "IN",
        currencyCode: "INR",
        balance: 52500,
        isActive: true,
    },
    {
        id: "2",
        displayName: "Rajesh Kumar",
        type: "INDIVIDUAL",
        email: "rajesh.kumar@gmail.com",
        phone: "+91 98765 43210",
        gstin: "",
        pan: "BKMPK1234A",
        customerGroup: "retail",
        countryCode: "IN",
        currencyCode: "INR",
        balance: 0,
        isActive: true,
    },
    {
        id: "3",
        displayName: "Al Noor Trading LLC",
        type: "COMPANY",
        email: "contact@alnoortrading.ae",
        phone: "+971 4 123 4567",
        gstin: "",
        pan: "",
        customerGroup: "dealer",
        countryCode: "AE",
        currencyCode: "AED",
        balance: 125000,
        isActive: true,
    },
    {
        id: "4",
        displayName: "Priya Sharma",
        type: "INDIVIDUAL",
        email: "priya.sharma@outlook.com",
        phone: "+91 87654 32109",
        gstin: "",
        pan: "CLMPS9876B",
        customerGroup: "dealer",
        countryCode: "IN",
        currencyCode: "INR",
        balance: 15750,
        isActive: true,
    },
    {
        id: "5",
        displayName: "Genesoft Infotech Pvt Ltd",
        type: "COMPANY",
        email: "info@genesoftinfotech.com",
        phone: "+91 20 4567 8901",
        gstin: "27AAICG9629C1ZF",
        pan: "AAICG9629C",
        customerGroup: "dealer",
        countryCode: "IN",
        currencyCode: "INR",
        balance: 0,
        isActive: true,
    },
]

const countryFlags: Record<string, string> = Object.fromEntries(
    COUNTRIES.map(c => [c.code, c.flag])
)

export default function ContactsPage() {
    const [contacts, setContacts] = useState<Contact[]>(initialContacts)
    const [searchQuery, setSearchQuery] = useState("")
    const [filterType, setFilterType] = useState<"all" | "INDIVIDUAL" | "COMPANY">("all")
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingContact, setEditingContact] = useState<Contact | null>(null)

    const filteredContacts = contacts.filter((c) => {
        const matchesSearch =
            c.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.gstin.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.pan.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesType = filterType === "all" || c.type === filterType
        return matchesSearch && matchesType
    })

    const handleCreate = () => {
        setEditingContact(null)
        setDialogOpen(true)
    }

    const handleEdit = (contact: Contact) => {
        setEditingContact(contact)
        setDialogOpen(true)
    }

    const handleDelete = (id: string) => {
        setContacts((prev) => prev.filter((c) => c.id !== id))
    }

    const handleSave = (data: any) => {
        const fullPhone = `${data.phoneDialCode} ${data.phone}`.trim()
        if (editingContact) {
            setContacts((prev) =>
                prev.map((c) =>
                    c.id === editingContact.id
                        ? { ...c, ...data, phone: fullPhone, displayName: data.displayName }
                        : c
                )
            )
        } else {
            const newContact: Contact = {
                id: Date.now().toString(),
                displayName: data.displayName,
                type: data.type,
                email: data.email,
                phone: fullPhone,
                gstin: data.gstin || "",
                pan: data.pan || "",
                customerGroup: data.customerGroup,
                countryCode: data.countryCode,
                currencyCode: data.currencyCode,
                balance: 0,
                isActive: true,
            }
            setContacts((prev) => [newContact, ...prev])
        }
    }

    const totalBalance = contacts.reduce((sum, c) => sum + c.balance, 0)

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage customers, vendors, and leads
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Import
                    </Button>
                    <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                    <Button size="sm" onClick={handleCreate}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Contact
                    </Button>
                </div>
            </div>

            {/* Stats Mini Cards */}
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

            {/* Filters Bar */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search by name, email, GSTIN, PAN..."
                                className="pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-1.5">
                            <Badge
                                variant={filterType === "all" ? "default" : "outline"}
                                className="cursor-pointer hover:bg-accent"
                                onClick={() => setFilterType("all")}
                            >
                                All ({contacts.length})
                            </Badge>
                            <Badge
                                variant={filterType === "COMPANY" ? "default" : "outline"}
                                className="cursor-pointer hover:bg-accent"
                                onClick={() => setFilterType("COMPANY")}
                            >
                                <Building2 className="h-3 w-3 mr-1" />
                                Companies
                            </Badge>
                            <Badge
                                variant={filterType === "INDIVIDUAL" ? "default" : "outline"}
                                className="cursor-pointer hover:bg-accent"
                                onClick={() => setFilterType("INDIVIDUAL")}
                            >
                                <User className="h-3 w-3 mr-1" />
                                Individuals
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Contacts Table */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base">All Contacts</CardTitle>
                        <CardDescription>
                            {filteredContacts.length} of {contacts.length} contacts
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>GSTIN / Tax ID</TableHead>
                                <TableHead>Group</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                                <TableHead className="w-10"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredContacts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                                        {searchQuery ? "No contacts match your search." : "No contacts yet. Create your first one!"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredContacts.map((contact) => (
                                    <TableRow key={contact.id} className="cursor-pointer hover:bg-muted/50">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium shrink-0">
                                                    {contact.displayName.charAt(0)}
                                                </div>
                                                <div>
                                                    <span className="font-medium">{contact.displayName}</span>
                                                    <div className="text-xs text-muted-foreground">
                                                        {countryFlags[contact.countryCode] || "🌐"} {contact.countryCode}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-xs">
                                                {contact.type === "COMPANY" ? (
                                                    <><Building2 className="h-3 w-3 mr-1" />Company</>
                                                ) : (
                                                    <><User className="h-3 w-3 mr-1" />Individual</>
                                                )}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                <Mail className="h-3 w-3 shrink-0" />
                                                <span className="truncate max-w-[160px]">{contact.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                <Phone className="h-3 w-3 shrink-0" />
                                                {contact.phone}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {contact.gstin ? (
                                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                                    {contact.gstin}
                                                </code>
                                            ) : contact.pan ? (
                                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                                    PAN: {contact.pan}
                                                </code>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="secondary"
                                                className={`capitalize text-xs ${contact.customerGroup === "vip"
                                                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                                    : ""
                                                    }`}
                                            >
                                                {contact.customerGroup}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {contact.balance > 0 ? (
                                                <span className="text-red-400">
                                                    {{ INR: "₹", AED: "د.إ", SAR: "﷼", USD: "$" }[contact.currencyCode] || "$"}
                                                    {contact.balance.toLocaleString("en-US")}
                                                </span>
                                            ) : (
                                                <span className="text-emerald-400">
                                                    {{ INR: "₹", AED: "د.إ", SAR: "﷼", USD: "$" }[contact.currencyCode] || "$"}0
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        View Details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleEdit(contact)}>
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem>
                                                        <Receipt className="mr-2 h-4 w-4" />
                                                        Create Invoice
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-red-500 focus:text-red-500"
                                                        onClick={() => handleDelete(contact.id)}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete
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

            {/* Contact Form Dialog */}
            <ContactFormDialog
                key={editingContact ? editingContact.id : "new"}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSave={handleSave}
                mode={editingContact ? "edit" : "create"}
                initialData={
                    editingContact
                        ? {
                            type: editingContact.type,
                            firstName: editingContact.displayName.split(" ")[0] || "",
                            lastName: editingContact.displayName.split(" ").slice(1).join(" "),
                            companyName: editingContact.displayName,
                            displayName: editingContact.displayName,
                            email: editingContact.email,
                            phoneDialCode: editingContact.phone.includes(" ") ? editingContact.phone.split(" ")[0] : "+91",
                            phone: editingContact.phone.includes(" ") ? editingContact.phone.split(" ").slice(1).join(" ") : editingContact.phone,
                            mobileDialCode: "+91",
                            mobile: "",
                            website: "",
                            customerGroup: editingContact.customerGroup,
                            countryCode: editingContact.countryCode,
                            currencyCode: editingContact.currencyCode,
                            gstin: editingContact.gstin || "",
                            pan: editingContact.pan || "",
                            cin: "",
                            tan: "",
                            msmeUdyam: "",
                            trn: "",
                            tradeLicense: "",
                            vatNumberKsa: "",
                            crNumber: "",
                            ein: "",
                            creditLimit: "",
                            billingStreet: "",
                            billingCity: "",
                            billingState: "",
                            billingZip: "",
                            billingCountry: "",
                            notes: "",
                        }
                        : undefined
                }
            />
        </div>
    )
}
