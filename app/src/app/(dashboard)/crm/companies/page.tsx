"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Plus, Search, MoreHorizontal, Globe, MapPin, Users, Pencil, Trash2, Eye,
} from "lucide-react"

interface Company {
    id: string
    name: string
    industry: string
    website: string
    phone: string
    city: string
    gstin: string
    contactCount: number
    dealValue: number
    countryCode: string
}

const initialCompanies: Company[] = [
    { id: "1", name: "VM Edulife Private Limited", industry: "Education & Technology", website: "vmedulife.com", phone: "+91 20 1234 5678", city: "Pune", gstin: "27AAECV5149A1ZH", contactCount: 3, dealValue: 250000, countryCode: "IN" },
    { id: "2", name: "Genesoft Infotech Pvt Ltd", industry: "IT Services", website: "genesoftinfotech.com", phone: "+91 20 4567 8901", city: "Pune", gstin: "27AAICG9629C1ZF", contactCount: 5, dealValue: 0, countryCode: "IN" },
    { id: "3", name: "Al Noor Trading LLC", industry: "Import & Export", website: "alnoortrading.ae", phone: "+971 4 123 4567", city: "Dubai", gstin: "", contactCount: 2, dealValue: 525000, countryCode: "AE" },
    { id: "4", name: "TechCorp Solutions", industry: "Software Development", website: "techcorp.com", phone: "+1 555 123 4567", city: "San Francisco", gstin: "", contactCount: 1, dealValue: 180000, countryCode: "US" },
]

const countryFlags: Record<string, string> = { IN: "🇮🇳", AE: "🇦🇪", SA: "🇸🇦", US: "🇺🇸" }

export default function CompaniesPage() {
    const router = useRouter()
    const [companies, setCompanies] = useState(initialCompanies)
    const [searchQuery, setSearchQuery] = useState("")

    const filtered = companies.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.city.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleDelete = (id: string) => {
        setCompanies((prev) => prev.filter((c) => c.id !== id))
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
                    <p className="text-muted-foreground mt-1">Manage business accounts and organizations</p>
                </div>
                <Button size="sm" onClick={() => router.push("/crm/companies/new")}>
                    <Plus className="h-4 w-4 mr-2" /> New Company
                </Button>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-muted-foreground">Total Companies</p>
                        <p className="text-2xl font-bold">{companies.length}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-muted-foreground">Total Contacts</p>
                        <p className="text-2xl font-bold">{companies.reduce((s, c) => s + c.contactCount, 0)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-muted-foreground">Total Deal Value</p>
                        <p className="text-2xl font-bold text-primary">₹{companies.reduce((s, c) => s + c.dealValue, 0).toLocaleString("en-IN")}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <Card>
                <CardContent className="pt-6">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search companies..." className="pl-8" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base">All Companies</CardTitle>
                        <CardDescription>{filtered.length} results</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Company</TableHead>
                                <TableHead>Industry</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>GSTIN / Tax ID</TableHead>
                                <TableHead className="text-center">Contacts</TableHead>
                                <TableHead className="text-right">Deal Value</TableHead>
                                <TableHead className="w-10"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((company) => (
                                <TableRow key={company.id} className="cursor-pointer hover:bg-muted/50">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white text-sm font-medium shrink-0">
                                                {company.name.charAt(0)}
                                            </div>
                                            <div>
                                                <span className="font-medium">{company.name}</span>
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Globe className="h-3 w-3" /> {company.website}
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell><Badge variant="outline" className="text-xs">{company.industry}</Badge></TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                            <MapPin className="h-3 w-3" /> {company.city} {countryFlags[company.countryCode]}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {company.gstin ? (
                                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{company.gstin}</code>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <Users className="h-3 w-3 text-muted-foreground" />
                                            <span className="text-sm">{company.contactCount}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        {company.dealValue > 0 ? `₹${company.dealValue.toLocaleString("en-IN")}` : "—"}
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem><Eye className="mr-2 h-4 w-4" />View</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => router.push(`/crm/companies/${company.id}/edit`)}>
                                                    <Pencil className="mr-2 h-4 w-4" />Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-red-500" onClick={() => handleDelete(company.id)}>
                                                    <Trash2 className="mr-2 h-4 w-4" />Delete
                                                </DropdownMenuItem>
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
