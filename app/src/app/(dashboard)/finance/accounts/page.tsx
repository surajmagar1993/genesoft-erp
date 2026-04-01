import { getAccounts } from "@/app/actions/finance/accounts"
import AccountsClient from "./AccountsClient"

export const dynamic = "force-dynamic"

export default async function AccountsPage() {
  const accounts = await getAccounts()
  return <AccountsClient initialAccounts={accounts} />
}
