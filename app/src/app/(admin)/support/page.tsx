import { getSupportTickets } from "@/app/actions/saas/admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MessageSquare, Clock, User, Building2, ChevronRight, AlertCircle, CheckCircle2, Inbox } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"

export default async function SupportInboxPage() {
    const tickets = await getSupportTickets()

    const getStatusVariant = (status: string) => {
        switch (status) {
            case "OPEN": return "destructive"
            case "IN_PROGRESS": return "default"
            case "RESOLVED": return "secondary"
            case "CLOSED": return "outline"
            default: return "outline"
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Support Command</h1>
                    <p className="text-muted-foreground mt-1">
                        Unified inbox for platform-wide tenant assistance.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-200">
                        {tickets.filter((t: any) => t.status === "OPEN").length} Urgent
                    </Badge>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                        {tickets.length} Total Tickets
                    </Badge>
                </div>
            </div>

            <Card className="border-primary/10 shadow-xl bg-card/50 backdrop-blur overflow-hidden">
                <CardHeader className="bg-muted/30 border-b">
                    <div className="flex items-center gap-2">
                        <Inbox className="h-5 w-5 text-primary" />
                        <CardTitle>Global Inbox</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[400px]">Issue & Tenant</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Last Activity</TableHead>
                                <TableHead className="text-right pr-6">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tickets.length > 0 ? (
                                tickets.map((ticket: any) => (
                                    <TableRow key={ticket.id} className="group hover:bg-primary/5 transition-colors">
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <span className="font-bold text-sm tracking-tight group-hover:text-primary transition-colors">
                                                    {ticket.subject}
                                                </span>
                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                                                    <Building2 className="h-3 w-3" />
                                                    {ticket.tenant.name}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusVariant(ticket.status)} className="text-[10px] font-black h-5">
                                                {ticket.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                <div className={cn(
                                                    "h-1.5 w-1.5 rounded-full",
                                                    ticket.priority === 'HIGH' ? "bg-rose-500" :
                                                    ticket.priority === 'MEDIUM' ? "bg-amber-500" : "bg-emerald-500"
                                                )} />
                                                <span className="text-xs font-semibold">{ticket.priority}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Clock className="h-3 w-3" />
                                                {formatDistanceToNow(new Date(ticket.updatedAt))} ago
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Button variant="ghost" size="sm" className="h-8 gap-2 font-bold group-hover:bg-primary group-hover:text-white transition-all">
                                                Respond
                                                <ChevronRight className="h-3.5 w-3.5" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <CheckCircle2 className="h-10 w-10 opacity-20" />
                                            <p className="font-medium text-lg">Inbox Zero achieved!</p>
                                            <p className="text-sm opacity-60">All platform enquiries have been addressed.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ')
}
