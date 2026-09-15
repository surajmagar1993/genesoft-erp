import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

interface Props {
    params: Promise<{ id: string }>
}

export default async function AccountDetailPage({ params }: Props) {
    const { id } = await params
    redirect(`/finance/accounts/${id}/edit`)
}
