"use client"

import React, { useState } from "react"
import { useChatMessages, Message } from "@/hooks/use-chat-messages"
import { replyToTicket } from "@/app/actions/saas/admin"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Send, Clock, User, Building2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"

interface AdminChatViewProps {
  ticketId: string
  initialMessages: Message[]
}

export function AdminChatView({ ticketId, initialMessages }: AdminChatViewProps) {
  const { messages, setMessages } = useChatMessages(ticketId, initialMessages)
  const [reply, setReply] = useState("")
  const [isSending, setIsSending] = useState(false)

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reply.trim() || isSending) return

    setIsSending(true)
    try {
      await replyToTicket(ticketId, reply)
      setReply("")
      toast.success("Reply dispatched")
    } catch (err) {
      toast.error("Failed to send reply")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Chat History */}
      <div className="space-y-4 min-h-[400px] bg-muted/20 rounded-xl p-6 border border-primary/5">
        {messages.map((message: any) => (
          <div key={message.id} className={cn(
            "flex flex-col max-w-[80%] gap-1",
            message.isFromAdmin ? "ml-auto items-end" : "mr-auto items-start"
          )}>
            <div className={cn(
              "flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2",
              message.isFromAdmin ? "flex-row-reverse" : "flex-row"
            )}>
              {message.isFromAdmin ? "Genesoft Support" : "Tenant Contact"}
              <span>•</span>
              <span>{formatDistanceToNow(new Date(message.createdAt))} ago</span>
            </div>
            <div className={cn(
              "rounded-2xl px-4 py-3 text-sm shadow-sm",
              message.isFromAdmin 
                ? "bg-primary text-primary-foreground rounded-tr-none" 
                : "bg-card text-card-foreground border rounded-tl-none"
            )}>
              {message.content}
            </div>
          </div>
        ))}
      </div>

      {/* Reply Editor */}
      <Card className="border-primary/10 shadow-lg overflow-hidden glass">
        <form onSubmit={handleReply}>
          <CardHeader className="py-3 bg-muted/30 border-b">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Broadcast Response
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <Textarea 
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Type your official support response here..."
              className="min-h-[120px] focus-visible:ring-primary border-primary/10"
              required
            />
          </CardContent>
          <CardFooter className="bg-muted/30 border-t flex justify-end py-3">
            <Button type="submit" disabled={isSending} className="gap-2 font-bold shadow-primary/20 shadow-lg">
              <Send className="h-4 w-4" />
              {isSending ? "Dispatching..." : "Dispatch Reply"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}
