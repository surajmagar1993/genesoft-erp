"use server"

import { createClient } from "@/lib/supabase/server"
import { getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"

export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE"

export interface Account {
  id: string
  tenant_id: string
  code: string
  name: string
  type: AccountType
  parent_id: string | null
  is_group: boolean
  description: string | null
  balance: number
  currency_code: string
  is_active: boolean
  is_system: boolean
  created_at: string
  updated_at: string
  // Virtual (populated in tree building)
  children?: Account[]
  depth?: number
}

/* ── Read All ── */
export async function getAccounts(page: number = 1, limit: number = 100): Promise<{ data: Account[]; total: number }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()
  const offset = (page - 1) * limit

  const { data, count, error } = await supabase
    .from("accounts")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .range(offset, offset + limit - 1)
    .order("code", { ascending: true })

  if (error) {
    console.error("Error fetching accounts:", error.message)
    return { data: [], total: 0 }
  }
  return { data: data ?? [], total: count || 0 }
}

/* ── Get By ID ── */
export async function getAccountById(id: string): Promise<Account | null> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single()

  if (error) return null
  return data
}

/* ── Create ── */
export async function createAccount(
  formData: Omit<Account, "id" | "created_at" | "updated_at" | "tenant_id" | "children" | "depth">
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { error } = await supabase
    .from("accounts")
    .insert([{ ...formData, tenant_id: tenantId }])

  if (error) return { error: error.message }
  revalidatePath("/finance/accounts")
  return { error: null }
}

/* ── Update ── */
export async function updateAccount(
  id: string,
  formData: Partial<Omit<Account, "id" | "created_at" | "updated_at" | "tenant_id" | "children" | "depth">>
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { error } = await supabase
    .from("accounts")
    .update(formData)
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (error) return { error: error.message }
  revalidatePath("/finance/accounts")
  return { error: null }
}

/* ── Delete ── */
export async function deleteAccount(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  // Check if system account
  const { data: account } = await supabase
    .from("accounts")
    .select("is_system, is_group, balance")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single()

  if (account?.is_system) return { error: "Cannot delete system accounts" }
  if (Number(account?.balance || 0) !== 0) return { error: "Cannot delete account with a non-zero balance" }

  // Check if has children
  const { data: children } = await supabase
    .from("accounts")
    .select("id")
    .eq("parent_id", id)
    .eq("tenant_id", tenantId)
    .limit(1)

  if (children && children.length > 0) {
    return { error: "Cannot delete account with sub-accounts. Delete children first." }
  }

  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (error) return { error: error.message }
  revalidatePath("/finance/accounts")
  return { error: null }
}

/* ── Seed Default Indian CoA ── */
export async function seedDefaultAccounts(): Promise<{ error: string | null; count: number }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  // Check if already seeded
  const { data: existing } = await supabase
    .from("accounts")
    .select("id")
    .eq("tenant_id", tenantId)
    .limit(1)

  if (existing && existing.length > 0) {
    return { error: "Accounts already exist. Seed skipped.", count: 0 }
  }

  const defaultAccounts: Omit<Account, "id" | "created_at" | "updated_at" | "children" | "depth">[] = [
    // ASSETS (1xxx)
    { tenant_id: tenantId, code: "1000", name: "Assets", type: "ASSET", parent_id: null, is_group: true, description: "All asset accounts", balance: 0, currency_code: "INR", is_active: true, is_system: true },
    { tenant_id: tenantId, code: "1100", name: "Current Assets", type: "ASSET", parent_id: null, is_group: true, description: null, balance: 0, currency_code: "INR", is_active: true, is_system: true },
    { tenant_id: tenantId, code: "1110", name: "Cash", type: "ASSET", parent_id: null, is_group: false, description: "Cash in hand", balance: 0, currency_code: "INR", is_active: true, is_system: true },
    { tenant_id: tenantId, code: "1120", name: "Bank", type: "ASSET", parent_id: null, is_group: false, description: "Bank accounts", balance: 0, currency_code: "INR", is_active: true, is_system: true },
    { tenant_id: tenantId, code: "1200", name: "Accounts Receivable", type: "ASSET", parent_id: null, is_group: false, description: "Money owed by customers", balance: 0, currency_code: "INR", is_active: true, is_system: true },
    { tenant_id: tenantId, code: "1300", name: "Inventory", type: "ASSET", parent_id: null, is_group: false, description: "Stock on hand", balance: 0, currency_code: "INR", is_active: true, is_system: false },
    { tenant_id: tenantId, code: "1400", name: "Prepaid Expenses", type: "ASSET", parent_id: null, is_group: false, description: null, balance: 0, currency_code: "INR", is_active: true, is_system: false },
    { tenant_id: tenantId, code: "1500", name: "Fixed Assets", type: "ASSET", parent_id: null, is_group: true, description: "Property, plant & equipment", balance: 0, currency_code: "INR", is_active: true, is_system: false },
    { tenant_id: tenantId, code: "1510", name: "Furniture & Fixtures", type: "ASSET", parent_id: null, is_group: false, description: null, balance: 0, currency_code: "INR", is_active: true, is_system: false },
    { tenant_id: tenantId, code: "1520", name: "Office Equipment", type: "ASSET", parent_id: null, is_group: false, description: null, balance: 0, currency_code: "INR", is_active: true, is_system: false },

    // LIABILITIES (2xxx)
    { tenant_id: tenantId, code: "2000", name: "Liabilities", type: "LIABILITY", parent_id: null, is_group: true, description: "All liability accounts", balance: 0, currency_code: "INR", is_active: true, is_system: true },
    { tenant_id: tenantId, code: "2100", name: "Accounts Payable", type: "LIABILITY", parent_id: null, is_group: false, description: "Money owed to suppliers", balance: 0, currency_code: "INR", is_active: true, is_system: true },
    { tenant_id: tenantId, code: "2200", name: "GST Payable", type: "LIABILITY", parent_id: null, is_group: true, description: null, balance: 0, currency_code: "INR", is_active: true, is_system: true },
    { tenant_id: tenantId, code: "2210", name: "CGST Payable", type: "LIABILITY", parent_id: null, is_group: false, description: null, balance: 0, currency_code: "INR", is_active: true, is_system: true },
    { tenant_id: tenantId, code: "2220", name: "SGST Payable", type: "LIABILITY", parent_id: null, is_group: false, description: null, balance: 0, currency_code: "INR", is_active: true, is_system: true },
    { tenant_id: tenantId, code: "2230", name: "IGST Payable", type: "LIABILITY", parent_id: null, is_group: false, description: null, balance: 0, currency_code: "INR", is_active: true, is_system: true },
    { tenant_id: tenantId, code: "2300", name: "TDS Payable", type: "LIABILITY", parent_id: null, is_group: false, description: "Tax Deducted at Source", balance: 0, currency_code: "INR", is_active: true, is_system: false },
    { tenant_id: tenantId, code: "2400", name: "Salary Payable", type: "LIABILITY", parent_id: null, is_group: false, description: null, balance: 0, currency_code: "INR", is_active: true, is_system: false },
    { tenant_id: tenantId, code: "2500", name: "Loans & Borrowings", type: "LIABILITY", parent_id: null, is_group: false, description: null, balance: 0, currency_code: "INR", is_active: true, is_system: false },

    // EQUITY (3xxx)
    { tenant_id: tenantId, code: "3000", name: "Equity", type: "EQUITY", parent_id: null, is_group: true, description: "Owner's equity", balance: 0, currency_code: "INR", is_active: true, is_system: true },
    { tenant_id: tenantId, code: "3100", name: "Owner's Capital", type: "EQUITY", parent_id: null, is_group: false, description: null, balance: 0, currency_code: "INR", is_active: true, is_system: true },
    { tenant_id: tenantId, code: "3200", name: "Retained Earnings", type: "EQUITY", parent_id: null, is_group: false, description: null, balance: 0, currency_code: "INR", is_active: true, is_system: true },
    { tenant_id: tenantId, code: "3300", name: "Owner's Drawings", type: "EQUITY", parent_id: null, is_group: false, description: null, balance: 0, currency_code: "INR", is_active: true, is_system: false },

    // REVENUE (4xxx)
    { tenant_id: tenantId, code: "4000", name: "Revenue", type: "REVENUE", parent_id: null, is_group: true, description: "All income accounts", balance: 0, currency_code: "INR", is_active: true, is_system: true },
    { tenant_id: tenantId, code: "4100", name: "Sales Revenue", type: "REVENUE", parent_id: null, is_group: false, description: "Income from sales", balance: 0, currency_code: "INR", is_active: true, is_system: true },
    { tenant_id: tenantId, code: "4200", name: "Service Revenue", type: "REVENUE", parent_id: null, is_group: false, description: "Income from services", balance: 0, currency_code: "INR", is_active: true, is_system: false },
    { tenant_id: tenantId, code: "4300", name: "Interest Income", type: "REVENUE", parent_id: null, is_group: false, description: null, balance: 0, currency_code: "INR", is_active: true, is_system: false },
    { tenant_id: tenantId, code: "4400", name: "Other Income", type: "REVENUE", parent_id: null, is_group: false, description: null, balance: 0, currency_code: "INR", is_active: true, is_system: false },

    // EXPENSES (5xxx)
    { tenant_id: tenantId, code: "5000", name: "Expenses", type: "EXPENSE", parent_id: null, is_group: true, description: "All expense accounts", balance: 0, currency_code: "INR", is_active: true, is_system: true },
    { tenant_id: tenantId, code: "5100", name: "Cost of Goods Sold", type: "EXPENSE", parent_id: null, is_group: false, description: "Direct costs", balance: 0, currency_code: "INR", is_active: true, is_system: true },
    { tenant_id: tenantId, code: "5200", name: "Salaries & Wages", type: "EXPENSE", parent_id: null, is_group: false, description: null, balance: 0, currency_code: "INR", is_active: true, is_system: false },
    { tenant_id: tenantId, code: "5300", name: "Rent", type: "EXPENSE", parent_id: null, is_group: false, description: null, balance: 0, currency_code: "INR", is_active: true, is_system: false },
    { tenant_id: tenantId, code: "5400", name: "Utilities", type: "EXPENSE", parent_id: null, is_group: false, description: null, balance: 0, currency_code: "INR", is_active: true, is_system: false },
    { tenant_id: tenantId, code: "5500", name: "Office Supplies", type: "EXPENSE", parent_id: null, is_group: false, description: null, balance: 0, currency_code: "INR", is_active: true, is_system: false },
    { tenant_id: tenantId, code: "5600", name: "Marketing & Advertising", type: "EXPENSE", parent_id: null, is_group: false, description: null, balance: 0, currency_code: "INR", is_active: true, is_system: false },
    { tenant_id: tenantId, code: "5700", name: "Insurance", type: "EXPENSE", parent_id: null, is_group: false, description: null, balance: 0, currency_code: "INR", is_active: true, is_system: false },
    { tenant_id: tenantId, code: "5800", name: "Depreciation", type: "EXPENSE", parent_id: null, is_group: false, description: null, balance: 0, currency_code: "INR", is_active: true, is_system: false },
    { tenant_id: tenantId, code: "5900", name: "Bank Charges", type: "EXPENSE", parent_id: null, is_group: false, description: null, balance: 0, currency_code: "INR", is_active: true, is_system: false },
    { tenant_id: tenantId, code: "5950", name: "Miscellaneous Expenses", type: "EXPENSE", parent_id: null, is_group: false, description: null, balance: 0, currency_code: "INR", is_active: true, is_system: false },
  ]

  const { error } = await supabase
    .from("accounts")
    .insert(defaultAccounts)

  if (error) return { error: error.message, count: 0 }
  
  revalidatePath("/finance/accounts")
  return { error: null, count: defaultAccounts.length }
}
