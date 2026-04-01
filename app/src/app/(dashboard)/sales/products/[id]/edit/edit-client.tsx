"use client"

import { ProductForm, ProductFormData } from "@/components/sales/product-form"
import { ProductDB, updateProduct } from "@/app/actions/sales/products"
import { useRouter } from "next/navigation"

interface EditProductClientProps {
    initialProduct: ProductDB
}

export function EditProductClient({ initialProduct }: EditProductClientProps) {
    const router = useRouter()

    // Map DB snake_case to UI camelCase for the form
    const formData: ProductFormData = {
        id: initialProduct.id,
        type: initialProduct.type,
        name: initialProduct.name,
        category: initialProduct.category || "",
        brand: initialProduct.brand || "",
        modelNo: initialProduct.model_no || "",
        serialNo: initialProduct.serial_no || "",
        sku: initialProduct.sku || "",
        hsnSacCode: initialProduct.hsn_sac_code || "",
        description: initialProduct.description || "",
        unitPrice: Number(initialProduct.unit_price),
        currency: initialProduct.currency,
        unit: initialProduct.unit,
        stockQty: Number(initialProduct.stock_qty),
        isActive: initialProduct.is_active,
        taxGroupId: initialProduct.tax_group_id || "",
        customAttributes: Array.isArray(initialProduct.custom_attributes) 
            ? initialProduct.custom_attributes 
            : []
    }

    const handleSave = async (data: ProductFormData) => {
        // Map UI camelCase back to DB snake_case for the update
        const payload = {
            id: initialProduct.id,
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
            custom_attributes: data.customAttributes
        }

        const { error } = await updateProduct(payload)
        
        if (error) {
            alert("Error updating product: " + error)
        } else {
            router.push("/sales/products")
        }
    }

    return <ProductForm initialData={formData} onSave={handleSave} />
}
