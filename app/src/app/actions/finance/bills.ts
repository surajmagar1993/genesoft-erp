"use server"

import { createClient } from "@/lib/supabase/server"
import { getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"

export type BillStatus = "DRAFT" | "OPEN" | "PARTIALLY_PAID" | "PAID" | "VOID"

export interface BillItem {
  id?: string
  productId?: string
  description: string
  hsnSacCode?: string
  quantity: number
  unitPrice: number
  taxPercent: number
  taxAmount: number
  lineTotal: number
}

export interface BillData {
  contactId: string
  billNumber: string
  status: BillStatus
  billDate: Date
  dueDate?: Date
  subtotal: number
  taxAmount: number
  discount: number
  total: number
  currencyCode: string
  notes?: string
  items: BillItem[]
}

/**
 * Fetch all bills for the current tenant
 */
export async function getBills() {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { data, error } = await supabase
    .from("bills")
    .select(`
      *,
      contact:contacts(display_name, company_name)
    `)
    .eq("tenant_id", tenantId)
    .order("bill_date", { ascending: false })

  if (error) {
    console.error("getBills error:", error.message)
    return []
  }
  return data ?? []
}

/* ── Read Single Bill ── */
export async function getBill(id: string): Promise<any | null> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { data, error } = await supabase
    .from("bills")
    .select(`
      *,
      bill_items (*),
      contacts (display_name, email, phone, company_name, billing_address),
      payments (*)
    `)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single()

  if (error) {
    console.error("getBill error:", error.message)
    return null
  }
  return data
}

/**
 * Fetch a single bill by ID with its items
 */
export async function getBillById(id: string) {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { data: bill, error: billError } = await supabase
    .from("bills")
    .select(`
      *,
      contact:contacts(*),
      items:bill_items(*)
    `)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single()

  if (billError) {
    console.error("Error fetching bill:", billError)
    throw new Error("Failed to fetch bill")
  }

  return bill
}

/**
 * Create a new vendor bill
 */
import { createNotification } from "@/app/actions/notifications"

export async function createBill(data: BillData) {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { data: bill, error: billError } = await supabase
    .from("bills")
    .insert({
      tenant_id: tenantId,
      contact_id: data.contactId,
      bill_number: data.billNumber,
      status: data.status,
      bill_date: data.billDate.toISOString(),
      due_date: data.dueDate?.toISOString(),
      subtotal: data.subtotal,
      tax_amount: data.taxAmount,
      discount: data.discount,
      total: data.total,
      currency_code: data.currencyCode,
      notes: data.notes
    })
    .select()
    .single()

  if (billError) {
    console.error("Error creating bill:", billError)
    throw new Error(billError.message)
  }

  // Create notification for bill creation
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    try {
      await createNotification({
        type: "bill",
        title: "New Purchase Bill",
        description: `Bill ${data.billNumber} for ${data.total} ${data.currencyCode} has been created.`,
        link: `/finance/bills/${bill.id}`,
        userId: user.id,
        tenantId: tenantId,
      })
    } catch (e) {
      console.error("Failed to notify:", e)
    }
  }

  // 2. Insert bill items
  const billItems = data.items.map(item => ({
    bill_id: bill.id,
    product_id: item.productId,
    description: item.description,
    hsn_sac_code: item.hsnSacCode,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    tax_percent: item.taxPercent,
    tax_amount: item.taxAmount,
    line_total: item.lineTotal
  }))

  const { error: itemsError } = await supabase
    .from("bill_items")
    .insert(billItems)

  if (itemsError) {
    console.error("Error creating bill items:", itemsError)
    // Consider deleting the bill header here if items fail (transactional)
    await supabase.from("bills").delete().eq("id", bill.id)
    throw new Error("Failed to create bill items")
  }

  revalidatePath("/finance/bills")
  revalidatePath("/finance/payable")
  return bill
}

/**
 * Update an existing bill
 */
export async function updateBill(id: string, data: Partial<BillData>) {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  // Update header
  const { error: updateError } = await supabase
    .from("bills")
    .update({
      contact_id: data.contactId,
      bill_number: data.billNumber,
      status: data.status,
      bill_date: data.billDate?.toISOString(),
      due_date: data.dueDate?.toISOString(),
      subtotal: data.subtotal,
      tax_amount: data.taxAmount,
      discount: data.discount,
      total: data.total,
      notes: data.notes,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (updateError) {
    console.error("Error updating bill:", updateError)
    throw new Error("Failed to update bill")
  }

  // Update items if provided (Delete and recreate is simplest for MVP)
  if (data.items) {
    await supabase.from("bill_items").delete().eq("bill_id", id)
    
    const billItems = data.items.map(item => ({
      bill_id: id,
      product_id: item.productId,
      description: item.description,
      hsn_sac_code: item.hsnSacCode,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      tax_percent: item.taxPercent,
      tax_amount: item.taxAmount,
      line_total: item.lineTotal
    }))

    const { error: itemsError } = await supabase
      .from("bill_items")
      .insert(billItems)

    if (itemsError) {
      throw new Error("Failed to update bill items")
    }
  }

  revalidatePath("/finance/bills")
  revalidatePath(`/finance/bills/${id}`)
  revalidatePath("/finance/payable")
}

/**
 * Delete a bill
 */
export async function deleteBill(id: string): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()
    const tenantId = await getTenantId()

    const { error } = await supabase
      .from("bills")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId)

    if (error) {
      console.error("Error deleting bill:", error)
      return { error: error.message }
    }

    revalidatePath("/finance/bills")
    revalidatePath("/finance/payable")
    return { error: null }
  } catch (err: any) {
    return { error: err.message || "Failed to delete bill" }
  }
}

/**
 * Update bill status manually
 */
export async function updateBillStatus(id: string, status: BillStatus) {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { error } = await supabase
    .from("bills")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (error) {
    throw new Error("Failed to update bill status")
  }

  revalidatePath("/finance/bills")
  revalidatePath(`/finance/bills/${id}`)
}

/**
 * Fetch vendors for the bill form
 */
export async function getVendors() {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { data, error } = await supabase
    .from("contacts")
    .select("id, display_name, company_name")
    .eq("tenant_id", tenantId)
    // .eq("type", "VENDOR") // Optional: filtering by type if enforced
    .eq("is_active", true)
    .order("display_name")

  if (error) throw new Error("Failed to fetch vendors")
  return data
}

/**
 * Fetch products for the bill form
 */
export async function getProducts() {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { data, error } = await supabase
    .from("products")
    .select("id, name, sku, unit_price, hsn_sac_code")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("name")

  if (error) throw new Error("Failed to fetch products")
  return data
}
