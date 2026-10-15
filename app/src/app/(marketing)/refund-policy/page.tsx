import { LegalPage, legalMetadata } from "@/components/marketing/legal-page"

export const metadata = legalMetadata("legal:refund-policy")

export default function Page() {
    return <LegalPage pageKey="legal:refund-policy" />
}
