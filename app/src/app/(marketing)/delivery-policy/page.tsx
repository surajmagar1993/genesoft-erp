import { LegalPage, legalMetadata } from "@/components/marketing/legal-page"

export const metadata = legalMetadata("legal:delivery-policy")

export default function Page() {
    return <LegalPage pageKey="legal:delivery-policy" />
}
