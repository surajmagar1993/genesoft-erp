import { Metadata } from "next"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { PortalClient } from "./portal-client"

export const dynamic = "force-dynamic"

interface PortalPageProps {
  params: Promise<{ token: string }>
}

export async function generateMetadata({
  params,
}: PortalPageProps): Promise<Metadata> {
  const { token } = await params
  const contact = await prisma.contact.findUnique({
    where: { portalToken: token },
    select: {
      displayName: true,
      tenant: { select: { name: true } },
    },
  })

  if (!contact) {
    return { title: "Portal Not Found" }
  }

  return {
    title: `Customer Portal — ${contact.tenant.name}`,
    description: `Self-service account center for ${contact.displayName}`,
  }
}

export default async function PortalPage({ params }: PortalPageProps) {
  const { token } = await params

  const contact = await prisma.contact.findUnique({
    where: { portalToken: token },
    select: {
      portalEnabled: true,
      displayName: true,
      tenant: { select: { name: true, logoUrl: true } },
    },
  })

  if (!contact || !contact.portalEnabled) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans antialiased">
      <PortalClient
        token={token}
        contactName={contact.displayName}
        tenantName={contact.tenant.name}
        tenantLogoUrl={contact.tenant.logoUrl}
      />
    </div>
  )
}
