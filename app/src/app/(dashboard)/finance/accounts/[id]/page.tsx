import { isUuid } from "@/lib/utils"
import { notFound } from "next/navigation"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

interface Props {
    params: Promise<{ id: string }>
}

export default async function AccountDetailPage({ params }: Props) {
    const { id } = await params
    if (!isUuid(id)) notFound()
    redirect(`/finance/accounts/${id}/edit`)
}
