import {
  Users,
  Target,
  Handshake,
  Building2,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

async function getCRMStats() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { count: contactsCount },
    { count: leadsCount },
    { count: dealsCount },
    { count: companiesCount },
    { data: recentLeads },
    { data: recentDeals },
  ] = await Promise.all([
    supabase.from("contacts").select("*", { count: "exact", head: true }),
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase.from("deals").select("*", { count: "exact", head: true }),
    supabase.from("companies").select("*", { count: "exact", head: true }),
    supabase
      .from("leads")
      .select("id, name, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("deals")
      .select("id, title, stage, value, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return {
    contacts: contactsCount ?? 0,
    leads: leadsCount ?? 0,
    deals: dealsCount ?? 0,
    companies: companiesCount ?? 0,
    recentLeads: recentLeads ?? [],
    recentDeals: recentDeals ?? [],
  };
}

export default async function CRMPage() {
  const stats = await getCRMStats();

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-white/90">CRM Dashboard</h1>
        <div className="flex items-center space-x-2">
          <Link href="/crm/deals/new">
            <Button className="bg-blue-600 hover:bg-blue-500 text-white">
              Create Deal
            </Button>
          </Link>
        </div>
      </div>

      {/* Live KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/70">
              Total Leads
            </CardTitle>
            <Target className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.leads}</div>
            <p className="text-xs text-white/50 mt-1">
              <Link href="/crm/leads" className="text-blue-400 hover:underline inline-flex items-center">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                View all leads
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/70">
              Active Deals
            </CardTitle>
            <Handshake className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.deals}</div>
            <p className="text-xs text-white/50 mt-1">
              <Link href="/crm/deals" className="text-purple-400 hover:underline inline-flex items-center">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                View all deals
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/70">
              Total Contacts
            </CardTitle>
            <Users className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.contacts}</div>
            <p className="text-xs text-white/50 mt-1">
              <Link href="/crm/contacts" className="text-green-400 hover:underline inline-flex items-center">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                View all contacts
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/70">
              Companies
            </CardTitle>
            <Building2 className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.companies}</div>
            <p className="text-xs text-white/50 mt-1">
              <Link href="/crm/companies" className="text-amber-400 hover:underline inline-flex items-center">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                View all companies
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Module Quick Access */}
      <h3 className="text-xl font-semibold text-white/90 pt-4">Module Access</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/crm/contacts">
          <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
            <CardHeader>
              <Users className="h-8 w-8 text-blue-400 group-hover:scale-110 transition-transform" />
              <CardTitle className="pt-2 text-white">Contacts</CardTitle>
              <CardContent className="p-0 text-white/50 text-sm">Manage individual relationships</CardContent>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/crm/leads">
          <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
            <CardHeader>
              <Target className="h-8 w-8 text-purple-400 group-hover:scale-110 transition-transform" />
              <CardTitle className="pt-2 text-white">Leads</CardTitle>
              <CardContent className="p-0 text-white/50 text-sm">Track business opportunities</CardContent>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/crm/deals">
          <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
            <CardHeader>
              <Handshake className="h-8 w-8 text-green-400 group-hover:scale-110 transition-transform" />
              <CardTitle className="pt-2 text-white">Deals</CardTitle>
              <CardContent className="p-0 text-white/50 text-sm">Monitor your pipeline</CardContent>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/crm/companies">
          <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
            <CardHeader>
              <Building2 className="h-8 w-8 text-amber-400 group-hover:scale-110 transition-transform" />
              <CardTitle className="pt-2 text-white">Companies</CardTitle>
              <CardContent className="p-0 text-white/50 text-sm">Organizational unit records</CardContent>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-white/5 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Recent Leads</CardTitle>
            <Link href="/crm/leads/new">
              <Button size="sm" variant="outline" className="bg-white/5 border-white/10 text-white/70 hover:bg-white/10 text-xs">
                + Add Lead
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats.recentLeads.length === 0 ? (
              <div className="text-white/50 text-sm text-center py-10 italic">
                No leads yet.{" "}
                <Link href="/crm/leads/new" className="text-blue-400 hover:underline">
                  Create your first lead →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentLeads.map((lead: { id: string; name: string; status: string; created_at: string }) => (
                  <Link key={lead.id} href={`/crm/leads/${lead.id}/edit`}>
                    <div className="flex items-center justify-between py-2 border-b border-white/5 hover:bg-white/5 px-2 rounded transition-colors cursor-pointer">
                      <div>
                        <p className="text-white text-sm font-medium">{lead.name}</p>
                        <p className="text-white/40 text-xs">{new Date(lead.created_at).toLocaleDateString("en-IN")}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 capitalize">
                        {lead.status ?? "new"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3 bg-white/5 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Recent Deals</CardTitle>
            <Link href="/crm/deals/new">
              <Button size="sm" variant="outline" className="bg-white/5 border-white/10 text-white/70 hover:bg-white/10 text-xs">
                + Add Deal
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats.recentDeals.length === 0 ? (
              <div className="text-white/50 text-sm text-center py-10 italic">
                No deals yet.{" "}
                <Link href="/crm/deals/new" className="text-purple-400 hover:underline">
                  Create your first deal →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentDeals.map((deal: { id: string; title: string; stage: string; value: number; created_at: string }) => (
                  <Link key={deal.id} href={`/crm/deals/${deal.id}`}>
                    <div className="flex items-center justify-between py-2 border-b border-white/5 hover:bg-white/5 px-2 rounded transition-colors cursor-pointer">
                      <div>
                        <p className="text-white text-sm font-medium">{deal.title}</p>
                        <p className="text-white/40 text-xs capitalize">{deal.stage ?? "—"}</p>
                      </div>
                      <span className="text-xs font-semibold text-green-400">
                        {deal.value ? `₹${Number(deal.value).toLocaleString("en-IN")}` : "—"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Summary */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-400" />
            Pipeline Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-white/50 text-xs uppercase tracking-wide mb-1">Total Records</p>
              <p className="text-white text-xl font-bold">{stats.leads + stats.deals + stats.contacts + stats.companies}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-white/50 text-xs uppercase tracking-wide mb-1">Leads</p>
              <p className="text-blue-400 text-xl font-bold">{stats.leads}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-white/50 text-xs uppercase tracking-wide mb-1">Deals</p>
              <p className="text-purple-400 text-xl font-bold">{stats.deals}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-white/50 text-xs uppercase tracking-wide mb-1">Contacts</p>
              <p className="text-green-400 text-xl font-bold">{stats.contacts}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
