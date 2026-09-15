import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

interface Props {
    params: Promise<{ id: string }>
}

export default async function QuoteDetailPage({ params }: Props) {
    const { id } = await params
    redirect(`/sales/quotes/${id}/edit`)
}
