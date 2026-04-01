import { getProductById } from "@/app/actions/sales/products"
import { notFound } from "next/navigation"
import { EditProductClient } from "./edit-client"

export const dynamic = "force-dynamic"

interface EditProductPageProps {
    params: {
        id: string
    }
}

export default async function EditProductPage({ params }: EditProductPageProps) {
    const { id } = await params
    const product = await getProductById(id)

    if (!product) {
        notFound()
    }

    return <EditProductClient initialProduct={product} />
}
