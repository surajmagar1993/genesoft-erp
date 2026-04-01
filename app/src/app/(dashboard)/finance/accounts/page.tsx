import { getAccounts } from "@/app/actions/finance/accounts"
import AccountsClient from "./AccountsClient"

export const dynamic = "force-dynamic"

export default async function AccountsPage() {
  const { data: accounts } = await getAccounts(1, 1000) // Fetch top 1000 for the full tree view
  return <AccountsClient initialAccounts={accounts} />
}
