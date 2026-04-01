"use client"

import React, { useState, useEffect } from "react"
import { getTickets, createTicket, addMessage, TicketStatus, TicketPriority } from "@/app/actions/support/tickets"
import { useChatMessages } from "@/hooks/use-chat-messages"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { LifeBuoy, Clock, MessageSquare, Plus, Send, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"

export default function SupportPage() {
  const [tickets, setTickets] = useState<any[]>([])
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [newMessage, setNewMessage] = useState("")
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // New Ticket Form
  const [subject, setSubject] = useState("")
  const [initialMsg, setInitialMsg] = useState("")
  const [priority, setPriority] = useState<TicketPriority>("MEDIUM")

  const { messages: liveMessages } = useChatMessages(selectedTicket?.id || null, selectedTicket?.messages || [])

  useEffect(() => {
    loadTickets()
  }, [])

  const loadTickets = async () => {
    const data = await getTickets()
    setTickets(data)
  }

  const handleCreateTicket = async () => {
    if (!subject || !initialMsg) return
    setIsSubmitting(true)
    try {
      await createTicket(subject, initialMsg, priority)
      toast.success("Support ticket created successfully")
      setShowNewDialog(false)
      setSubject("")
      setInitialMsg("")
      await loadTickets()
    } catch (err) {
      toast.error("Failed to create ticket")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage || !selectedTicket) return
    try {
      await addMessage(selectedTicket.id, newMessage, false)
      setNewMessage("")
      // No need to manually refresh messages - the useChatMessages hook will catch the 'INSERT' event
      // However, we update the ticket list to refresh the 'updatedAt' timestamp in the sidebar
      await loadTickets()
    } catch (err) {
      toast.error("Failed to send message")
    }
  }

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case "OPEN": return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Open</Badge>
      case "IN_PROGRESS": return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">In Progress</Badge>
      case "RESOLVED": return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Resolved</Badge>
      case "CLOSED": return <Badge variant="secondary">Closed</Badge>
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-50/50">
      {/* Sidebar: Ticket List */}
      <div className="w-1/3 border-r bg-white flex flex-col">
        <div className="p-4 border-b flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-indigo-600" />
            <h1 className="font-semibold text-lg">Support Portal</h1>
          </div>
          <Button size="icon" variant="ghost" onClick={() => setShowNewDialog(true)}>
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          {tickets.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
               <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
               <p>No active tickets</p>
               <Button variant="link" onClick={() => setShowNewDialog(true)}>Raise a concern</Button>
            </div>
          ) : (
            <div className="divide-y">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`p-4 cursor-pointer transition-colors hover:bg-slate-50 ${
                    selectedTicket?.id === ticket.id ? "bg-slate-50 border-l-2 border-indigo-600" : ""
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-medium truncate pr-2">{ticket.subject}</h3>
                    {getStatusBadge(ticket.status)}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(ticket.updatedAt))} ago
                    </span>
                    <span>•</span>
                    <span className={`font-semibold ${
                      ticket.priority === "URGENT" ? "text-red-500" : 
                      ticket.priority === "HIGH" ? "text-amber-500" : "text-slate-400"
                    }`}>
                      {ticket.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Main Content: Chat View */}
      <div className="flex-1 flex flex-col relative bg-slate-50/30">
        {selectedTicket ? (
          <>
            {/* Header */}
            <div className="p-4 border-b bg-white flex justify-between items-center shadow-sm">
              <div>
                <h2 className="font-semibold text-lg">{selectedTicket.subject}</h2>
                <p className="text-xs text-slate-500">Ticket ID: {selectedTicket.id}</p>
              </div>
              <div className="flex items-center gap-2">
                {selectedTicket.status === "RESOLVED" && <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none"><CheckCircle2 className="w-3 h-3 mr-1" /> Solution found</Badge>}
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-6">
              <div className="max-w-3xl mx-auto space-y-6 pb-20">
                {liveMessages?.map((msg: any) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.isFromAdmin ? "justify-start" : "justify-end"}`}
                  >
                    <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
                      msg.isFromAdmin 
                        ? "bg-white border rounded-tl-none" 
                        : "bg-indigo-600 text-white rounded-tr-none"
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                          {msg.isFromAdmin ? "Agent Support" : "You"}
                        </span>
                        <span className="text-[10px] opacity-60">
                          {formatDistanceToNow(new Date(msg.createdAt))} ago
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-transparent">
              <div className="max-w-3xl mx-auto flex gap-2 items-end bg-white p-2 rounded-2xl shadow-xl border border-slate-200">
                <Textarea
                  placeholder="Type your reply..."
                  className="min-h-[50px] border-none focus-visible:ring-0 resize-none"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                    }
                  }}
                />
                <Button size="icon" className="h-10 w-10 shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-700" onClick={handleSendMessage} disabled={!newMessage}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
             <div className="relative mb-4">
                <LifeBuoy className="w-16 h-16 opacity-10" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-indigo-200" />
                </div>
             </div>
             <p className="text-sm">Select a ticket to view messages</p>
          </div>
        )}

        {/* New Ticket Modal (Simple Overlay) */}
        {showNewDialog && (
          <div className="absolute inset-0 bg-white/95 z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
             <Card className="w-full max-w-lg border-none shadow-none">
                <CardHeader>
                   <CardTitle className="text-2xl font-bold">New Support Ticket</CardTitle>
                   <CardDescription>Tell us what's wrong and we'll get back to you within 24 hours.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                   <div className="space-y-2">
                      <label className="text-sm font-medium">Subject</label>
                      <Input placeholder="What is the issue?" value={subject} onChange={(e) => setSubject(e.target.value)} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-sm font-medium">Priority</label>
                      <div className="flex gap-2">
                         {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                           <Button 
                             key={p} 
                             variant={priority === p ? "default" : "outline"} 
                             size="sm" 
                             onClick={() => setPriority(p as any)}
                             className={priority === p ? (p === "URGENT" ? "bg-red-600" : "bg-indigo-600") : ""}
                           >
                              {p}
                           </Button>
                         ))}
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-sm font-medium">Description</label>
                      <Textarea placeholder="Describe your problem in detail..." className="min-h-[120px]" value={initialMsg} onChange={(e) => setInitialMsg(e.target.value)} />
                   </div>
                   <div className="flex justify-end gap-3 pt-4">
                      <Button variant="ghost" onClick={() => setShowNewDialog(false)}>Cancel</Button>
                      <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleCreateTicket} disabled={isSubmitting}>
                         {isSubmitting ? "Creating..." : "Submit Ticket"}
                      </Button>
                   </div>
                </CardContent>
             </Card>
          </div>
        )}
      </div>
    </div>
  )
}
