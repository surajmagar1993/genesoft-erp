"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, Search, MoreHorizontal, Globe, MapPin, Users, Pencil, Trash2, Eye, Loader2, Building2 } from "lucide-react"
import { deleteCompany, type Company } from "@/app/actions/crm/companies"

const countryFlags: Record<string, string> = { IN: "🇮🇳", AE: "🇦🇪", SA: "🇸🇦", US: "🇺🇸", GB: "🇬🇧" }

interface Props { initialCompanies: Company[] }

export default function CompaniesClient({ initialCompanies }: Props) {
    const router = useRouter()
    const [companies, setCompanies] = useState<Company[]>(initialCompanies)
    const [searchQuery, setSearchQuery] = useState("")
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [, startTransition] = useTransition()

    const filtered = companies.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.industry ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.city ?? "").toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleDelete = (id: string) => {
        setDeletingId(id)
        startTransition(async () => {
            const { error } = await deleteCompany(id)
            if (!error) setCompanies((prev) => prev.filter((c) => c.id !== id))
            setDeletingId(null)
        })
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

            <div className="grid gap-4 md:grid-cols-3">
                <Card><CardContent className="pt-4 pb-3">
                    <p className="text-xs text-muted-foreground">Total Companies</p>
                    <p className="text-2xl font-bold">{companies.length}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-4 pb-3">
                    <p className="text-xs text-muted-foreground">Active</p>
                    <p className="text-2xl font-bold">{companies.filter((c) => c.is_active).length}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-4 pb-3">
                    <p className="text-xs text-muted-foreground">Countries</p>
                    <p className="text-2xl font-bold">{new Set(companies.map((c) => c.country).filter(Boolean)).size}</p>
                </CardContent></Card>
            </div>

            <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search companies..." className="pl-8" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Company</TableHead>
                            <TableHead>Industry</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-10"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No companies found.</TableCell>
                            </TableRow>
                        ) : filtered.map((company) => (
                            <TableRow key={company.id} className="cursor-pointer hover:bg-muted/50">
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                                            {company.name.charAt(0)}
                                        </div>
                                        <div>
                                            <span className="font-medium">{company.name}</span>
                                            {company.website && (
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Globe className="h-3 w-3" /> {company.website}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {company.industry
                                        ? <Badge variant="outline" className="text-xs">{company.industry}</Badge>
                                        : <span className="text-muted-foreground text-xs">—</span>}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <MapPin className="h-3 w-3" />
                                        {company.city} {company.country ? countryFlags[company.country] ?? "" : ""}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="text-xs text-muted-foreground">
                                        {company.email || company.phone || "—"}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={company.is_active ? "default" : "secondary"} className="text-xs">
                                        {company.is_active ? "Active" : "Inactive"}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={deletingId === company.id}>
                                                {deletingId === company.id
                                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                                    : <MoreHorizontal className="h-4 w-4" />}
                                            </Button>
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
            </Card>
        </div>
    )
}
