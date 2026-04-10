"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
    Phone, Mail, Building2, User, Globe, Calendar, 
    ArrowLeft, Pencil, MoreVertical, Sparkles, PhoneCall, 
    Target, CheckCircle2, XCircle, DollarSign, Clock
} from "lucide-react"
import { useRouter } from "next/navigation"
import type { Lead, LeadStatus } from "@/app/actions/crm/leads"
import { convertLeadToDeal } from "@/app/actions/crm/leads"
import { toast } from "sonner"
import EntityTasks from "@/components/crm/EntityTasks"
import EntityCommunications from "@/components/crm/EntityCommunications"
import type { Task } from "@/app/actions/crm/tasks"
import type { CommunicationLog } from "@/app/actions/crm/communications"

const statusConfig: Record<LeadStatus, { label: string; color: string; icon: React.ElementType }> = {
    NEW: { label: "New", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: Sparkles },
    CONTACTED: { label: "Contacted", color: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: PhoneCall },
    QUALIFIED: { label: "Qualified", color: "bg-purple-500/10 text-purple-500 border-purple-500/20", icon: Target },
    CONVERTED: { label: "Converted", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: CheckCircle2 },
    LOST: { label: "Lost", color: "bg-red-500/10 text-red-500 border-red-500/20", icon: XCircle },
}

interface Props {
  lead: Lead
  initialTasks: Task[]
  initialLogs: CommunicationLog[]
}

export default function LeadDetailClient({ lead, initialTasks, initialLogs }: Props) {
  const router = useRouter()
  const [isConverting, setIsConverting] = useState(false)
  const status = statusConfig[lead.status]
  const StatusIcon = status.icon

  const handleConvert = async () => {
    try {
      setIsConverting(true)
      const result = await convertLeadToDeal(lead.id)
      toast.success("Lead successfully converted to a Deal!")
      router.push(`/crm/deals/${result.dealId}`)
    } catch (error: any) {
      toast.error(error.message || "Failed to convert lead")
    } finally {
      setIsConverting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/crm/leads")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{lead.title}</h1>
              <Badge variant="outline" className={`${status.color} gap-1 px-2 py-0.5`}>
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </Badge>
            </div>
            <p className="text-muted-foreground">{lead.contact_name} • {lead.source || "Direct Source"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/crm/leads/${lead.id}/edit`)}>
            <Pencil className="h-4 w-4 mr-2" /> Edit
          </Button>
          {lead.status !== "CONVERTED" && (
            <Button 
                size="sm" 
                onClick={handleConvert} 
                disabled={isConverting}
                className="bg-primary shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
            >
              {isConverting ? "Converting..." : "Convert to Deal"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Main Tabs */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4 max-w-[520px] bg-muted/50 border shadow-sm">
              <TabsTrigger value="overview" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Overview</TabsTrigger>
              <TabsTrigger value="notes" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Notes</TabsTrigger>
              <TabsTrigger value="tasks" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Tasks & Activity</TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="mt-6 space-y-6">
              <Card className="shadow-sm border-muted/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Lead Details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/5 rounded-lg border border-primary/10">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Contact Person</p>
                        <p className="text-sm font-medium mt-0.5">{lead.contact_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/5 rounded-lg border border-primary/10">
                        <Mail className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Email Address</p>
                        <p className="text-sm font-medium mt-0.5">{lead.email || "No email provided"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/5 rounded-lg border border-primary/10">
                        <Phone className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Phone Number</p>
                        <p className="text-sm font-medium mt-0.5">{lead.phone || "No phone provided"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/5 rounded-lg border border-primary/10">
                        <Globe className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Lead Source</p>
                        <p className="text-sm font-medium mt-0.5">{lead.source || "Organic Search"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/5 rounded-lg border border-primary/10">
                        <Target className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Assigned Owner</p>
                        <p className="text-sm font-medium mt-0.5">{lead.assigned_to || "Unassigned"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/5 rounded-lg border border-primary/10">
                        <Clock className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Last Updated</p>
                        <p className="text-sm font-medium mt-0.5">{new Date(lead.updated_at).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {lead.notes && (
                <Card className="shadow-sm border-muted/60">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Internal Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {lead.notes}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="notes" className="mt-6">
              <Card className="shadow-sm border-muted/60">
                <CardHeader className="pb-0">
                  <CardTitle className="text-base">Communication Log</CardTitle>
                  <CardDescription>Track all calls, emails, meetings, and notes for this lead</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                   <EntityCommunications entityId={lead.id} entityType="lead" initialLogs={initialLogs} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tasks" className="mt-6">
              <Card className="shadow-sm border-muted/60">
                <CardHeader className="pb-0">
                  <CardTitle className="text-base">Pending Activities</CardTitle>
                  <CardDescription>Track follow-ups and meetings for this lead</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                   <EntityTasks entityId={lead.id} entityType="lead" initialTasks={initialTasks} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <Card className="shadow-sm border-muted/60">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                   <div className="p-4 bg-muted rounded-full mb-4">
                     <Clock className="h-8 w-8 text-muted-foreground" />
                   </div>
                   <h3 className="font-semibold">Full Audit Logs</h3>
                   <p className="text-sm text-muted-foreground max-w-[250px] mt-1">Detailed history of changes to this lead will appear here.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column: Summaries */}
        <div className="lg:col-span-1 space-y-6">
           <Card className="shadow-sm border-muted/60 bg-primary/[0.02]">
             <CardHeader className="pb-3">
               <CardTitle className="text-base font-semibold flex items-center gap-2">
                 <Sparkles className="h-4 w-4 text-primary" />
                 Engagement Score
               </CardTitle>
             </CardHeader>
             <CardContent>
                <div className="flex flex-col items-center justify-center py-4 bg-background rounded-xl border border-primary/10 shadow-sm">
                   <span className={`text-5xl font-black ${lead.score >= 70 ? 'text-emerald-500' : 'text-amber-500'}`}>
                     {lead.score}<span className="text-2xl">%</span>
                   </span>
                   <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mt-2">Conversion Probability</p>
                </div>
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                       <DollarSign className="h-4 w-4" /> Est. Deal Value
                    </span>
                    <span className="font-bold text-emerald-600">₹{lead.estimated_value?.toLocaleString() || "0"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                       <Calendar className="h-4 w-4" /> Created On
                    </span>
                    <span className="font-medium text-muted-foreground">{new Date(lead.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="mt-8">
                   <Button className="w-full shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform" size="default">
                     Upgrade Lead Rank
                   </Button>
                </div>
             </CardContent>
           </Card>

           <Card className="shadow-sm border-dashed bg-muted/20">
             <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Recommended Playbook</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4 pt-1">
                <div className="space-y-2">
                   <div className="flex items-start gap-2">
                      <div className="h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</div>
                      <p className="text-xs leading-relaxed">Schedule initial discovery call to identify core pain points.</p>
                   </div>
                   <div className="flex items-start gap-2">
                      <div className="h-5 w-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</div>
                      <p className="text-xs leading-relaxed text-muted-foreground">Send professional proposal with "Retail Business" case study.</p>
                   </div>
                </div>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  )
}
