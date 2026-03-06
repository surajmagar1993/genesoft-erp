"use client"

import { ProductForm } from "@/components/sales/product-form"

export default function NewProductPage() {
    const handleSave = (data: any) => {
        // TODO: API call to save product
        console.log("Product saved:", data)
    }

    return <ProductForm onSave={handleSave} />
}
