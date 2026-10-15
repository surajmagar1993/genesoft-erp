import { LegalPage, legalMetadata } from "@/components/marketing/legal-page"

export const metadata = legalMetadata("legal:privacy")

export default function Page() {
    return <LegalPage pageKey="legal:privacy" />
}
