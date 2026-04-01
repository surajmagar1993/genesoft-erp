import { getAccounts } from "@/app/actions/finance/accounts"
import NewAccountForm from "./NewAccountForm"

export const dynamic = "force-dynamic"

export default async function NewAccountPage() {
  const accounts = await getAccounts()
  return <NewAccountForm parentAccounts={accounts} />
}
