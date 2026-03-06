"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Plus, Pencil, Trash2, Package, Wrench, CheckCircle2 } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ProductFormData } from "@/components/sales/product-form"

const initialProducts: ProductFormData[] = [
    {
        id: "1",
        type: "SERVICE",
        name: "Custom Website Development",
        category: "Software Development",
        brand: "In-House",
        modelNo: "",
        serialNo: "",
        sku: "SRV-WEB-001",
        hsnSacCode: "998311",
        description: "Corporate website design and development with CMS.",
        customAttributes: [
            { key: "Platform", value: "Next.js" },
            { key: "Hosting", value: "Vercel" }
        ],
        unitPrice: 50000,
        currency: "INR",
        unit: "Project",
        taxGroupId: "GST 18%",
        stockQty: 0,
        isActive: true,
    },
    {
        id: "2",
        type: "PRODUCT",
        name: "Dell OptiPlex 3000 Desktop",
        category: "Laptops & Computers",
        brand: "Dell",
        modelNo: "OptiPlex 3000",
        serialNo: "",
        sku: "HW-PC-DEL-01",
        hsnSacCode: "84714190",
        description: "Intel Core i5, 8GB RAM, 256GB SSD Desktop PC",
        customAttributes: [
            { key: "Processor", value: "Intel Core i5-12500" },
            { key: "RAM", value: "8GB DDR4" },
            { key: "Storage", value: "256GB NVMe SSD" },
            { key: "OS", value: "Windows 11 Pro" }
        ],
        unitPrice: 42000,
        currency: "INR",
        unit: "Nos",
        taxGroupId: "GST 18%",
        stockQty: 12,
        isActive: true,
    },
    {
        id: "3",
        type: "SERVICE",
        name: "Cloud Hosting & Maintenance",
        category: "IT Support",
        brand: "AWS",
        modelNo: "",
        serialNo: "",
        sku: "SRV-HST-AMC",
        hsnSacCode: "998314",
        description: "Annual maintenance and AWS cloud hosting service.",
        customAttributes: [],
        unitPrice: 25000,
        currency: "INR",
        unit: "Year",
        taxGroupId: "GST 18%",
        stockQty: 0,
        isActive: true,
    },
    {
        id: "4",
        type: "PRODUCT",
        name: "Ubiquiti UniFi AP AC Pro",
        category: "Networking",
        brand: "Ubiquiti",
        modelNo: "UAP-AC-PRO",
        serialNo: "",
        sku: "HW-NW-UBI-05",
        hsnSacCode: "85176290",
        description: "Enterprise Wi-Fi Access Point",
        customAttributes: [
            { key: "Band", value: "Dual-Band 2.4/5 GHz" },
            { key: "Throughput", value: "1300 Mbps" },
            { key: "PoE", value: "Yes" }
        ],
        unitPrice: 12500,
        currency: "INR",
        unit: "Nos",
        taxGroupId: "GST 18%",
        stockQty: 5,
        isActive: true,
    }
]

export default function ProductsPage() {
    const router = useRouter()
    const [products, setProducts] = useState<ProductFormData[]>(initialProducts)
    const [searchQuery, setSearchQuery] = useState("")
    const [filterType, setFilterType] = useState<"all" | "PRODUCT" | "SERVICE">("all")

    const filteredProducts = products.filter((p) => {
        const matchesSearch =
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.hsnSacCode.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesType = filterType === "all" || p.type === filterType
        return matchesSearch && matchesType
    })

    const handleDelete = (id: string) => {
        setProducts((prev) => prev.filter((p) => p.id !== id))
    }

    const totalItems = products.length
    const serviceCount = products.filter(p => p.type === 'SERVICE').length
    const lowStockCount = products.filter(p => p.type === 'PRODUCT' && p.stockQty < 5).length
    const activeProducts = products.filter(p => p.isActive).length

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Products & Services</h1>
                    <p className="text-muted-foreground mt-1">Manage your catalog, stock levels, and services</p>
                </div>
                <Button size="sm" onClick={() => router.push("/sales/products/new")}>
                    <Plus className="mr-2 h-4 w-4" /> Add Item
                </Button>
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
                            <Trash2 className="h-4 w-4 text-red-500" />
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
                                            No items found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredProducts.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{item.name}</span>
                                                    <span className="text-xs text-muted-foreground truncate max-w-[250px]" title={item.description}>
                                                        {item.description || "-"}
                                                    </span>
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
                                                    <span className="text-muted-foreground">SKU: <span className="text-foreground">{item.sku || "N/A"}</span></span>
                                                    <span className="text-muted-foreground">HSN: <span className="text-foreground">{item.hsnSacCode || "N/A"}</span></span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">
                                                        {new Intl.NumberFormat("en-IN", {
                                                            style: "currency",
                                                            currency: item.currency,
                                                        }).format(item.unitPrice)}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground pl-1">
                                                        per {item.unit}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center font-mono">
                                                {item.type === "PRODUCT" ? item.stockQty : "—"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={item.isActive ? "outline" : "destructive"}>
                                                    {item.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push(`/sales/products/${item.id}/edit`)}>
                                                        <Pencil className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(item.id!)}>
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

