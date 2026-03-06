"use client"

import { useParams } from "next/navigation"
import { ProductForm, ProductFormData } from "@/components/sales/product-form"

// TODO: Replace with real API fetch
const mockProducts: Record<string, ProductFormData> = {
    "1": {
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
            { key: "Hosting", value: "Vercel" },
        ],
        unitPrice: 50000,
        currency: "INR",
        unit: "Project",
        taxGroupId: "GST 18%",
        stockQty: 0,
        isActive: true,
    },
    "2": {
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
            { key: "OS", value: "Windows 11 Pro" },
        ],
        unitPrice: 42000,
        currency: "INR",
        unit: "Nos",
        taxGroupId: "GST 18%",
        stockQty: 12,
        isActive: true,
    },
}

export default function EditProductPage() {
    const params = useParams()
    const id = params.id as string
    const product = mockProducts[id] || null

    const handleSave = (data: any) => {
        // TODO: API call to update product
        console.log("Product updated:", data)
    }

    return <ProductForm initialData={product} onSave={handleSave} />
}
