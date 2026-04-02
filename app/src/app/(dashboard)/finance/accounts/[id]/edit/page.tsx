import { notFound } from "next/navigation"
import { getAccountById, getAccounts } from "@/app/actions/finance/accounts"
import EditAccountForm from "./EditAccountForm"

export const dynamic = "force-dynamic"

export default async function EditAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [account, allAccounts] = await Promise.all([
    getAccountById(id),
    getAccounts(),
  ])

  if (!account) notFound()
  return <EditAccountForm account={account} parentAccounts={allAccounts.data} />
}
