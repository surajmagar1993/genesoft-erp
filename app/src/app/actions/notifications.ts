"use server"

import { createClient } from "@/lib/supabase/server"
import { getTenantId } from "@/lib/get-tenant-id"
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return []

    const tenantId = await getTenantId()

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) {
      console.error("getNotifications error:", error.message)
      return []
    }

    return (data as Notification[]) || []
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    const { error } = await supabase
      .from("notifications")
      .update({ 
        is_read: true, 
        updated_at: new Date().toISOString() 
      })
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      console.error("markNotificationAsRead error:", error.message)
      return
    }

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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    const tenantId = await getTenantId()

    const { error } = await supabase
      .from("notifications")
      .update({ 
        is_read: true, 
        updated_at: new Date().toISOString() 
      })
      .eq("user_id", user.id)
      .eq("tenant_id", tenantId)
      .eq("is_read", false)

    if (error) {
      console.error("markAllAsRead error:", error.message)
      return
    }

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
    const supabase = await createClient()

    const { error } = await supabase
      .from("notifications")
      .insert({
        id: crypto.randomUUID(),
        type: data.type,
        title: data.title,
        description: data.description,
        link: data.link,
        user_id: data.userId,
        tenant_id: data.tenantId,
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (error) {
      console.error("createNotification error:", error.message)
      throw new Error(error.message)
    }
  } catch (err) {
    console.error("createNotification exception:", err)
    throw err
  }
}
