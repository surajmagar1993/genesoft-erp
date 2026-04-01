"use client"

import { useEffect, useState } from "react"
import { Bell } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
    getNotifications, 
    markNotificationAsRead, 
    markAllAsRead,
    Notification 
} from "@/app/actions/notifications"
import Link from "next/link"

export function NotificationsDropdown() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    
    // Calculate unread count correctly from is_read property
    const unreadCount = notifications.filter(n => !n.is_read).length

    const fetchNotifications = async () => {
        try {
            const data = await getNotifications()
            setNotifications(data)
        } catch (error) {
            console.error("Failed to fetch notifications:", error)
        }
    }

    useEffect(() => {
        fetchNotifications()
        
        // Polling every 60 seconds as a simple mechanism
        // Alternatively, use Supabase Realtime subscriptions for live updates
        const interval = setInterval(fetchNotifications, 60000)
        return () => clearInterval(interval)
    }, [])

    const handleMarkAsRead = async (id: string) => {
        await markNotificationAsRead(id)
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    }

    const handleMarkAllAsRead = async () => {
        await markAllAsRead()
        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 relative">
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                        >
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between px-4 py-2 border-b">
                    <span className="text-sm font-semibold">Notifications</span>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-xs text-muted-foreground hover:text-primary h-8 px-2 uppercase tracking-tight"
                            onClick={(e) => {
                                e.preventDefault()
                                handleMarkAllAsRead()
                            }}
                        >
                            Mark all as read
                        </Button>
                    )}
                </div>
                <div className="max-h-[350px] overflow-auto">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                            No notifications
                        </div>
                    ) : (
                        notifications.map((n) => (
                            <DropdownMenuItem 
                                key={n.id} 
                                className={`flex flex-col items-start gap-1 p-4 cursor-pointer focus:bg-accent border-b last:border-0 rounded-none ${!n.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                onSelect={() => handleMarkAsRead(n.id)}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <span className={`text-sm ${!n.is_read ? 'font-semibold text-primary' : 'font-medium'}`}>
                                        {n.title}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                    {n.description}
                                </p>
                                {n.link && (
                                    <Link 
                                        href={n.link} 
                                        className="text-[10px] text-primary hover:underline mt-1 font-medium"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        View details
                                    </Link>
                                )}
                            </DropdownMenuItem>
                        ))
                    )}
                </div>
                {notifications.length > 0 && (
                    <div className="p-2 border-t mt-1">
                        <Button variant="ghost" size="sm" className="w-full text-xs h-8 text-muted-foreground" asChild>
                            <Link href="/settings/notifications">
                                View all notifications
                            </Link>
                        </Button>
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
