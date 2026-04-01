"use client"

import { LogoutMenuItem } from '@/components/auth/logout-button'
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import {
    LayoutDashboard,
    Building2,
    CreditCard,
    MessageSquare,
    Terminal,
    Settings,
    ChevronDown,
    Search,
    Moon,
    Sun,
    Bell,
    ShieldCheck,
    Globe,
    Activity,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarTrigger,
    SidebarInset,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "next-themes"

const adminNavigation = [
    {
        label: "Platform",
        items: [
            { name: "Admin Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
            { name: "Tenants", href: "/admin/tenants", icon: Building2 },
            { name: "Pricing & Plans", href: "/admin/pricing", icon: CreditCard },
        ],
    },
    {
        label: "Support",
        items: [
            { name: "Support Inbox", href: "/admin/support", icon: MessageSquare },
            { name: "System Logs", href: "/admin/logs", icon: Terminal },
        ],
    },
    {
        label: "Global Settings",
        items: [
            { name: "Regions", href: "/admin/regions", icon: Globe },
            { name: "System Health", href: "/admin/health", icon: Activity },
            { name: "Admin Audit", href: "/admin/audit", icon: ShieldCheck },
        ],
    },
]

function AdminSidebar() {
    const pathname = usePathname()

    return (
        <Sidebar collapsible="icon" variant="sidebar" className="border-r-2 border-primary/10">
            <SidebarHeader className="border-b border-sidebar-border bg-primary/5">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/admin/dashboard" className="flex items-center gap-3">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-black dark:bg-white overflow-hidden p-1">
                                    <ShieldCheck className="text-white dark:text-black size-5" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-bold text-base tracking-tight">Super Admin</span>
                                    <span className="truncate text-[10px] uppercase font-bold text-primary tracking-widest">
                                        Platform Console
                                    </span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {adminNavigation.map((group) => (
                    <SidebarGroup key={group.label}>
                        <SidebarGroupLabel className="text-xs font-bold uppercase tracking-wider opacity-60">
                            {group.label}
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {group.items.map((item) => {
                                    const isActive = pathname.startsWith(item.href)
                                    return (
                                        <SidebarMenuItem key={item.name}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={isActive}
                                                tooltip={item.name}
                                                className={cn(
                                                    "transition-all duration-200",
                                                    isActive && "bg-primary/10 text-primary font-semibold"
                                                )}
                                            >
                                                <Link href={item.href}>
                                                    <item.icon className={cn("size-4", isActive && "text-primary")} />
                                                    <span>{item.name}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    )
                                })}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    className="data-[state=open]:bg-sidebar-accent"
                                >
                                    <Avatar className="h-8 w-8 rounded-lg shadow-sm border border-primary/20">
                                        <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-xs font-black">
                                            SA
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-semibold">Super Admin</span>
                                        <span className="truncate text-xs text-muted-foreground italic">
                                            Platform Oversight
                                        </span>
                                    </div>
                                    <ChevronDown className="ml-auto size-4" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                                align="end"
                                side="top"
                                sideOffset={4}
                            >
                                <DropdownMenuLabel>System Control</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href="/reports" className="flex items-center">
                                        <LayoutDashboard className="mr-2 h-4 w-4" />
                                        Back to App
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <LogoutMenuItem />
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}

function AdminTopBar() {
    const { theme, setTheme } = useTheme()

    return (
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm sticky top-0 z-50">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground tracking-tight">Platform Mode</span>
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 hidden md:flex border-primary/20 hover:bg-primary/5 hover:text-primary"
                    asChild
                >
                    <Link href="/reports">
                        <Globe className="h-3.5 w-3.5" />
                        Live Site
                    </Link>
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                    <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </Button>
                
                <Button variant="ghost" size="icon" className="h-9 w-9 relative text-muted-foreground hover:text-primary transition-colors">
                    <Bell className="h-4 w-4" />
                    <span className="absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full bg-primary" />
                </Button>
            </div>
        </header>
    )
}

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <SidebarProvider>
            <AdminSidebar />
            <SidebarInset className="bg-muted/10">
                <AdminTopBar />
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
                        {children}
                    </div>
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}
