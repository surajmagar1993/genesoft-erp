import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

interface Props {
    params: Promise<{ id: string }>
}

export default async function ProductDetailPage({ params }: Props) {
    const { id } = await params
    redirect(`/sales/products/${id}/edit`)
}
