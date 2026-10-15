"use server"

import { prisma } from "@/lib/prisma"
import { toRows } from "@/lib/pg-row"
import { getCurrentUser } from "@/lib/current-user"
import { getTenantId, getTenantWriterId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"

export type NotificationType = "lead" | "deal" | "quote" | "bill" | "system"

export interface Notification {
  id: string
  type: NotificationType
  title: string
  description?: string
  link?: string
  is_read: boolean
  user_id: string
  tenant_id: string
  created_at: string
  updated_at: string
}

/**
 * Fetch all notifications for the current user and tenant
 */
export async function getNotifications() {
  try {
    const user = await getCurrentUser()
    if (!user) return []

    const tenantId = await getTenantId()
    const rows = await prisma.notification.findMany({
      where: { tenantId, userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    })
    return toRows<Notification>("Notification", rows)
  } catch (err) {
    console.error("getNotifications exception:", err)
    return []
  }
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(id: string) {
  try {
    const user = await getCurrentUser()
    if (!user) return

    await prisma.notification.updateMany({ where: { id, userId: user.id }, data: { isRead: true } })
    revalidatePath("/")
  } catch (err) {
    console.error("markNotificationAsRead exception:", err)
  }
}

/**
 * Mark all notifications as read for the current user
 */
export async function markAllAsRead() {
  try {
    const user = await getCurrentUser()
    if (!user) return

    const tenantId = await getTenantId()
    await prisma.notification.updateMany({ where: { userId: user.id, tenantId, isRead: false }, data: { isRead: true } })
    revalidatePath("/")
  } catch (err) {
    console.error("markAllAsRead exception:", err)
  }
}

/**
 * Create a new notification (To be called from other server actions)
 */
export async function createNotification(data: {
  type: NotificationType
  title: string
  description?: string
  link?: string
  userId: string
  tenantId: string
}) {
  try {
    // Callable from the client as a server action: only allow notifying users within the caller's own tenant
    const tenantId = await getTenantWriterId()
    if (data.tenantId !== tenantId) throw new Error("Unauthorized")
    if (!(await prisma.user.count({ where: { id: data.userId, tenantId } }))) throw new Error("Unauthorized")
    // Links stay inside the app ("/finance/bills/…"), never javascript: or another site
    if (data.link && !/^\/(?![\/\\])/.test(data.link)) throw new Error("Notification links must be paths in this app")

    await prisma.notification.create({
      data: {
        id: crypto.randomUUID(),
        type: data.type,
        title: data.title,
        description: data.description,
        link: data.link,
        userId: data.userId,
        tenantId,
        isRead: false,
      },
    })
  } catch (err) {
    console.error("createNotification exception:", err)
    throw err
  }
}
