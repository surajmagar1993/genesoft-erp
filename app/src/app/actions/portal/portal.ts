"use server"

import { prisma } from "@/lib/prisma"
import { fireWorkflowEvent } from "@/lib/workflow-engine"
import type {
  PortalProfile,
  PortalInvoiceRecord,
  PortalPaymentRecord,
  PortalStatementEntry,
  PortalTicketRecord,
  PortalTicketDetail,
  PortalDashboardData,
} from "./portal-types"

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

async function resolveContact(token: string) {
  const contact = await prisma.contact.findUnique({
    where: { portalToken: token },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          email: true,
          phone: true,
          website: true,
          isActive: true,
        },
      },
    },
  })

  // A suspended or closed business's portal is off too
  if (!contact || !contact.portalEnabled || !contact.tenant.isActive) {
    return null
  }

  // Note the visit, at most once every five minutes (a page makes several calls)
  if (!contact.portalLastAccess || Date.now() - contact.portalLastAccess.getTime() > 5 * 60_000) {
    await prisma.contact.update({
      where: { id: contact.id },
      data: { portalLastAccess: new Date() },
    })
  }

  return contact
}

function dec(v: unknown): number {
  if (v === null || v === undefined) return 0
  return Number(v)
}

// ────────────────────────────────────────────
// Portal Profile
// ────────────────────────────────────────────

export async function getPortalProfile(
  token: string
): Promise<PortalProfile | null> {
  const contact = await resolveContact(token)
  if (!contact) return null

  return {
    id: contact.id,
    displayName: contact.displayName,
    email: contact.email,
    phone: contact.phone,
    companyName: contact.companyName,
    currencyCode: contact.currencyCode,
    balance: dec(contact.balance),
    creditLimit: contact.creditLimit ? dec(contact.creditLimit) : null,
    customerGroup: contact.customerGroup,
    tenantName: contact.tenant.name,
    tenantLogoUrl: contact.tenant.logoUrl,
    tenantEmail: contact.tenant.email,
    tenantPhone: contact.tenant.phone,
    tenantWebsite: contact.tenant.website,
  }
}

// ────────────────────────────────────────────
// Invoices
// ────────────────────────────────────────────

export async function getPortalInvoices(
  token: string
): Promise<PortalInvoiceRecord[]> {
  const contact = await resolveContact(token)
  if (!contact) return []

  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId: contact.tenantId,
      contactId: contact.id,
    },
    include: {
      payments: { select: { amount: true } },
    },
    orderBy: { invoiceDate: "desc" },
  })

  return invoices.map((inv: (typeof invoices)[number]) => {
    const paidAmount = inv.payments.reduce((s: number, p: { amount: unknown }) => s + dec(p.amount), 0)
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      invoiceDate: inv.invoiceDate.toISOString(),
      dueDate: inv.dueDate?.toISOString() ?? null,
      subtotal: dec(inv.subtotal),
      taxAmount: dec(inv.taxAmount),
      total: dec(inv.total),
      currencyCode: inv.currencyCode,
      paidAmount,
      balanceDue: dec(inv.total) - paidAmount,
    }
  })
}

// ────────────────────────────────────────────
// Payments
// ────────────────────────────────────────────

export async function getPortalPayments(
  token: string
): Promise<PortalPaymentRecord[]> {
  const contact = await resolveContact(token)
  if (!contact) return []

  const payments = await prisma.payment.findMany({
    where: {
      tenantId: contact.tenantId,
      contactId: contact.id,
      type: "INBOUND",
    },
    include: {
      invoice: { select: { invoiceNumber: true } },
    },
    orderBy: { paymentDate: "desc" },
  })

  return payments.map((p: (typeof payments)[number]) => ({
    id: p.id,
    amount: dec(p.amount),
    paymentDate: p.paymentDate.toISOString(),
    paymentMethod: p.paymentMethod,
    reference: p.reference,
    currencyCode: p.currencyCode,
    invoiceNumber: p.invoice?.invoiceNumber ?? null,
  }))
}

// ────────────────────────────────────────────
// Statement / Ledger
// ────────────────────────────────────────────

export async function getPortalStatement(
  token: string
): Promise<PortalStatementEntry[]> {
  const contact = await resolveContact(token)
  if (!contact) return []

  // Build a combined timeline of invoices, payments, and credit notes
  const [invoices, payments, creditNotes] = await Promise.all([
    prisma.invoice.findMany({
      where: { tenantId: contact.tenantId, contactId: contact.id },
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        total: true,
        status: true,
      },
      orderBy: { invoiceDate: "asc" },
    }),
    prisma.payment.findMany({
      where: {
        tenantId: contact.tenantId,
        contactId: contact.id,
        type: "INBOUND",
      },
      select: {
        id: true,
        amount: true,
        paymentDate: true,
        reference: true,
      },
      orderBy: { paymentDate: "asc" },
    }),
    prisma.creditNote.findMany({
      where: { tenantId: contact.tenantId, contactId: contact.id },
      select: {
        id: true,
        creditNoteNumber: true,
        issueDate: true,
        total: true,
      },
      orderBy: { issueDate: "asc" },
    }),
  ])

  const entries: PortalStatementEntry[] = []

  invoices.forEach((inv: (typeof invoices)[number]) => {
    entries.push({
      id: inv.id,
      date: inv.invoiceDate.toISOString(),
      description: `Invoice ${inv.invoiceNumber}`,
      type: "INVOICE",
      debit: dec(inv.total),
      credit: 0,
      runningBalance: 0,
      reference: inv.invoiceNumber,
    })
  })

  payments.forEach((p: (typeof payments)[number]) => {
    entries.push({
      id: p.id,
      date: p.paymentDate.toISOString(),
      description: `Payment received${p.reference ? ` (${p.reference})` : ""}`,
      type: "PAYMENT",
      debit: 0,
      credit: dec(p.amount),
      runningBalance: 0,
      reference: p.reference,
    })
  })

  creditNotes.forEach((cn: (typeof creditNotes)[number]) => {
    entries.push({
      id: cn.id,
      date: cn.issueDate.toISOString(),
      description: `Credit Note ${cn.creditNoteNumber}`,
      type: "CREDIT_NOTE",
      debit: 0,
      credit: dec(cn.total),
      runningBalance: 0,
      reference: cn.creditNoteNumber,
    })
  })

  // Sort by date then compute running balance
  entries.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  let runningBalance = 0
  entries.forEach((e) => {
    runningBalance += e.debit - e.credit
    e.runningBalance = runningBalance
  })

  return entries
}

// ────────────────────────────────────────────
// Support Tickets
// ────────────────────────────────────────────

export async function getPortalTickets(
  token: string
): Promise<PortalTicketRecord[]> {
  const contact = await resolveContact(token)
  if (!contact) return []

  const tickets = await prisma.portalTicket.findMany({
    where: { contactId: contact.id },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true },
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
    messageCount: t._count.messages,
    lastMessage: t.messages[0]?.content ?? null,
  }))
}

export async function getPortalTicketDetail(
  token: string,
  ticketId: string
): Promise<PortalTicketDetail | null> {
  const contact = await resolveContact(token)
  if (!contact) return null

  const ticket = await prisma.portalTicket.findFirst({
    where: { id: ticketId, contactId: contact.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      _count: { select: { messages: true } },
    },
  })

  if (!ticket) return null

  return {
    id: ticket.id,
    subject: ticket.subject,
    category: ticket.category,
    status: ticket.status,
    priority: ticket.priority,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    messageCount: ticket._count.messages,
    lastMessage:
      ticket.messages[ticket.messages.length - 1]?.content ?? null,
    messages: ticket.messages.map((m: (typeof ticket.messages)[number]) => ({
      id: m.id,
      senderName: m.senderName,
      content: m.content,
      isFromCustomer: m.isFromCustomer,
      createdAt: m.createdAt.toISOString(),
    })),
  }
}

/** Limits on what a portal link can write, so one link can't flood a business's inbox */
const PORTAL_SUBJECT_MAX = 200
const PORTAL_MESSAGE_MAX = 5000
const PORTAL_TICKETS_PER_HOUR = 10
const PORTAL_MESSAGES_PER_HOUR = 30

export async function createPortalTicket(
  token: string,
  data: { subject: string; category: string; message: string }
): Promise<{ success: boolean; ticketId?: string; error?: string }> {
  const contact = await resolveContact(token)
  if (!contact) return { success: false, error: "This portal link is no longer valid." }

  const subject = String(data.subject || "").trim()
  const message = String(data.message || "").trim()
  if (!subject || !message) return { success: false, error: "Enter a subject and a message." }
  if (subject.length > PORTAL_SUBJECT_MAX) return { success: false, error: `Keep the subject under ${PORTAL_SUBJECT_MAX} characters.` }
  if (message.length > PORTAL_MESSAGE_MAX) return { success: false, error: `Keep the message under ${PORTAL_MESSAGE_MAX} characters.` }

  const hourAgo = new Date(Date.now() - 3600_000)
  const recent = await prisma.portalTicket.count({ where: { tenantId: contact.tenantId, contactId: contact.id, createdAt: { gte: hourAgo } } })
  if (recent >= PORTAL_TICKETS_PER_HOUR) return { success: false, error: "You've opened several tickets in the last hour. Please reply on an existing one, or try again later." }

  const ticket = await prisma.portalTicket.create({
    data: {
      tenantId: contact.tenantId,
      contactId: contact.id,
      subject,
      category: String(data.category || "general").slice(0, 50),
      messages: {
        create: {
          senderName: contact.displayName,
          content: message,
          isFromCustomer: true,
        },
      },
    },
  })

  fireWorkflowEvent(contact.tenantId, "TICKET_CREATED", {
    subject: ticket.subject,
    category: ticket.category,
    priority: ticket.priority,
    customerEmail: contact.email,
  }, ticket.id)

  return { success: true, ticketId: ticket.id }
}

export async function addPortalTicketMessage(
  token: string,
  ticketId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const contact = await resolveContact(token)
  if (!contact) return { success: false, error: "This portal link is no longer valid." }

  const content = String(message || "").trim()
  if (!content) return { success: false, error: "Enter a message." }
  if (content.length > PORTAL_MESSAGE_MAX) return { success: false, error: `Keep the message under ${PORTAL_MESSAGE_MAX} characters.` }
  const recent = await prisma.portalTicketMessage.count({
    where: { isFromCustomer: true, createdAt: { gte: new Date(Date.now() - 3600_000) }, ticket: { contactId: contact.id, tenantId: contact.tenantId } },
  })
  if (recent >= PORTAL_MESSAGES_PER_HOUR) return { success: false, error: "You've sent many messages in the last hour. Please try again later." }

  // Verify ticket belongs to this contact
  const ticket = await prisma.portalTicket.findFirst({
    where: { id: ticketId, contactId: contact.id, tenantId: contact.tenantId },
  })
  if (!ticket) return { success: false, error: "Ticket not found." }

  await prisma.portalTicketMessage.create({
    data: {
      ticketId,
      senderName: contact.displayName,
      content,
      isFromCustomer: true,
    },
  })

  // Reopen if resolved: the customer came back after we closed it, so escalate
  if (ticket.status === "RESOLVED" || ticket.status === "CLOSED") {
    await prisma.portalTicket.update({
      where: { id: ticketId },
      data: { status: "OPEN" },
    })
    fireWorkflowEvent(contact.tenantId, "TICKET_ESCALATED", {
      subject: ticket.subject,
      priority: ticket.priority,
      customerEmail: contact.email,
    }, ticket.id)
  }

  return { success: true }
}

// ────────────────────────────────────────────
// Dashboard Overview
// ────────────────────────────────────────────

export async function getPortalDashboard(
  token: string
): Promise<PortalDashboardData | null> {
  const contact = await resolveContact(token)
  if (!contact) return null

  const profile: PortalProfile = {
    id: contact.id,
    displayName: contact.displayName,
    email: contact.email,
    phone: contact.phone,
    companyName: contact.companyName,
    currencyCode: contact.currencyCode,
    balance: dec(contact.balance),
    creditLimit: contact.creditLimit ? dec(contact.creditLimit) : null,
    customerGroup: contact.customerGroup,
    tenantName: contact.tenant.name,
    tenantLogoUrl: contact.tenant.logoUrl,
    tenantEmail: contact.tenant.email,
    tenantPhone: contact.tenant.phone,
    tenantWebsite: contact.tenant.website,
  }

  const [invoices, overdueCount, payments, openTicketCount] =
    await Promise.all([
      prisma.invoice.findMany({
        where: { tenantId: contact.tenantId, contactId: contact.id },
        include: { payments: { select: { amount: true } } },
        orderBy: { invoiceDate: "desc" },
        take: 5,
      }),
      prisma.invoice.count({
        where: {
          tenantId: contact.tenantId,
          contactId: contact.id,
          status: "OVERDUE",
        },
      }),
      prisma.payment.findMany({
        where: {
          tenantId: contact.tenantId,
          contactId: contact.id,
          type: "INBOUND",
        },
        include: { invoice: { select: { invoiceNumber: true } } },
        orderBy: { paymentDate: "desc" },
        take: 5,
      }),
      prisma.portalTicket.count({
        where: {
          contactId: contact.id,
          status: { in: ["OPEN", "IN_PROGRESS"] },
        },
      }),
    ])

  const totalInvoices = await prisma.invoice.count({
    where: { tenantId: contact.tenantId, contactId: contact.id },
  })

  const recentInvoices: PortalInvoiceRecord[] = invoices.map((inv: (typeof invoices)[number]) => {
    const paidAmount = inv.payments.reduce((s: number, p: { amount: unknown }) => s + dec(p.amount), 0)
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      invoiceDate: inv.invoiceDate.toISOString(),
      dueDate: inv.dueDate?.toISOString() ?? null,
      subtotal: dec(inv.subtotal),
      taxAmount: dec(inv.taxAmount),
      total: dec(inv.total),
      currencyCode: inv.currencyCode,
      paidAmount,
      balanceDue: dec(inv.total) - paidAmount,
    }
  })

  const recentPayments: PortalPaymentRecord[] = payments.map((p: (typeof payments)[number]) => ({
    id: p.id,
    amount: dec(p.amount),
    paymentDate: p.paymentDate.toISOString(),
    paymentMethod: p.paymentMethod,
    reference: p.reference,
    currencyCode: p.currencyCode,
    invoiceNumber: p.invoice?.invoiceNumber ?? null,
  }))

  return {
    profile,
    outstandingBalance: dec(contact.balance),
    totalInvoices,
    overdueInvoices: overdueCount,
    recentInvoices,
    recentPayments,
    openTickets: openTicketCount,
  }
}
