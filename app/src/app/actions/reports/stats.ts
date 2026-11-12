"use server"

import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import { getTenantId, hasModuleAccess } from "@/lib/get-tenant-id"
import { CREDIT_APPLICATION_PREFIX } from "@/lib/ledger"

/** Issued tax invoices: counted as sales (drafts, proformas and cancelled ones aren't) */
const ISSUED = ["SENT", "VIEWED", "PARTIALLY_PAID", "PAID", "OVERDUE"] as const
/** Issued and not fully paid */
const OPEN = ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"] as const

export interface DashboardStats {
  currencyCode: string
  /** What the person may see: money figures need Sales or Finance, CRM figures need CRM */
  showMoney: boolean
  showCrm: boolean
  salesThisMonth: number
  invoicesThisMonth: number
  toCollect: number
  openInvoices: number
  overdueAmount: number
  overdueInvoices: number
  receivedThisMonth: number
  newLeadsThisMonth: number
  openDeals: number
  pipelineValue: number
}

function monthStart(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const tenantId = await getTenantId()
  const [sales, finance, crm, tenant] = await Promise.all([
    hasModuleAccess("sales", "VIEW"),
    hasModuleAccess("finance", "VIEW"),
    hasModuleAccess("crm", "VIEW"),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { currencyCode: true } }),
  ])
  const currencyCode = tenant?.currencyCode || ""
  const showMoney = sales || finance
  const now = new Date()
  const since = monthStart(now)
  // Figures in the business's own currency (invoices are created in it)
  const issuedWhere = { tenantId, type: "TAX_INVOICE" as const, currencyCode }

  const [monthSales, openTotals, openPaid, overdueTotals, overduePaid, received, leads, deals] = await Promise.all([
    showMoney ? prisma.invoice.aggregate({ where: { ...issuedWhere, status: { in: [...ISSUED] }, invoiceDate: { gte: since } }, _sum: { total: true }, _count: true }) : null,
    showMoney ? prisma.invoice.aggregate({ where: { ...issuedWhere, status: { in: [...OPEN] } }, _sum: { total: true }, _count: true }) : null,
    showMoney ? prisma.payment.aggregate({ where: { tenantId, invoice: { ...issuedWhere, status: { in: [...OPEN] } } }, _sum: { amount: true } }) : null,
    showMoney ? prisma.invoice.aggregate({ where: { ...issuedWhere, status: { in: [...OPEN] }, dueDate: { lt: now } }, _sum: { total: true }, _count: true }) : null,
    showMoney ? prisma.payment.aggregate({ where: { tenantId, invoice: { ...issuedWhere, status: { in: [...OPEN] }, dueDate: { lt: now } } }, _sum: { amount: true } }) : null,
    showMoney
      ? prisma.payment.aggregate({
          where: { tenantId, type: "INBOUND", currencyCode, paymentDate: { gte: since }, NOT: { reference: { startsWith: CREDIT_APPLICATION_PREFIX } } },
          _sum: { amount: true },
        })
      : null,
    crm ? prisma.lead.count({ where: { tenantId, createdAt: { gte: since } } }) : 0,
    crm ? prisma.deal.aggregate({ where: { tenantId, stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] } }, _sum: { value: true }, _count: true }) : null,
  ])

  const num = (v: unknown) => Number(v || 0)
  return {
    currencyCode,
    showMoney,
    showCrm: crm,
    salesThisMonth: num(monthSales?._sum.total),
    invoicesThisMonth: monthSales?._count ?? 0,
    toCollect: Math.max(0, num(openTotals?._sum.total) - num(openPaid?._sum.amount)),
    openInvoices: openTotals?._count ?? 0,
    overdueAmount: Math.max(0, num(overdueTotals?._sum.total) - num(overduePaid?._sum.amount)),
    overdueInvoices: overdueTotals?._count ?? 0,
    receivedThisMonth: num(received?._sum.amount),
    newLeadsThisMonth: leads,
    openDeals: deals?._count ?? 0,
    pipelineValue: num(deals?._sum.value),
  }
}

export interface DashboardMonth {
  name: string
  /** Issued invoices in the month (the business's currency) */
  sales: number
  leads: number
}

export async function getDashboardTrends(): Promise<DashboardMonth[]> {
  const tenantId = await getTenantId()
  const [sales, finance, crm, tenant] = await Promise.all([
    hasModuleAccess("sales", "VIEW"),
    hasModuleAccess("finance", "VIEW"),
    hasModuleAccess("crm", "VIEW"),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { currencyCode: true } }),
  ])

  const now = new Date()
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    return { name: d.toLocaleString("en-GB", { month: "short" }), month: d.getMonth(), year: d.getFullYear(), sales: 0, leads: 0 }
  })
  const since = new Date(months[0].year, months[0].month, 1)

  const [invoices, leads] = await Promise.all([
    sales || finance
      ? prisma.invoice.findMany({
          where: { tenantId, type: "TAX_INVOICE", currencyCode: tenant?.currencyCode || "", status: { in: [...ISSUED] }, invoiceDate: { gte: since } },
          select: { total: true, invoiceDate: true },
        })
      : [],
    crm ? prisma.lead.findMany({ where: { tenantId, createdAt: { gte: since } }, select: { createdAt: true } }) : [],
  ])

  const slot = (d: Date) => months.find((m) => m.month === d.getMonth() && m.year === d.getFullYear())
  for (const inv of invoices) {
    const m = slot(inv.invoiceDate)
    if (m) m.sales += Number(inv.total)
  }
  for (const l of leads) {
    const m = slot(l.createdAt)
    if (m) m.leads += 1
  }
  return months.map(({ name, sales, leads }) => ({ name, sales: Math.round(sales * 100) / 100, leads }))
}

export async function getRecentActivities() {
  const tenantId = await getTenantId()
  const [sales, crm, tenant] = await Promise.all([
    hasModuleAccess("sales", "VIEW"),
    hasModuleAccess("crm", "VIEW"),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { currencyCode: true } }),
  ])
  const currency = tenant?.currencyCode || ""

  // The most recent records from the main tables the person can see
  const [recentLeads, recentInvoices, recentPayments] = await Promise.all([
    crm ? prisma.lead.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, title: true, createdAt: true, contactName: true } }) : [],
    sales
      ? prisma.invoice.findMany({
          where: { tenantId, status: { not: "DRAFT" } },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { id: true, invoiceNumber: true, total: true, currencyCode: true, createdAt: true, contact: { select: { displayName: true } } },
        })
      : [],
    sales
      ? prisma.payment.findMany({
          where: { tenantId, type: "INBOUND", invoiceId: { not: null } },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { amount: true, currencyCode: true, createdAt: true, invoiceId: true, invoice: { select: { invoiceNumber: true } } },
        })
      : [],
  ])

  const activities = [
    ...recentLeads.map((l) => ({
      type: "lead" as const,
      message: `New lead: ${l.title}${l.contactName ? ` (${l.contactName})` : ""}`,
      href: `/crm/leads`,
      at: l.createdAt,
    })),
    ...recentInvoices.map((inv) => ({
      type: "invoice" as const,
      message: `Invoice ${inv.invoiceNumber}${inv.contact?.displayName ? ` to ${inv.contact.displayName}` : ""}: ${formatCurrency(Number(inv.total), inv.currencyCode || currency)}`,
      href: `/sales/invoices/${inv.id}`,
      at: inv.createdAt,
    })),
    ...recentPayments.map((p) => ({
      type: "payment" as const,
      message: `Payment received${p.invoice?.invoiceNumber ? ` for ${p.invoice.invoiceNumber}` : ""}: ${formatCurrency(Number(p.amount), p.currencyCode || currency)}`,
      href: p.invoiceId ? `/sales/invoices/${p.invoiceId}` : "/finance/payments",
      at: p.createdAt,
    })),
  ]

  return activities
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 6)
    .map(({ at, ...a }) => ({ ...a, at: at.toISOString() }))
}
