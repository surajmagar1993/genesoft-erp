import { LegalPage, legalMetadata } from "@/components/marketing/legal-page"

export const metadata = legalMetadata("legal:dpa")

export default function Page() {
    return <LegalPage pageKey="legal:dpa" />
}
