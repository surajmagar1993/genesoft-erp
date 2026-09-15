import { getCompanyWithRelations } from "@/app/actions/crm/companies"
import CompanyDetailClient from "./CompanyDetailClient"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const resolvedParams = await params
  const { company, contacts, deals, metrics } = await getCompanyWithRelations(resolvedParams.id)

  if (!company) notFound()

  return (
    <CompanyDetailClient
      company={company}
      contacts={contacts}
      deals={deals}
      metrics={metrics}
    />
  )
}
