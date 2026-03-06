"use client"

import { useState } from "react"
import { Search, Plus, Pencil, Trash2, Package, Wrench } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

import { ProductFormDialog, ProductFormData } from "@/components/sales/product-form-dialog"

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
    const [products, setProducts] = useState<ProductFormData[]>(initialProducts)
    const [searchQuery, setSearchQuery] = useState("")
    const [filterType, setFilterType] = useState<"all" | "PRODUCT" | "SERVICE">("all")
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState<ProductFormData | null>(null)

    const filteredProducts = products.filter((p) => {
        const matchesSearch =
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.hsnSacCode.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesType = filterType === "all" || p.type === filterType
        return matchesSearch && matchesType
    })

    const handleCreate = () => {
        setEditingProduct(null)
        setDialogOpen(true)
    }

    const handleEdit = (product: ProductFormData) => {
        setEditingProduct(product)
        setDialogOpen(true)
    }

    const handleDelete = (id: string) => {
        setProducts((prev) => prev.filter((p) => p.id !== id))
    }

    const handleSave = (data: ProductFormData) => {
        if (editingProduct) {
            setProducts((prev) =>
                prev.map((p) =>
                    p.id === editingProduct.id
                        ? { ...p, ...data }
                        : p
                )
            )
        } else {
            const newProduct: ProductFormData = {
                ...data,
                id: Date.now().toString(),
            }
            setProducts((prev) => [newProduct, ...prev])
        }
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Products & Services</h2>
                <div className="flex items-center space-x-2">
                    <Button onClick={handleCreate}>
                        <Plus className="mr-2 h-4 w-4" /> Add Item
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative max-w-sm flex-1">
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

            <div className="rounded-md border bg-card">
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
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
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
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEdit(item)}
                                        >
                                            <Pencil className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(item.id!)}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <ProductFormDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                initialData={editingProduct}
                onSave={handleSave}
            />
        </div>
    )
}
