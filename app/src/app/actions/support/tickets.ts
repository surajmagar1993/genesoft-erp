"use server"

import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT"

/**
 * Fetch all tickets for the current tenant
 */
export async function getTickets() {
  const tenantId = await getTenantId()
  return await prisma.supportTicket.findMany({
    where: { tenantId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" }
      }
    },
    orderBy: { updatedAt: "desc" }
  })
}

/**
 * Fetch a single ticket with messages
 */
export async function getTicket(id: string) {
  const tenantId = await getTenantId()
  return await prisma.supportTicket.findUnique({
    where: { id, tenantId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" }
      }
    }
  })
}

/**
 * Create a new support ticket
 */
export async function createTicket(subject: string, message: string, priority: TicketPriority = "MEDIUM") {
  const supabase = await createClient()
  const tenantId = await getTenantId()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Unauthorized")

  const ticket = await prisma.$transaction(async (tx) => {
    // 1. Create ticket
    const newTicket = await tx.supportTicket.create({
      data: {
        tenantId,
        subject,
        priority,
        status: "OPEN"
      }
    })

    // 2. Create first message
    await tx.supportMessage.create({
      data: {
        ticketId: newTicket.id,
        senderId: user.id,
        content: message,
        isFromAdmin: false
      }
    })

    return newTicket
  })

  revalidatePath("/support")
  return ticket
}

/**
 * Add a message to a ticket
 */
export async function addMessage(ticketId: string, content: string, isFromAdmin: boolean = false) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Unauthorized")

  // Verify ticket belongs to tenant before adding message
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId, tenantId: await getTenantId() }
  })

  if (!ticket) throw new Error("Ticket not found or unauthorized")

  const msg = await prisma.supportMessage.create({
    data: {
      ticketId,
      senderId: user.id,
      content,
      isFromAdmin
    }
  })

  // Update ticket with new timestamp and possibly status
  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { 
        updatedAt: new Date(),
        status: isFromAdmin ? "IN_PROGRESS" : "OPEN" 
    }
  })

  revalidatePath(`/support/${ticketId}`)
  revalidatePath("/admin/support")
  return msg
}

/**
 * Update ticket status (Admin only)
 */
export async function updateTicketStatus(id: string, status: TicketStatus) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Verify Role (Admin/SuperAdmin)
  const profile = await prisma.user.findUnique({
    where: { authId: user.id }
  })

  if (!profile || !["ADMIN", "SUPER_ADMIN"].includes(profile.role)) {
    throw new Error("Insufficient permissions")
  }

  const tenantId = await getTenantId()
  const ticket = await prisma.supportTicket.update({
    where: { id, tenantId },
    data: { status }
  })
  
  revalidatePath(`/support/${id}`)
  revalidatePath("/admin/support")
  return ticket
}
