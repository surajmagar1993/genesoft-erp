"use client"

import { ProductForm, ProductFormData } from "@/components/sales/product-form"
import { createProduct } from "@/app/actions/sales/products"
import { useRouter } from "next/navigation"

export default function NewProductPage() {
    const router = useRouter()

    const handleSave = async (data: ProductFormData) => {
        // Map UI camelCase to DB snake_case for the payload
        const payload = {
            type: data.type,
            name: data.name,
            category: data.category,
            brand: data.brand,
            model_no: data.modelNo,
            serial_no: data.serialNo,
            sku: data.sku,
            hsn_sac_code: data.hsnSacCode,
            description: data.description,
            unit_price: data.unitPrice,
            currency: data.currency,
            unit: data.unit,
            stock_qty: data.stockQty,
            is_active: data.isActive,
            custom_attributes: data.customAttributes // Array of {key, value} as-is
        }

        const { id, error } = await createProduct(payload)
        
        if (error) {
            alert("Error creating product: " + error)
        } else {
            router.push("/sales/products")
        }
    }

    return <ProductForm onSave={handleSave} />
}
