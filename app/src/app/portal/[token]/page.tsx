import { Metadata } from "next"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { PortalClient } from "./portal-client"
import { isPortalLinkExpired } from "@/lib/portal-link"

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
      portalEnabled: true,
      portalTokenIssuedAt: true,
      tenant: { select: { name: true, isActive: true } },
    },
  })

  if (!contact || !contact.portalEnabled || !contact.tenant.isActive) {
    return { title: "Portal Not Found" }
  }
  if (isPortalLinkExpired(contact.portalTokenIssuedAt)) {
    return { title: `Link expired — ${contact.tenant.name}`, robots: { index: false } }
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
      portalTokenIssuedAt: true,
      displayName: true,
      tenant: { select: { name: true, logoUrl: true, isActive: true, email: true, phone: true } },
    },
  })

  // A suspended or closed business's portal is off too
  if (!contact || !contact.portalEnabled || !contact.tenant.isActive) {
    notFound()
  }

  // Links work for 30 days; the business sends a new one from the contact's page
  if (isPortalLinkExpired(contact.portalTokenIssuedAt)) {
    const reach = [contact.tenant.email, contact.tenant.phone].filter(Boolean).join(" or ")
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 font-sans antialiased">
        <div className="w-full max-w-md rounded-xl border bg-white dark:bg-slate-900 p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold">This link has expired</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            For your security, account links from {contact.tenant.name} work for 30 days. Ask {contact.tenant.name} to send you a new one{reach ? ` (${reach})` : ""}.
          </p>
        </div>
      </main>
    )
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
