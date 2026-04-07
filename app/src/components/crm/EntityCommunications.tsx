"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Plus, Phone, Mail, MessageSquare, Users, StickyNote,
  Loader2, Trash2, MoreHorizontal
} from "lucide-react"
import {
  createCommunicationLog,
  deleteCommunicationLog,
  type CommunicationLog,
  type CommunicationType
} from "@/app/actions/crm/communications"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"

const typeConfig: Record<CommunicationType, {
  label: string
  icon: React.ElementType
  color: string
  dotColor: string
}> = {
  NOTE:    { label: "Note",    icon: StickyNote,    color: "bg-slate-100 text-slate-700 border-slate-200",    dotColor: "bg-slate-500"    },
  CALL:    { label: "Call",    icon: Phone,         color: "bg-blue-50 text-blue-700 border-blue-200",       dotColor: "bg-blue-500"     },
  EMAIL:   { label: "Email",   icon: Mail,          color: "bg-purple-50 text-purple-700 border-purple-200", dotColor: "bg-purple-500"   },
  MEETING: { label: "Meeting", icon: Users,         color: "bg-amber-50 text-amber-700 border-amber-200",   dotColor: "bg-amber-500"    },
  SMS:     { label: "SMS",     icon: MessageSquare, color: "bg-emerald-50 text-emerald-700 border-emerald-200", dotColor: "bg-emerald-500" },
  OTHER:   { label: "Other",   icon: StickyNote,    color: "bg-gray-50 text-gray-700 border-gray-200",      dotColor: "bg-gray-400"     },
}

interface Props {
  entityId: string
  entityType: "contact" | "lead" | "deal"
  initialLogs: CommunicationLog[]
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

export default function EntityCommunications({ entityId, entityType, initialLogs }: Props) {
  const [logs, setLogs] = useState<CommunicationLog[]>(initialLogs)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    type: "NOTE" as CommunicationType,
    subject: "",
    content: "",
    logged_at: new Date().toISOString(),
    [`${entityType}_id`]: entityId,
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    const { error, data } = await createCommunicationLog(formData as any)
    if (!error && data) {
      setLogs([data, ...logs])
      setIsDialogOpen(false)
      setFormData({
        ...formData,
        type: "NOTE",
        subject: "",
        content: "",
        logged_at: new Date().toISOString(),
      })
    }
    setIsSaving(false)
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    const { error } = await deleteCommunicationLog(id)
    if (!error) {
      setLogs(logs.filter(l => l.id !== id))
    }
    setDeletingId(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Communication Log</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" /> Log Interaction
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Log Interaction</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => setFormData({ ...formData, type: v as CommunicationType })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NOTE">📝 Note</SelectItem>
                      <SelectItem value="CALL">📞 Call</SelectItem>
                      <SelectItem value="EMAIL">📧 Email</SelectItem>
                      <SelectItem value="MEETING">👥 Meeting</SelectItem>
                      <SelectItem value="SMS">💬 SMS</SelectItem>
                      <SelectItem value="OTHER">📌 Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="Enter subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Details</Label>
                <Textarea
                  id="content"
                  placeholder="What happened? Key points discussed..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  required
                  rows={4}
                  className="resize-none"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Entry
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Timeline */}
      <div className="space-y-0">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-muted/20 rounded-xl border-2 border-dashed border-muted/50">
            <MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No interactions logged yet.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Log a call, email, or meeting to start tracking.</p>
          </div>
        ) : (
          logs.map((log, index) => {
            const config = typeConfig[log.type]
            const Icon = config.icon
            const isLast = index === logs.length - 1

            return (
              <div key={log.id} className="flex gap-3 group">
                {/* Timeline connector */}
                <div className="flex flex-col items-center">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${config.color} flex-shrink-0 z-10 bg-white`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  {!isLast && (
                    <div className="w-0.5 bg-border flex-grow min-h-[16px]" />
                  )}
                </div>

                {/* Content */}
                <Card className="flex-1 mb-3 shadow-none border-border/50 hover:bg-muted/30 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={`text-[10px] h-5 uppercase px-1.5 ${config.color}`}>
                            {config.label}
                          </Badge>
                          {log.subject && (
                            <span className="text-sm font-semibold truncate">{log.subject}</span>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
                            {formatRelativeTime(log.logged_at)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed whitespace-pre-wrap">
                          {log.content}
                        </p>
                        {log.logged_by && (
                          <p className="text-xs text-muted-foreground/60 mt-1">— {log.logged_by}</p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete(log.id)}
                            disabled={deletingId === log.id}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {deletingId === log.id ? "Deleting…" : "Delete"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
