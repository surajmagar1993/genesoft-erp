"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft, Pencil, Trash2, Building2, User, Phone, Mail,
  Calendar, DollarSign, TrendingUp, CheckCircle2, XCircle,
  FileText, Briefcase, ChevronRight, Clock, Loader2, Sparkles, ExternalLink
} from "lucide-react"
import { toast } from "sonner"
import type { Deal, DealStage } from "@/app/actions/crm/deals"
import { updateDealStage, deleteDeal } from "@/app/actions/crm/deals"
import { formatCurrency } from "@/lib/utils"
import EntityTasks from "@/components/crm/EntityTasks"
import EntityCommunications from "@/components/crm/EntityCommunications"
import type { Task } from "@/app/actions/crm/tasks"
import type { CommunicationLog } from "@/app/actions/crm/communications"

const stageProbability: Record<DealStage, number> = {
  PROSPECTING: 20,
  QUALIFICATION: 40,
  PROPOSAL: 60,
  NEGOTIATION: 80,
  CLOSED_WON: 100,
  CLOSED_LOST: 0,
}

interface StageConfig {
  key: DealStage
  label: string
  color: string
  dotColor: string
}

const activeStages: StageConfig[] = [
  { key: "PROSPECTING", label: "Prospecting", color: "bg-blue-500", dotColor: "bg-blue-500" },
  { key: "QUALIFICATION", label: "Qualification", color: "bg-amber-500", dotColor: "bg-amber-500" },
  { key: "PROPOSAL", label: "Proposal", color: "bg-purple-500", dotColor: "bg-purple-500" },
  { key: "NEGOTIATION", label: "Negotiation", color: "bg-orange-500", dotColor: "bg-orange-500" },
  { key: "CLOSED_WON", label: "Closed Won", color: "bg-emerald-500", dotColor: "bg-emerald-500" },
]

const stageInfoMap: Record<DealStage, { label: string; badgeColor: string }> = {
  PROSPECTING: { label: "Prospecting", badgeColor: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  QUALIFICATION: { label: "Qualification", badgeColor: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  PROPOSAL: { label: "Proposal", badgeColor: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  NEGOTIATION: { label: "Negotiation", badgeColor: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  CLOSED_WON: { label: "Closed Won", badgeColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  CLOSED_LOST: { label: "Closed Lost", badgeColor: "bg-red-500/10 text-red-500 border-red-500/20" },
}

interface Props {
  deal: Deal
  contact: any | null
  company: any | null
  initialTasks: Task[]
  initialLogs: CommunicationLog[]
}

export default function DealDetailClient({ deal: initialDeal, contact, company, initialTasks, initialLogs }: Props) {
  const router = useRouter()
  const [deal, setDeal] = useState<Deal>(initialDeal)
  const [isPending, startTransition] = useTransition()
  const [isDeleting, setIsDeleting] = useState(false)
  const [stageUpdating, setStageUpdating] = useState<string | null>(null)

  const handleStageChange = (newStage: DealStage) => {
    if (deal.stage === newStage) return
    setStageUpdating(newStage)
    startTransition(async () => {
      const { error } = await updateDealStage(deal.id, newStage)
      if (error) {
        toast.error(error)
      } else {
        const newProb = stageProbability[newStage] ?? 50
        setDeal(prev => ({ ...prev, stage: newStage, probability: newProb }))
        toast.success(`Deal stage updated to ${stageInfoMap[newStage]?.label || newStage}`)
        router.refresh()
      }
      setStageUpdating(null)
    })
  }

  const handleDelete = () => {
    if (!confirm(`Are you sure you want to delete "${deal.title}"? This cannot be undone.`)) return
    setIsDeleting(true)
    startTransition(async () => {
      const { error } = await deleteDeal(deal.id)
      if (error) {
        toast.error(error)
        setIsDeleting(false)
      } else {
        toast.success("Deal deleted successfully")
        router.push("/crm/deals")
      }
    })
  }

  const dealValue = Number(deal.value) || 0
  const probability = deal.probability || 0
  const weightedValue = Math.round((dealValue * probability) / 100)
  const currentStageInfo = stageInfoMap[deal.stage] || { label: deal.stage, badgeColor: "bg-muted text-muted-foreground" }

  const currentStageIndex = activeStages.findIndex(s => s.key === deal.stage)

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/crm/deals")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight">{deal.title}</h1>
              <Badge variant="outline" className={`text-xs ${currentStageInfo.badgeColor}`}>
                {currentStageInfo.label}
              </Badge>
              <span className="text-xl font-bold text-primary ml-1">
                {formatCurrency(dealValue)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {deal.company || "No Company"} • {deal.contact_name || "No Contact"}
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            className="bg-primary shadow-sm"
            onClick={() => router.push(`/sales/quotes/new?dealId=${deal.id}&customer=${encodeURIComponent(deal.contact_name || "")}`)}
          >
            <FileText className="h-4 w-4 mr-1.5" /> Create Quote
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/crm/deals/${deal.id}/edit`)}
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

      {/* Interactive Pipeline Stepper */}
      <Card className="shadow-sm overflow-hidden border-border/60">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
            {activeStages.map((stage, idx) => {
              const isCurrent = deal.stage === stage.key
              const isPast = currentStageIndex > -1 && idx < currentStageIndex
              const isUpdatingThis = stageUpdating === stage.key

              return (
                <button
                  key={stage.key}
                  disabled={isPending}
                  onClick={() => handleStageChange(stage.key)}
                  className={`flex-1 min-w-[120px] group flex flex-col items-center p-2 rounded-lg transition-all text-xs font-medium border ${
                    isCurrent
                      ? "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/20"
                      : isPast
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                      : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {isUpdatingThis ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isCurrent ? (
                      <Sparkles className="h-3.5 w-3.5" />
                    ) : isPast ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/40 group-hover:bg-muted-foreground" />
                    )}
                    <span>{stage.label}</span>
                  </div>
                  <span className={`text-[10px] mt-0.5 ${isCurrent ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    {stageProbability[stage.key]}%
                  </span>
                </button>
              )
            })}

            {/* Closed Lost Button */}
            <button
              disabled={isPending}
              onClick={() => handleStageChange("CLOSED_LOST")}
              className={`min-w-[110px] flex flex-col items-center p-2 rounded-lg transition-all text-xs font-medium border ${
                deal.stage === "CLOSED_LOST"
                  ? "bg-destructive text-destructive-foreground border-destructive shadow-sm"
                  : "bg-muted/40 text-muted-foreground border-transparent hover:bg-red-500/10 hover:text-red-500"
              }`}
            >
              <div className="flex items-center gap-1.5">
                {stageUpdating === "CLOSED_LOST" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <XCircle className="h-3.5 w-3.5" />
                )}
                <span>Closed Lost</span>
              </div>
              <span className={`text-[10px] mt-0.5 ${deal.stage === "CLOSED_LOST" ? "text-destructive-foreground/80" : "text-muted-foreground"}`}>
                0%
              </span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Deal Value</p>
                <p className="text-2xl font-bold mt-1 text-primary">{formatCurrency(dealValue)}</p>
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
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Win Probability</p>
                <p className="text-2xl font-bold mt-1">{probability}%</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Weighted Forecast</p>
                <p className="text-2xl font-bold mt-1 text-emerald-600">{formatCurrency(weightedValue)}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Expected Close</p>
                <p className="text-xl font-bold mt-1">
                  {deal.expected_close
                    ? new Date(deal.expected_close).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                      })
                    : "Not Set"}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Left Tabs + Right Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Tabs */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-[420px] bg-muted/50 border shadow-sm">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="tasks">Tasks & Activities</TabsTrigger>
              <TabsTrigger value="communications">Communications</TabsTrigger>
            </TabsList>

            {/* Tab 1: Overview */}
            <TabsContent value="overview" className="space-y-6 pt-4">
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Deal Overview</CardTitle>
                  <CardDescription>Key metadata, ownership, and pipeline milestones</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg border bg-muted/20">
                      <p className="text-xs text-muted-foreground">Deal Title</p>
                      <p className="font-semibold mt-0.5">{deal.title}</p>
                    </div>

                    <div className="p-3 rounded-lg border bg-muted/20">
                      <p className="text-xs text-muted-foreground">Current Stage</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="outline" className={`text-xs ${currentStageInfo.badgeColor}`}>
                          {currentStageInfo.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">({probability}% probability)</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border bg-muted/20">
                      <p className="text-xs text-muted-foreground">Pipeline Owner / Assigned To</p>
                      <p className="font-medium mt-0.5">{deal.assigned_to || "Unassigned"}</p>
                    </div>

                    <div className="p-3 rounded-lg border bg-muted/20">
                      <p className="text-xs text-muted-foreground">Expected Target Date</p>
                      <p className="font-medium mt-0.5">
                        {deal.expected_close
                          ? new Date(deal.expected_close).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric"
                            })
                          : "None scheduled"}
                      </p>
                    </div>
                  </div>

                  {/* Notes Card */}
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Deal Notes & Brief</h4>
                    {deal.notes ? (
                      <div className="p-3.5 rounded-lg border bg-muted/30 text-sm whitespace-pre-wrap leading-relaxed">
                        {deal.notes}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No notes recorded for this deal.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 2: Tasks */}
            <TabsContent value="tasks" className="space-y-4 pt-4">
              <EntityTasks entityId={deal.id} entityType="deal" initialTasks={initialTasks} />
            </TabsContent>

            {/* Tab 3: Communications */}
            <TabsContent value="communications" className="space-y-4 pt-4">
              <EntityCommunications entityId={deal.id} entityType="deal" initialLogs={initialLogs} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Sidebar: Context Cards & Shortcuts */}
        <div className="space-y-6">
          {/* Associated Contact Card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" /> Key Contact
                </span>
                {contact && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => router.push(`/crm/contacts/${contact.id}`)}
                  >
                    View <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {deal.contact_name ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                      {deal.contact_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold">{deal.contact_name}</p>
                      {contact?.customer_group && (
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {contact.customer_group.toLowerCase()}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {contact?.email && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      <a href={`mailto:${contact.email}`} className="hover:text-primary hover:underline truncate">
                        {contact.email}
                      </a>
                    </div>
                  )}

                  {(contact?.phone || contact?.mobile) && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      <a href={`tel:${contact.phone || contact.mobile}`} className="hover:text-primary hover:underline">
                        {contact.phone || contact.mobile}
                      </a>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">No specific contact person linked.</p>
              )}
            </CardContent>
          </Card>

          {/* Associated Company Card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" /> Company Account
                </span>
                {company && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => router.push(`/crm/companies/${company.id}`)}
                  >
                    View <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {deal.company ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {deal.company.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold">{deal.company}</p>
                      {company?.industry && (
                        <p className="text-xs text-muted-foreground">{company.industry}</p>
                      )}
                    </div>
                  </div>

                  {company?.city && (
                    <p className="text-xs text-muted-foreground">
                      📍 {company.city} {company.country ? `, ${company.country}` : ""}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">No company account linked.</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Stage Shortcuts */}
          <Card className="shadow-sm border-primary/20 bg-primary/[0.02]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Quick Stage Transition</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {deal.stage !== "CLOSED_WON" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-emerald-500/20"
                  disabled={isPending}
                  onClick={() => handleStageChange("CLOSED_WON")}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Mark as Closed Won
                </Button>
              )}
              {deal.stage !== "CLOSED_LOST" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-destructive hover:bg-destructive/10 border-destructive/20"
                  disabled={isPending}
                  onClick={() => handleStageChange("CLOSED_LOST")}
                >
                  <XCircle className="h-4 w-4 mr-2" /> Mark as Closed Lost
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => router.push(`/sales/quotes/new?dealId=${deal.id}&customer=${encodeURIComponent(deal.contact_name || "")}`)}
              >
                <FileText className="h-4 w-4 mr-2" /> Convert to Quotation
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
