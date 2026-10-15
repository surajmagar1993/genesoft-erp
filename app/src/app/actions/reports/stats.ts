"use server"

import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import { getTenantId } from "@/lib/get-tenant-id"

export interface DashboardStats {
  totalContacts: number
  totalLeads: number
  activeDeals: number
  pipelineValue: number
  acceptedQuoteTotal: number
  recentQuotesCount: number
}

export async function getDashboardStats() {
  const tenantId = await getTenantId()

  // Pre-calculate date filter
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Parallelize all queries for faster dashboard load
  const [contactsCount, leadsCount, deals, acceptedQuotes, recentQuotesCount] = await Promise.all([
    prisma.contact.count({ where: { tenantId } }),
    prisma.lead.count({ where: { tenantId } }),
    prisma.deal.findMany({ where: { tenantId, stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] } }, select: { value: true } }),
    prisma.quote.aggregate({ where: { tenantId, status: "ACCEPTED" }, _sum: { total: true } }),
    prisma.quote.count({ where: { tenantId, createdAt: { gte: thirtyDaysAgo } } }),
  ])

  return {
    totalContacts: contactsCount,
    totalLeads: leadsCount,
    activeDeals: deals.length,
    pipelineValue: deals.reduce((sum, d) => sum + Number(d.value || 0), 0),
    acceptedQuoteTotal: Number(acceptedQuotes._sum.total || 0),
    recentQuotesCount,
  } as DashboardStats
}

export async function getDashboardTrends() {
  const tenantId = await getTenantId()

  // Last 6 months
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    months.push({
      name: d.toLocaleString('default', { month: 'short' }),
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      turnover: 0,
      leads: 0
    })
  }

  const since = new Date(new Date().setMonth(new Date().getMonth() - 6))
  const [quotes, leads] = await Promise.all([
    prisma.quote.findMany({ where: { tenantId, status: "ACCEPTED", createdAt: { gte: since } }, select: { total: true, createdAt: true } }),
    prisma.lead.findMany({ where: { tenantId, createdAt: { gte: since } }, select: { createdAt: true } }),
  ])

  months.forEach(m => {
    const inMonth = (d: Date) => d.getMonth() + 1 === m.month && d.getFullYear() === m.year
    m.turnover = quotes.filter((q) => inMonth(q.createdAt)).reduce((sum, q) => sum + Number(q.total), 0)
    m.leads = leads.filter((l) => inMonth(l.createdAt)).length
  })

  return months
}

export async function getRecentActivities() {
  const tenantId = await getTenantId()

  // The most recent records from the main tables
  const [recentLeads, recentQuotes, tenant] = await Promise.all([
    prisma.lead.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 3, select: { title: true, createdAt: true, contactName: true } }),
    prisma.quote.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 3, select: { quoteNumber: true, customerName: true, total: true, currencyCode: true, createdAt: true } }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { currencyCode: true } }),
  ])

  const activities = [
    ...recentLeads.map((l) => ({
      type: "lead",
      message: `New Lead: ${l.title}${l.contactName ? ` (from ${l.contactName})` : ""}`,
      at: l.createdAt,
    })),
    ...recentQuotes.map((q) => ({
      type: "quote",
      message: `Quote Created: ${q.quoteNumber} for ${q.customerName} (${formatCurrency(Number(q.total), q.currencyCode || tenant?.currencyCode || "INR")})`,
      at: q.createdAt,
    })),
  ]

  return activities
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 5)
    .map(({ at, ...a }) => ({ ...a, time: at.toLocaleString() }))
}
