import { getProducts } from "@/app/actions/sales/products"
import { ProductsClient } from "./products-client"

export const dynamic = "force-dynamic"

export default async function ProductsPage() {
    const { data: products, total } = await getProducts()

    return <ProductsClient initialProducts={products} total={total} />
}
