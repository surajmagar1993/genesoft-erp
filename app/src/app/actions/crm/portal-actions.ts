"use server"

import { prisma } from "@/lib/prisma"
import { getTenantId, getTenantManagerId, getTenantWriterId } from "@/lib/get-tenant-id"
import { randomBytes } from "crypto"
import { isPortalLinkExpired, portalLinkExpiresAt } from "@/lib/portal-link"

/** Module access checked by the tenant helpers (src/lib/access.ts) */
const MODULE = "crm" as const

// ────────────────────────────────────────────
// Portal Access Management (Tenant-Side)
// ────────────────────────────────────────────

/** What the contact page shows about a customer's portal link */
export interface PortalStatus {
  portalEnabled: boolean
  portalToken: string | null
  /** ISO time the current link stops working (30 days after it was issued) */
  expiresAt: string | null
  expired: boolean
  portalLastAccess: string | null
}

function toStatus(c: { portalEnabled: boolean; portalToken: string | null; portalTokenIssuedAt: Date | null; portalLastAccess: Date | null }): PortalStatus {
  return {
    portalEnabled: c.portalEnabled,
    portalToken: c.portalToken,
    expiresAt: portalLinkExpiresAt(c.portalTokenIssuedAt)?.toISOString() ?? null,
    expired: !!c.portalToken && isPortalLinkExpired(c.portalTokenIssuedAt),
    portalLastAccess: c.portalLastAccess?.toISOString() ?? null,
  }
}

const STATUS_FIELDS = { portalEnabled: true, portalToken: true, portalTokenIssuedAt: true, portalLastAccess: true } as const

/** Turn a customer's portal on or off. Turning it on reuses a link that still works, or issues a new one. */
export async function togglePortalAccess(contactId: string): Promise<{ success: boolean; error?: string; status?: PortalStatus }> {
  const tenantId = await getTenantManagerId(MODULE)

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, tenantId },
    select: STATUS_FIELDS,
  })

  if (!contact) {
    return { success: false, error: "Contact not found" }
  }

  const enable = !contact.portalEnabled
  const needsNewLink = enable && (!contact.portalToken || isPortalLinkExpired(contact.portalTokenIssuedAt))

  const updated = await prisma.contact.update({
    where: { id: contactId },
    data: {
      portalEnabled: enable,
      ...(needsNewLink ? { portalToken: randomBytes(32).toString("hex"), portalTokenIssuedAt: new Date() } : {}),
    },
    select: STATUS_FIELDS,
  })

  return { success: true, status: toStatus(updated) }
}

/** Issue a new link (valid 30 days); the old one stops working at once. */
export async function regeneratePortalToken(contactId: string): Promise<{ success: boolean; error?: string; status?: PortalStatus }> {
  const tenantId = await getTenantManagerId(MODULE)

  const { count } = await prisma.contact.updateMany({
    where: { id: contactId, tenantId },
    data: { portalToken: randomBytes(32).toString("hex"), portalTokenIssuedAt: new Date(), portalEnabled: true },
  })

  if (count === 0) {
    return { success: false, error: "Contact not found" }
  }

  const updated = await prisma.contact.findFirst({ where: { id: contactId, tenantId }, select: STATUS_FIELDS })
  return { success: true, status: updated ? toStatus(updated) : undefined }
}

export async function getPortalStatus(contactId: string): Promise<PortalStatus | null> {
  const tenantId = await getTenantId(MODULE)

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, tenantId },
    select: STATUS_FIELDS,
  })

  return contact ? toStatus(contact) : null
}

// ────────────────────────────────────────────
// Portal Tickets — Tenant Staff Management
// ────────────────────────────────────────────

export async function getPortalTicketsForTenant() {
  const tenantId = await getTenantId(MODULE)

  const tickets = await prisma.portalTicket.findMany({
    where: { tenantId },
    include: {
      contact: { select: { displayName: true, email: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, isFromCustomer: true },
      },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
  })

  return tickets.map((t: (typeof tickets)[number]) => ({
    id: t.id,
    subject: t.subject,
    category: t.category,
    status: t.status,
    priority: t.priority,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    contactName: t.contact.displayName,
    contactEmail: t.contact.email,
    messageCount: t._count.messages,
    lastMessage: t.messages[0]?.content ?? null,
    awaitingReply: t.messages[0]?.isFromCustomer ?? false,
  }))
}

export async function replyToPortalTicket(
  ticketId: string,
  message: string,
  staffName: string = "Support Team"
) {
  const tenantId = await getTenantWriterId(MODULE)

  const ticket = await prisma.portalTicket.findFirst({
    where: { id: ticketId, tenantId },
  })

  if (!ticket) {
    return { success: false, error: "Ticket not found" }
  }

  await prisma.$transaction([
    prisma.portalTicketMessage.create({
      data: {
        ticketId,
        senderName: staffName,
        content: message,
        isFromCustomer: false,
      },
    }),
    prisma.portalTicket.update({
      where: { id: ticketId },
      data: { status: "IN_PROGRESS" },
    }),
  ])

  return { success: true }
}

export async function updatePortalTicketStatus(
  ticketId: string,
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"
) {
  const tenantId = await getTenantWriterId(MODULE)

  const ticket = await prisma.portalTicket.findFirst({
    where: { id: ticketId, tenantId },
  })

  if (!ticket) {
    return { success: false, error: "Ticket not found" }
  }

  await prisma.portalTicket.update({
    where: { id: ticketId },
    data: { status },
  })

  return { success: true }
}
