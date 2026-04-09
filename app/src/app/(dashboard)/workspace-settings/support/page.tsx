"use client"

import React, { useState, useEffect } from "react"
import { getTickets, addMessage, updateTicketStatus, TicketStatus } from "@/app/actions/support/tickets"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ShieldAlert, Clock, MessageSquare, Send, CheckCircle2, User, Globe } from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"

export default function SupportAdminPage() {
  const [tickets, setTickets] = useState<any[]>([])
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [adminReply, setAdminReply] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadAllTickets()
  }, [])

  const loadAllTickets = async () => {
    setIsLoading(true)
    const data = await getTickets() // Note: In a real super admin app, this should be a global fetch
    setTickets(data)
    setIsLoading(false)
  }

  const handleAdminReply = async () => {
    if (!adminReply || !selectedTicket) return
    try {
      await addMessage(selectedTicket.id, adminReply, true)
      setAdminReply("")
      await loadAllTickets()
      // Refresh current view
      const updated = await getTickets()
      const t = updated.find((x: any) => x.id === selectedTicket.id)
      setSelectedTicket(t)
      toast.success("Reply sent to customer")
    } catch (err) {
      toast.error("Failed to send reply")
    }
  }

  const handleResolve = async () => {
    if (!selectedTicket) return
    try {
      await updateTicketStatus(selectedTicket.id, "RESOLVED")
      toast.success("Ticket resolved")
      await loadAllTickets()
      setSelectedTicket({ ...selectedTicket, status: "RESOLVED" })
    } catch (e) {
      toast.error("Status update failed")
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-50/50">
      <div className="w-1/3 border-r bg-white flex flex-col">
        <div className="p-4 border-b bg-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" />
            <h1 className="font-semibold text-lg">Admin Console</h1>
          </div>
          <Badge className="bg-white/20 text-white border-0">{tickets.length} Total</Badge>
        </div>

        <ScrollArea className="flex-1">
          {isLoading ? (
             <div className="p-8 text-center text-slate-400">Loading tickets...</div>
          ) : tickets.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No support tickets found</div>
          ) : (
            <div className="divide-y">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`p-4 cursor-pointer transition-colors hover:bg-slate-50 ${
                    selectedTicket?.id === ticket.id ? "bg-slate-50 border-l-4 border-indigo-600" : ""
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-medium text-sm truncate">{ticket.subject}</h3>
                    {ticket.status === "OPEN" && <Badge className="bg-red-500">Urgent</Badge>}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span className="flex items-center gap-1 uppercase tracking-tighter">
                      <Globe className="w-3 h-3" />
                      {ticket.tenantId.split("-")[0]}...
                    </span>
                    <span className="flex items-center gap-1">
                       <Clock className="w-3 h-3" />
                       {formatDistanceToNow(new Date(ticket.updatedAt))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col bg-slate-100/30">
        {selectedTicket ? (
          <>
            <div className="p-4 border-b bg-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                    <User className="text-slate-500 w-5 h-5" />
                 </div>
                 <div>
                    <h2 className="font-bold text-lg leading-tight">{selectedTicket.subject}</h2>
                    <p className="text-xs text-slate-500">Tenant: {selectedTicket.tenantId} • Status: {selectedTicket.status}</p>
                 </div>
              </div>
              <div className="flex gap-2">
                 <Button variant="outline" size="sm" onClick={handleResolve} disabled={selectedTicket.status === "RESOLVED"}>
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Resolve
                 </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 p-8">
              <div className="max-w-4xl mx-auto space-y-6 pb-24">
                {selectedTicket.messages?.map((msg: any) => (
                  <div key={msg.id} className={`flex ${msg.isFromAdmin ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl p-5 ${
                      msg.isFromAdmin ? "bg-indigo-900 text-white rounded-tr-none" : "bg-white border text-slate-800 shadow-sm rounded-tl-none"
                    }`}>
                      <div className="flex items-center justify-between gap-4 mb-2 opacity-60 text-[10px] font-bold uppercase">
                         <span>{msg.isFromAdmin ? "Me (Admin)" : "Customer"}</span>
                         <span>{formatDistanceToNow(new Date(msg.createdAt))} ago</span>
                      </div>
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="p-6 bg-white border-t border-slate-200">
               <div className="max-w-4xl mx-auto space-y-4">
                  <Textarea 
                    placeholder="Send an official response to the customer..." 
                    className="min-h-[100px] border-slate-200 shadow-sm focus:border-indigo-400 focus:ring-indigo-100"
                    value={adminReply}
                    onChange={(e) => setAdminReply(e.target.value)}
                  />
                  <div className="flex justify-between items-center text-sm text-slate-500">
                     <p>Customer will receive an in-app notification.</p>
                     <Button className="bg-indigo-900 hover:bg-black text-white px-8" onClick={handleAdminReply} disabled={!adminReply}>
                        <Send className="w-4 h-4 mr-2" /> Send Official Reply
                     </Button>
                  </div>
               </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
             <MessageSquare className="w-20 h-20 opacity-10 mb-4" />
             <p className="text-lg font-medium opacity-50">Select a support request to address</p>
          </div>
        )}
      </div>
    </div>
  )
}
