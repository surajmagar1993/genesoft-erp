import { LegalPage, legalMetadata } from "@/components/marketing/legal-page"

export const metadata = legalMetadata("legal:cookie-policy")

export default function Page() {
    return <LegalPage pageKey="legal:cookie-policy" />
}
