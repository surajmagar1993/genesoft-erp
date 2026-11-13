import { pageMeta } from "@/lib/seo"
import { safeNextPath } from "@/lib/safe-next"
import { TwoFactorClient } from "./two-factor-client"

export const metadata = pageMeta({ noIndex: true, title: "Two-factor sign-in | Genesoft ERP", description: "Confirm your sign-in with your authenticator app.", path: "/two-factor" })
export const dynamic = "force-dynamic"

export default async function TwoFactorPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
    const { next } = await searchParams
    return <TwoFactorClient next={safeNextPath(next)} />
}
