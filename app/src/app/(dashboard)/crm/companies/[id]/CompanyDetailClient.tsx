"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import {
  ArrowLeft, Pencil, Trash2, Building2, Globe, Phone, Mail, MapPin,
  Users, DollarSign, TrendingUp, Plus, ExternalLink, Calendar,
  Briefcase, CheckCircle2, ShieldCheck, Loader2
} from "lucide-react"
import { toast } from "sonner"
import type { Company } from "@/app/actions/crm/companies"
import { deleteCompany } from "@/app/actions/crm/companies"
import { formatCurrency } from "@/lib/utils"

const countryFlags: Record<string, string> = {
  IN: "🇮🇳", AE: "🇦🇪", SA: "🇸🇦", US: "🇺🇸", GB: "🇬🇧",
  SG: "🇸🇬", AU: "🇦🇺", CA: "🇨🇦", DE: "🇩🇪", FR: "🇫🇷",
}

const dealStageConfig: Record<string, { label: string; color: string }> = {
  PROSPECTING: { label: "Prospecting", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  QUALIFICATION: { label: "Qualification", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  PROPOSAL: { label: "Proposal", color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  NEGOTIATION: { label: "Negotiation", color: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  CLOSED_WON: { label: "Closed Won", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  CLOSED_LOST: { label: "Closed Lost", color: "bg-red-500/10 text-red-500 border-red-500/20" },
}

interface Props {
  company: Company
  contacts: any[]
  deals: any[]
  metrics: {
    totalContacts: number
    totalDeals: number
    activePipelineValue: number
    closedWonRevenue: number
  }
}

export default function CompanyDetailClient({ company, contacts, deals, metrics }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = () => {
    if (!confirm(`Are you sure you want to delete ${company.name}? This cannot be undone.`)) return
    setIsDeleting(true)
    startTransition(async () => {
      const { error } = await deleteCompany(company.id)
      if (error) {
        toast.error(error)
        setIsDeleting(false)
      } else {
        toast.success("Company deleted successfully")
        router.push("/crm/companies")
      }
    })
  }

  const flag = company.country_code ? countryFlags[company.country_code] || "" : ""

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/crm/companies")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white text-lg font-bold shadow-md shadow-blue-500/20 shrink-0">
              {company.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{company.name}</h1>
                <Badge variant={company.is_active ? "default" : "secondary"} className="text-xs">
                  {company.is_active ? "Active" : "Inactive"}
                </Badge>
                {company.industry && (
                  <Badge variant="outline" className="text-xs">
                    {company.industry}
                  </Badge>
                )}
                {flag && <span className="text-lg">{flag}</span>}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {company.city || "No location"} {company.country ? `• ${company.country}` : ""}
                {company.email ? ` • ${company.email}` : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/crm/contacts/new?company=${encodeURIComponent(company.name)}`)}
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add Contact
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/crm/deals/new?company=${encodeURIComponent(company.name)}`)}
          >
            <Briefcase className="h-4 w-4 mr-1.5" /> Add Deal
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/crm/companies/${company.id}/edit`)}
          >
            <Pencil className="h-4 w-4 mr-1.5" /> Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10"
            disabled={isDeleting}
            onClick={handleDelete}
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
            Delete
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active Pipeline</p>
                <p className="text-2xl font-bold mt-1 text-primary">{formatCurrency(metrics.activePipelineValue)}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Won Revenue</p>
                <p className="text-2xl font-bold mt-1 text-emerald-600">{formatCurrency(metrics.closedWonRevenue)}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Deals</p>
                <p className="text-2xl font-bold mt-1">{metrics.totalDeals}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Linked Contacts</p>
                <p className="text-2xl font-bold mt-1">{metrics.totalContacts}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-[480px] bg-muted/50 border shadow-sm">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
          <TabsTrigger value="deals">Deals ({deals.length})</TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact & Communication Channels */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" /> Contact & Channels
                </CardTitle>
                <CardDescription>Primary communication endpoints for {company.name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-center justify-between py-1.5 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Globe className="h-4 w-4" /> Website
                  </span>
                  {company.website ? (
                    <a
                      href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline flex items-center gap-1"
                    >
                      {company.website} <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>

                <div className="flex items-center justify-between py-1.5 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Phone className="h-4 w-4" /> Phone
                  </span>
                  {company.phone ? (
                    <a href={`tel:${company.phone}`} className="font-medium hover:text-primary">
                      {company.phone}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>

                <div className="flex items-center justify-between py-1.5 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4" /> Email
                  </span>
                  {company.email ? (
                    <a href={`mailto:${company.email}`} className="font-medium hover:text-primary">
                      {company.email}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>

                <div className="flex items-center justify-between py-1.5">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Location
                  </span>
                  <span className="font-medium text-right">
                    {[company.address, company.city, company.country].filter(Boolean).join(", ") || "—"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Statutory & Corporate Information */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Corporate & Compliance
                </CardTitle>
                <CardDescription>Tax registration, size, and operational status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-center justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">GSTIN / Tax ID</span>
                  <span className="font-mono font-medium">{company.gstin || "Not Registered"}</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Industry Sector</span>
                  <span className="font-medium">{company.industry || "General Commercial"}</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Company Size</span>
                  <span className="font-medium">
                    {company.employee_count ? `${company.employee_count} employees` : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Annual Revenue</span>
                  <span className="font-medium">
                    {company.annual_revenue ? formatCurrency(company.annual_revenue) : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Created Date
                  </span>
                  <span className="font-medium">
                    {new Date(company.created_at).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric"
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Associated Contacts */}
        <TabsContent value="contacts" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Associated People & Contacts</h3>
              <p className="text-xs text-muted-foreground">Individuals associated with {company.name}</p>
            </div>
            <Button
              size="sm"
              onClick={() => router.push(`/crm/contacts/new?company=${encodeURIComponent(company.name)}`)}
            >
              <Plus className="h-4 w-4 mr-1.5" /> Add Contact
            </Button>
          </div>

          <Card className="shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No contacts associated with this company yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    contacts.map((contact) => (
                      <TableRow
                        key={contact.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/crm/contacts/${contact.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                              {(contact.display_name || "C").charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium">{contact.display_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{contact.email || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{contact.phone || contact.mobile || "—"}</TableCell>
                        <TableCell>
                          {contact.customer_group ? (
                            <Badge variant="outline" className="text-[11px] capitalize">{contact.customer_group.toLowerCase()}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium text-xs">
                          {formatCurrency(Number(contact.balance) || 0, contact.currency_code || "INR")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/crm/contacts/${contact.id}`)
                            }}
                          >
                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Associated Deals */}
        <TabsContent value="deals" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Sales Opportunities & Deals</h3>
              <p className="text-xs text-muted-foreground">Pipeline deals tracked for {company.name}</p>
            </div>
            <Button
              size="sm"
              onClick={() => router.push(`/crm/deals/new?company=${encodeURIComponent(company.name)}`)}
            >
              <Plus className="h-4 w-4 mr-1.5" /> Add Deal
            </Button>
          </div>

          <Card className="shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deal Title</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-center">Probability</TableHead>
                    <TableHead>Expected Close</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        No deals associated with this company yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    deals.map((deal) => {
                      const stageInfo = dealStageConfig[deal.stage] || { label: deal.stage, color: "bg-muted text-muted-foreground" }
                      return (
                        <TableRow
                          key={deal.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/crm/deals/${deal.id}`)}
                        >
                          <TableCell className="font-medium">{deal.title}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{deal.contact_name || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${stageInfo.color}`}>
                              {stageInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-xs">
                            {formatCurrency(Number(deal.value) || 0)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="text-xs">{deal.probability || 0}%</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {deal.expected_close
                              ? new Date(deal.expected_close).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric"
                                })
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/crm/deals/${deal.id}`)
                              }}
                            >
                              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
