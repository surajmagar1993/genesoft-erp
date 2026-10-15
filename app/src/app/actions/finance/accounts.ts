"use server"

import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"
import { fromRow, toRow, toRows } from "@/lib/pg-row"
import { assertTenantRefs } from "@/lib/tenant-refs"
import { isUuid } from "@/lib/utils"
import { getTenantTaxContext } from "@/lib/tenant-tax"
import { adaptTaxAccounts } from "@/lib/default-accounts"
import { getTenantId, getTenantManagerId } from "@/lib/get-tenant-id"
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
  try {
    const tenantId = await getTenantId()
    const [rows, total] = await Promise.all([
      prisma.account.findMany({ where: { tenantId }, orderBy: { code: "asc" }, skip: (page - 1) * limit, take: limit }),
      prisma.account.count({ where: { tenantId } }),
    ])
    return { data: toRows<Account>("Account", rows), total }
  } catch (err) {
    console.error("Error fetching accounts:", err)
    return { data: [], total: 0 }
  }
}

/* ── Get By ID ── */
export async function getAccountById(id: string): Promise<Account | null> {
  if (!isUuid(id)) return null
  const tenantId = await getTenantId()
  const row = await prisma.account.findFirst({ where: { id, tenantId } })
  return row ? toRow<Account>("Account", row) : null
}

/** Form fields → Prisma data. The balance only changes through journal entries (General Ledger). */
async function accountData(tenantId: string, formData: object) {
  const { balance: _ignored, ...rest } = formData as Record<string, unknown> & { balance?: unknown }
  const data = fromRow("Account", rest) as Prisma.AccountUncheckedUpdateManyInput
  if (typeof data.parentId === "string") await assertTenantRefs(tenantId, { account: data.parentId })
  return data
}

/* ── Create ── */
export async function createAccount(
  formData: Omit<Account, "id" | "created_at" | "updated_at" | "tenant_id" | "children" | "depth">
): Promise<{ error: string | null }> {
  try {
    const tenantId = await getTenantManagerId()
    const data = (await accountData(tenantId, formData)) as Omit<Prisma.AccountUncheckedCreateInput, "tenantId">
    await prisma.account.create({ data: { ...data, balance: 0, tenantId } })
  } catch (err) {
    if ((err as { code?: string })?.code === "P2002") return { error: "An account with this code already exists" }
    return { error: err instanceof Error ? err.message : "Failed to create account" }
  }
  revalidatePath("/finance/accounts")
  return { error: null }
}

/* ── Update ── */
export async function updateAccount(
  id: string,
  formData: Partial<Omit<Account, "id" | "created_at" | "updated_at" | "tenant_id" | "children" | "depth">>
): Promise<{ error: string | null }> {
  try {
    const tenantId = await getTenantManagerId()
    const data = await accountData(tenantId, formData)
    if (data.parentId === id) return { error: "An account can't be its own parent" }
    const { count } = await prisma.account.updateMany({ where: { id, tenantId }, data })
    if (count === 0) return { error: "Account not found" }
  } catch (err) {
    if ((err as { code?: string })?.code === "P2002") return { error: "An account with this code already exists" }
    return { error: err instanceof Error ? err.message : "Failed to update account" }
  }
  revalidatePath("/finance/accounts")
  return { error: null }
}

/* ── Delete ── */
export async function deleteAccount(id: string): Promise<{ error: string | null }> {
  const tenantId = await getTenantManagerId()

  // Check if system account
  const account = isUuid(id) ? await prisma.account.findFirst({ where: { id, tenantId }, select: { isSystem: true, balance: true } }) : null
  if (!account) return { error: "Account not found" }
  if (account.isSystem) return { error: "Cannot delete system accounts" }
  if (Number(account.balance || 0) !== 0) return { error: "Cannot delete account with a non-zero balance" }

  // Check if has children
  if (await prisma.account.count({ where: { parentId: id, tenantId } })) {
    return { error: "Cannot delete account with sub-accounts. Delete children first." }
  }

  try {
    await prisma.account.deleteMany({ where: { id, tenantId } })
  } catch (err) {
    if ((err as { code?: string })?.code === "P2003") return { error: "This account has journal entries or is used by other records, so it can't be deleted. Mark it inactive instead." }
    return { error: err instanceof Error ? err.message : "Failed to delete account" }
  }
  revalidatePath("/finance/accounts")
  return { error: null }
}

/* ── Seed Default Indian CoA ── */
export async function seedDefaultAccounts(): Promise<{ error: string | null; count: number }> {
  const tenantId = await getTenantManagerId()

  // Check if already seeded
  if (await prisma.account.count({ where: { tenantId } })) {
    return { error: "Accounts already exist. Seed skipped.", count: 0 }
  }

  const taxCtx = await getTenantTaxContext(tenantId)
  const defaultAccounts: Omit<Account, "id" | "created_at" | "updated_at" | "children" | "depth">[] = adaptTaxAccounts([
    // ASSETS (1xxx)
    { tenant_id: tenantId, code: "1000", name: "Assets", type: "ASSET", parent_id: null, is_group: true, description: "All asset accounts", balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: true },
    { tenant_id: tenantId, code: "1100", name: "Current Assets", type: "ASSET", parent_id: null, is_group: true, description: null, balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: true },
    { tenant_id: tenantId, code: "1110", name: "Cash", type: "ASSET", parent_id: null, is_group: false, description: "Cash in hand", balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: true },
    { tenant_id: tenantId, code: "1120", name: "Bank", type: "ASSET", parent_id: null, is_group: false, description: "Bank accounts", balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: true },
    { tenant_id: tenantId, code: "1200", name: "Accounts Receivable", type: "ASSET", parent_id: null, is_group: false, description: "Money owed by customers", balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: true },
    { tenant_id: tenantId, code: "1300", name: "Inventory", type: "ASSET", parent_id: null, is_group: false, description: "Stock on hand", balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: false },
    { tenant_id: tenantId, code: "1400", name: "Prepaid Expenses", type: "ASSET", parent_id: null, is_group: false, description: null, balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: false },
    { tenant_id: tenantId, code: "1500", name: "Fixed Assets", type: "ASSET", parent_id: null, is_group: true, description: "Property, plant & equipment", balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: false },
    { tenant_id: tenantId, code: "1510", name: "Furniture & Fixtures", type: "ASSET", parent_id: null, is_group: false, description: null, balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: false },
    { tenant_id: tenantId, code: "1520", name: "Office Equipment", type: "ASSET", parent_id: null, is_group: false, description: null, balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: false },

    // LIABILITIES (2xxx)
    { tenant_id: tenantId, code: "2000", name: "Liabilities", type: "LIABILITY", parent_id: null, is_group: true, description: "All liability accounts", balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: true },
    { tenant_id: tenantId, code: "2100", name: "Accounts Payable", type: "LIABILITY", parent_id: null, is_group: false, description: "Money owed to suppliers", balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: true },
    { tenant_id: tenantId, code: "2200", name: "GST Payable", type: "LIABILITY", parent_id: null, is_group: true, description: null, balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: true },
    { tenant_id: tenantId, code: "2210", name: "CGST Payable", type: "LIABILITY", parent_id: null, is_group: false, description: null, balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: true },
    { tenant_id: tenantId, code: "2220", name: "SGST Payable", type: "LIABILITY", parent_id: null, is_group: false, description: null, balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: true },
    { tenant_id: tenantId, code: "2230", name: "IGST Payable", type: "LIABILITY", parent_id: null, is_group: false, description: null, balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: true },
    { tenant_id: tenantId, code: "2300", name: "TDS Payable", type: "LIABILITY", parent_id: null, is_group: false, description: "Tax Deducted at Source", balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: false },
    { tenant_id: tenantId, code: "2400", name: "Salary Payable", type: "LIABILITY", parent_id: null, is_group: false, description: null, balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: false },
    { tenant_id: tenantId, code: "2500", name: "Loans & Borrowings", type: "LIABILITY", parent_id: null, is_group: false, description: null, balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: false },

    // EQUITY (3xxx)
    { tenant_id: tenantId, code: "3000", name: "Equity", type: "EQUITY", parent_id: null, is_group: true, description: "Owner's equity", balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: true },
    { tenant_id: tenantId, code: "3100", name: "Owner's Capital", type: "EQUITY", parent_id: null, is_group: false, description: null, balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: true },
    { tenant_id: tenantId, code: "3200", name: "Retained Earnings", type: "EQUITY", parent_id: null, is_group: false, description: null, balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: true },
    { tenant_id: tenantId, code: "3300", name: "Owner's Drawings", type: "EQUITY", parent_id: null, is_group: false, description: null, balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: false },

    // REVENUE (4xxx)
    { tenant_id: tenantId, code: "4000", name: "Revenue", type: "REVENUE", parent_id: null, is_group: true, description: "All income accounts", balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: true },
    { tenant_id: tenantId, code: "4100", name: "Sales Revenue", type: "REVENUE", parent_id: null, is_group: false, description: "Income from sales", balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: true },
    { tenant_id: tenantId, code: "4200", name: "Service Revenue", type: "REVENUE", parent_id: null, is_group: false, description: "Income from services", balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: false },
    { tenant_id: tenantId, code: "4300", name: "Interest Income", type: "REVENUE", parent_id: null, is_group: false, description: null, balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: false },
    { tenant_id: tenantId, code: "4400", name: "Other Income", type: "REVENUE", parent_id: null, is_group: false, description: null, balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: false },

    // EXPENSES (5xxx)
    { tenant_id: tenantId, code: "5000", name: "Expenses", type: "EXPENSE", parent_id: null, is_group: true, description: "All expense accounts", balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: true },
    { tenant_id: tenantId, code: "5100", name: "Cost of Goods Sold", type: "EXPENSE", parent_id: null, is_group: false, description: "Direct costs", balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: true },
    { tenant_id: tenantId, code: "5200", name: "Salaries & Wages", type: "EXPENSE", parent_id: null, is_group: false, description: null, balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: false },
    { tenant_id: tenantId, code: "5300", name: "Rent", type: "EXPENSE", parent_id: null, is_group: false, description: null, balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: false },
    { tenant_id: tenantId, code: "5400", name: "Utilities", type: "EXPENSE", parent_id: null, is_group: false, description: null, balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: false },
    { tenant_id: tenantId, code: "5500", name: "Office Supplies", type: "EXPENSE", parent_id: null, is_group: false, description: null, balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: false },
    { tenant_id: tenantId, code: "5600", name: "Marketing & Advertising", type: "EXPENSE", parent_id: null, is_group: false, description: null, balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: false },
    { tenant_id: tenantId, code: "5700", name: "Insurance", type: "EXPENSE", parent_id: null, is_group: false, description: null, balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: false },
    { tenant_id: tenantId, code: "5800", name: "Depreciation", type: "EXPENSE", parent_id: null, is_group: false, description: null, balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: false },
    { tenant_id: tenantId, code: "5900", name: "Bank Charges", type: "EXPENSE", parent_id: null, is_group: false, description: null, balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: false },
    { tenant_id: tenantId, code: "5950", name: "Miscellaneous Expenses", type: "EXPENSE", parent_id: null, is_group: false, description: null, balance: 0, currency_code: taxCtx.currency, is_active: true, is_system: false },
  ], taxCtx.regime)

  try {
    await prisma.account.createMany({ data: defaultAccounts.map((a) => ({ ...(fromRow("Account", a) as Omit<Prisma.AccountCreateManyInput, "tenantId">), tenantId })) })
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create accounts", count: 0 }
  }
  
  revalidatePath("/finance/accounts")
  return { error: null, count: defaultAccounts.length }
}
