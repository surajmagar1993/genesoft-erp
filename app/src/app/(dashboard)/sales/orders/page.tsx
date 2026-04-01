import { getOrders, type SalesOrderStatus } from "@/app/actions/sales/orders"
import OrdersClient from "./OrdersClient"

export const dynamic = "force-dynamic"

export default async function OrdersPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams
    const status = params.status as SalesOrderStatus | undefined
    const search = params.search as string | undefined
    const page = params.page ? parseInt(params.page as string) : 1
    const limit = params.limit ? parseInt(params.limit as string) : 10

    const { data: orders, total } = await getOrders(page, limit, { status, search })
    
    return <OrdersClient initialOrders={orders} total={total} />
}
