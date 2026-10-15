import { LegalPage, legalMetadata } from "@/components/marketing/legal-page"

export const metadata = legalMetadata("legal:rental-terms")

export default function Page() {
    return <LegalPage pageKey="legal:rental-terms" />
}
