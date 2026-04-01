import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Message {
  id: string
  ticketId: string
  senderId: string
  content: string
  isFromAdmin: boolean
  createdAt: string | Date
}

export function useChatMessages(ticketId: string | null, initialMessages: Message[] = []) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const supabase = createClient()

  useEffect(() => {
    if (!ticketId) {
      setMessages([])
      return
    }

    setMessages(initialMessages)

    // Subscribe to new messages for this ticket
    const channel = supabase
      .channel(`ticket-chat-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message
          setMessages((current) => {
            // Check for duplicates (e.g. if the action also updated the local state)
            if (current.some((m) => m.id === newMessage.id)) return current
            return [...current, newMessage]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [ticketId, initialMessages])

  return {
    messages,
    setMessages,
  }
}
