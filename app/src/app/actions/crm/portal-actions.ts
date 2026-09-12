"use server"

import { prisma } from "@/lib/prisma"
import { getTenantId } from "@/lib/get-tenant-id"
import { randomBytes } from "crypto"

// ────────────────────────────────────────────
// Portal Access Management (Tenant-Side)
// ────────────────────────────────────────────

export async function togglePortalAccess(contactId: string) {
  const tenantId = await getTenantId()

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, tenantId },
    select: { portalEnabled: true, portalToken: true },
  })

  if (!contact) {
    return { success: false, error: "Contact not found" }
  }

  const newEnabled = !contact.portalEnabled

  // Generate token on first enable
  const portalToken =
    newEnabled && !contact.portalToken
      ? randomBytes(32).toString("hex")
      : contact.portalToken

  await prisma.contact.update({
    where: { id: contactId },
    data: { portalEnabled: newEnabled, portalToken },
  })

  return { success: true, portalEnabled: newEnabled, portalToken }
}

export async function regeneratePortalToken(contactId: string) {
  const tenantId = await getTenantId()

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, tenantId },
  })

  if (!contact) {
    return { success: false, error: "Contact not found" }
  }

  const portalToken = randomBytes(32).toString("hex")

  await prisma.contact.update({
    where: { id: contactId },
    data: { portalToken, portalEnabled: true },
  })

  return { success: true, portalToken }
}

export async function getPortalStatus(contactId: string) {
  const tenantId = await getTenantId()

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, tenantId },
    select: {
      portalEnabled: true,
      portalToken: true,
      portalLastAccess: true,
    },
  })

  if (!contact) return null

  return {
    portalEnabled: contact.portalEnabled,
    portalToken: contact.portalToken,
    portalLastAccess: contact.portalLastAccess?.toISOString() ?? null,
  }
}

// ────────────────────────────────────────────
// Portal Tickets — Tenant Staff Management
// ────────────────────────────────────────────

export async function getPortalTicketsForTenant() {
  const tenantId = await getTenantId()

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
  const tenantId = await getTenantId()

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
  const tenantId = await getTenantId()

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
