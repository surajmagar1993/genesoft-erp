import { getProducts } from "@/app/actions/sales/products"
import { ProductsClient } from "./products-client"

export const dynamic = "force-dynamic"

export default async function ProductsPage() {
    const products = await getProducts()

    return <ProductsClient initialProducts={products} />
}
