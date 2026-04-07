import { getTicketMessages } from "@/app/actions/saas/admin"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Building2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { AdminChatView } from "@/components/admin/support/admin-chat-view"

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
    const ticketId = params.id
    
    const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
        include: {
            tenant: {
                select: { name: true }
            }
        }
    })

    if (!ticket) notFound()

    const messages = await getTicketMessages(ticketId)

    return (
        <div className="space-y-6 max-w-4xl mx-auto px-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-4">
                    <Link href="/admin/support">
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                             <Badge variant="outline" className="text-[10px] font-bold">
                                {ticket.status}
                             </Badge>
                             <h1 className="text-xl font-bold tracking-tight">{ticket.subject}</h1>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5" />
                            {ticket.tenant.name}
                        </p>
                    </div>
                </div>
            </div>

            {/* Real-time Chat View */}
            <AdminChatView 
                ticketId={ticketId} 
                initialMessages={messages} 
            />
        </div>
    )
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ')
}
