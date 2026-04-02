"use client"

import { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import Papa from "papaparse"
import { Search, Plus, Pencil, Trash2, Package, Wrench, CheckCircle2, AlertCircle, Loader2, Download, Upload } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ProductDB, deleteProduct, importProducts, exportProducts } from "@/app/actions/sales/products"

interface ProductsClientProps {
    initialProducts: ProductDB[]
    total: number
}

export function ProductsClient({ initialProducts, total }: ProductsClientProps) {
    const router = useRouter()
    const [products, setProducts] = useState<ProductDB[]>(initialProducts)
    const [searchQuery, setSearchQuery] = useState("")
    const [filterType, setFilterType] = useState<"all" | "PRODUCT" | "SERVICE">("all")
    const [isDeleting, setIsDeleting] = useState<string | null>(null)
    const [isExporting, setIsExporting] = useState(false)
    const [isImporting, setIsImporting] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [, startTransition] = useTransition()

    const filteredProducts = products.filter((p) => {
        const matchesSearch =
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.sku?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
            (p.hsn_sac_code?.toLowerCase() || "").includes(searchQuery.toLowerCase())
        const matchesType = filterType === "all" || p.type === filterType
        return matchesSearch && matchesType
    })

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this item?")) return
        
        setIsDeleting(id)
        const { error } = await deleteProduct(id)
        if (error) {
            alert("Error deleting product: " + error)
            setIsDeleting(null)
        } else {
            setProducts((prev) => prev.filter((p) => p.id !== id))
            setIsDeleting(null)
        }
    }

    const handleExport = async () => {
        setIsExporting(true)
        try {
            const data = await exportProducts()
            const csv = Papa.unparse(data)
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.setAttribute("download", `products_export_${new Date().toISOString().split('T')[0]}.csv`)
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        } catch (error) {
            console.error("Export failed", error)
            alert("Export failed!")
        } finally {
            setIsExporting(false)
        }
    }

    const handleImportClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsImporting(true)
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const { error, count } = await importProducts(results.data as any[])
                setIsImporting(false)
                if (error) {
                    alert(`Import failed: ${error}`)
                } else {
                    alert(`Successfully imported ${count} items.`)
                    router.refresh()
                }
                if (fileInputRef.current) {
                    fileInputRef.current.value = ""
                }
            },
            error: (error) => {
                console.error("Parse error:", error)
                alert("Failed to parse CSV file.")
                setIsImporting(false)
            }
        })
    }

    const totalItems = products.length
    const serviceCount = products.filter(p => p.type === 'SERVICE').length
    const lowStockCount = products.filter(p => p.type === 'PRODUCT' && p.stock_qty < 5).length
    const activeProducts = products.filter(p => p.is_active).length

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Products & Services</h1>
                    <p className="text-muted-foreground mt-1">Manage your catalog, stock levels, and services from Supabase</p>
                </div>
                <div className="flex items-center gap-2">
                    <input 
                        type="file" 
                        accept=".csv" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={handleFileUpload} 
                    />
                    <Button variant="outline" size="sm" onClick={handleImportClick} disabled={isImporting}>
                        {isImporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                        Import
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
                        {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                        Export
                    </Button>
                    <Button size="sm" onClick={() => router.push("/sales/products/new")}>
                        <Plus className="mr-2 h-4 w-4" /> Add Item
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Items</p>
                        </div>
                        <p className="text-2xl font-bold mt-1">{totalItems}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2">
                            <Wrench className="h-4 w-4 text-blue-500" />
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Services</p>
                        </div>
                        <p className="text-2xl font-bold mt-1 text-blue-500">{serviceCount}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active</p>
                        </div>
                        <p className="text-2xl font-bold mt-1 text-emerald-500">{activeProducts}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Low Stock</p>
                        </div>
                        <p className="text-2xl font-bold mt-1 text-red-500">{lowStockCount}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search & Filter */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
                        <div className="relative max-w-sm w-full flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search items by name, SKU..."
                                className="pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            {(["all", "PRODUCT", "SERVICE"] as const).map((t) => (
                                <Badge
                                    key={t}
                                    variant={filterType === t ? "default" : "outline"}
                                    className="cursor-pointer capitalize px-3 py-1"
                                    onClick={() => setFilterType(t)}
                                >
                                    {t === "all" ? "All Items" : t.toLowerCase() + "s"}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-md border bg-muted/30">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item Details</TableHead>
                                    <TableHead>Category/Brand</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>SKU / HSN</TableHead>
                                    <TableHead className="text-right">Unit Price</TableHead>
                                    <TableHead className="text-center">Stock</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredProducts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                            No items found in your catalog.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredProducts.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{item.name}</span>
                                                    {item.description && (
                                                       <span className="text-xs text-muted-foreground truncate max-w-[250px]" title={item.description}>
                                                            {item.description}
                                                       </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-0.5 text-sm">
                                                    <span className="font-medium text-foreground">{item.category || "—"}</span>
                                                    <span className="text-xs text-muted-foreground">{item.brand || "—"}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="font-normal flex w-fit items-center gap-1.5">
                                                    {item.type === "PRODUCT" ? <Package className="w-3 h-3" /> : <Wrench className="w-3 h-3" />}
                                                    {item.type === "PRODUCT" ? "Product" : "Service"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-0.5 text-sm">
                                                    <span className="text-muted-foreground text-xs">SKU: <span className="text-foreground">{item.sku || "N/A"}</span></span>
                                                    <span className="text-muted-foreground text-xs">HSN: <span className="text-foreground">{item.hsn_sac_code || "N/A"}</span></span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex flex-col">
                                                    <span className="font-medium font-mono text-sm">
                                                        {new Intl.NumberFormat("en-IN", {
                                                            style: "currency",
                                                            currency: item.currency,
                                                        }).format(item.unit_price)}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground pl-1">
                                                        per {item.unit}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center font-mono">
                                                <span className={item.type === 'PRODUCT' && item.stock_qty < 5 ? "text-red-500 font-bold" : ""}>
                                                    {item.type === "PRODUCT" ? item.stock_qty : "—"}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={item.is_active ? "outline" : "destructive"} className="text-[10px] uppercase">
                                                    {item.is_active ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push(`/sales/products/${item.id}/edit`)}>
                                                        <Pencil className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8" 
                                                        onClick={() => handleDelete(item.id)}
                                                        disabled={isDeleting === item.id}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
