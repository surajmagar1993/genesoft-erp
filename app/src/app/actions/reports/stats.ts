"use server"

import { createClient } from "@/lib/supabase/server"
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
  const supabase = await createClient()
  const tenantId = await getTenantId()

  // Pre-calculate date filter
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Parallelize all queries for faster dashboard load
  const [
    { count: contactsCount },
    { count: leadsCount },
    { data: deals },
    { data: acceptedQuotes },
    { count: recentQuotesCount }
  ] = await Promise.all([
    supabase.from("contacts").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
    supabase.from("deals").select("value").eq("tenant_id", tenantId).not("stage", "in", '("CLOSED_WON","CLOSED_LOST")'),
    supabase.from("quotes").select("total").eq("tenant_id", tenantId).eq("status", "ACCEPTED"),
    supabase.from("quotes").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("created_at", thirtyDaysAgo.toISOString())
  ])

  const pipelineValue = deals?.reduce((sum, d) => sum + Number(d.value || 0), 0) || 0
  const activeDeals = deals?.length || 0
  const acceptedQuoteTotal = acceptedQuotes?.reduce((sum, q) => sum + Number(q.total || 0), 0) || 0

  return {
    totalContacts: contactsCount || 0,
    totalLeads: leadsCount || 0,
    activeDeals,
    pipelineValue,
    acceptedQuoteTotal,
    recentQuotesCount: recentQuotesCount || 0,
  } as DashboardStats
}

export async function getDashboardTrends() {
  const supabase = await createClient()
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

  // In a real scenario, we'd do a group by in SQL. 
  // For P1 MVP, we'll fetch accepted quotes and group them.
  const { data: quotes } = await supabase
    .from("quotes")
    .select("total, created_at")
    .eq("tenant_id", tenantId)
    .eq("status", "ACCEPTED")
    .gte("created_at", new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString())

  const { data: leads } = await supabase
    .from("leads")
    .select("created_at")
    .eq("tenant_id", tenantId)
    .gte("created_at", new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString())

  months.forEach(m => {
    m.turnover = quotes?.filter(q => {
      const qd = new Date(q.created_at)
      return qd.getMonth() + 1 === m.month && qd.getFullYear() === m.year
    }).reduce((sum, q) => sum + Number(q.total), 0) || 0

    m.leads = leads?.filter(l => {
      const ld = new Date(l.created_at)
      return ld.getMonth() + 1 === m.month && ld.getFullYear() === m.year
    }).length || 0
  })

  return months
}

export async function getRecentActivities() {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  // For P1 MVP, we fetch the most recent records from major tables
  // In P2, we'll create a dedicated AuditLog table
  const { data: recentLeads } = await supabase
    .from("leads")
    .select("title, created_at, contact_name")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(3)

  const { data: recentQuotes } = await supabase
    .from("quotes")
    .select("quote_number, customer_name, total, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(3)

  const activities = [
    ...(recentLeads?.map(l => ({
      type: "lead",
      message: `New Lead: ${l.title} (from ${l.contact_name})`,
      time: new Date(l.created_at).toLocaleString()
    })) || []),
    ...(recentQuotes?.map(q => ({
      type: "quote",
      message: `Quote Created: ${q.quote_number} for ${q.customer_name} (₹${Number(q.total).toLocaleString()})`,
      time: new Date(q.created_at).toLocaleString()
    })) || [])
  ]

  return activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5)
}
