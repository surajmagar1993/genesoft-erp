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
} from "lucide-react"

// Placeholder data — will be replaced with real Supabase queries
const sampleContacts = [
    {
        id: "1",
        displayName: "VM Edulife Private Limited",
        type: "COMPANY",
        email: "info@vmedulife.com",
        phone: "+91 20 1234 5678",
        gstin: "27AAECV5149A1ZH",
        group: "wholesale",
        balance: 5000,
        status: "active",
    },
]

export default function ContactsPage() {
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
                    <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        New Contact
                    </Button>
                </div>
            </div>

            {/* Filters Bar */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search by name, email, GSTIN..."
                                className="pl-8"
                            />
                        </div>
                        <Button variant="outline" size="sm">
                            <Filter className="h-4 w-4 mr-2" />
                            Filters
                        </Button>
                        <div className="flex gap-1.5">
                            <Badge variant="outline" className="cursor-pointer hover:bg-accent">All</Badge>
                            <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                                <Building2 className="h-3 w-3 mr-1" />
                                Companies
                            </Badge>
                            <Badge variant="outline" className="cursor-pointer hover:bg-accent">
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
                        <CardDescription>{sampleContacts.length} total</CardDescription>
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
                                <TableHead>GSTIN</TableHead>
                                <TableHead>Group</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                                <TableHead className="w-10"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sampleContacts.map((contact) => (
                                <TableRow key={contact.id} className="cursor-pointer hover:bg-muted/50">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                                                {contact.displayName.charAt(0)}
                                            </div>
                                            <span className="font-medium">{contact.displayName}</span>
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
                                            <Mail className="h-3 w-3" />
                                            {contact.email}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                            <Phone className="h-3 w-3" />
                                            {contact.phone}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                            {contact.gstin}
                                        </code>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="capitalize text-xs">
                                            {contact.group}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        ₹{contact.balance.toLocaleString("en-IN")}
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem>View Details</DropdownMenuItem>
                                                <DropdownMenuItem>Edit</DropdownMenuItem>
                                                <DropdownMenuItem>Create Invoice</DropdownMenuItem>
                                                <DropdownMenuItem className="text-red-500">Delete</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
