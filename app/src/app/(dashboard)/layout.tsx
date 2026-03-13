"use client"

import { LogoutMenuItem } from '@/components/auth/logout-button'

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import {
    Users,
    Building2,
    Target,
    Handshake,
    Package,
    FileText,
    ShoppingCart,
    Receipt,
    BarChart3,
    Settings,
    LayoutDashboard,
    Warehouse,
    DollarSign,
    UserCog,
    FolderKanban,
    Home,
    ChevronDown,

    Bell,
    Search,
    Moon,
    Sun,
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
import { Badge } from "@/components/ui/badge"
import { useTheme } from "next-themes"

const navigation = [
    {
        label: "Overview",
        items: [
            { name: "Dashboard", href: "/reports", icon: LayoutDashboard },
        ],
    },
    {
        label: "CRM",
        items: [
            { name: "Contacts", href: "/crm/contacts", icon: Users },
            { name: "Companies", href: "/crm/companies", icon: Building2 },
            { name: "Leads", href: "/crm/leads", icon: Target },
            { name: "Deals", href: "/crm/deals", icon: Handshake },
        ],
    },
    {
        label: "Sales",
        items: [
            { name: "Products", href: "/sales/products", icon: Package },
            { name: "Quotations", href: "/sales/quotes", icon: FileText },
            { name: "Orders", href: "/sales/orders", icon: ShoppingCart },
            { name: "Invoices", href: "/sales/invoices", icon: Receipt },
            { name: "Rental", href: "/sales/rental", icon: Home },
        ],
    },
    {
        label: "Operations",
        items: [
            { name: "Inventory", href: "/inventory", icon: Warehouse },
            { name: "Finance", href: "/finance", icon: DollarSign },
            { name: "HR", href: "/hr", icon: UserCog },
            { name: "Projects", href: "/projects", icon: FolderKanban },
        ],
    },
    {
        label: "Analytics",
        items: [
            { name: "Reports", href: "/reports", icon: BarChart3 },
        ],
    },
    {
        label: "System",
        items: [
            { name: "Settings", href: "/settings", icon: Settings },
        ],
    },
]

function AppSidebar() {
    const pathname = usePathname()

    return (
        <Sidebar collapsible="icon" variant="sidebar">
            <SidebarHeader className="border-b border-sidebar-border">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/reports" className="flex items-center gap-3">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary overflow-hidden">
                                    <Image
                                        src="/logo.png"
                                        alt="Genesoft"
                                        width={32}
                                        height={32}
                                        className="object-contain"
                                    />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold text-base">Genesoft ERP</span>
                                    <span className="truncate text-xs text-muted-foreground">
                                        Enterprise Platform
                                    </span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {navigation.map((group) => (
                    <SidebarGroup key={group.label}>
                        <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
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
                                            >
                                                <Link href={item.href}>
                                                    <item.icon className="size-4" />
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
                                    <Avatar className="h-8 w-8 rounded-lg">
                                        <AvatarFallback className="rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm font-medium">
                                            GI
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-semibold">Admin User</span>
                                        <span className="truncate text-xs text-muted-foreground">
                                            admin@genesoft.in
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
                                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                    <Settings className="mr-2 h-4 w-4" />
                                    Settings
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

function TopBar() {
    const { theme, setTheme } = useTheme()
    const [notifications, setNotifications] = useState([
        { id: 1, title: "New Lead Assigned", description: "Rahul Deshmukh from TechFirm India", time: "2 min ago", type: "lead" },
        { id: 2, title: "Deal Stage Updated", description: "RetailGroup UAE moved to Negotiation", time: "1 hr ago", type: "deal" },
        { id: 3, title: "Quote Approved", description: "VM Edulife for ₹1,80,000", time: "3 hr ago", type: "quote" },
    ])

    return (
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />

            {/* Search */}
            <div className="flex-1 max-w-md">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search contacts, invoices, products..."
                        className="pl-8 h-9 bg-muted/50"
                    />
                </div>
            </div>

            <div className="ml-auto flex items-center gap-2">
                {/* Theme Toggle */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                    <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </Button>

                {/* Notifications */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 relative">
                            <Bell className="h-4 w-4" />
                            {notifications.length > 0 && (
                                <Badge
                                    variant="destructive"
                                    className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                                >
                                    {notifications.length}
                                </Badge>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80">
                        <div className="flex items-center justify-between px-4 py-2 border-b">
                            <span className="text-sm font-semibold">Notifications</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0 text-xs text-muted-foreground hover:text-primary h-8 px-2"
                                onClick={() => setNotifications([])}
                            >
                                Clear all
                            </Button>
                        </div>
                        <div className="max-h-[300px] overflow-auto">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-sm text-muted-foreground">
                                    No new notifications
                                </div>
                            ) : (
                                notifications.map((n: any) => (
                                    <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-1 p-4 cursor-pointer focus:bg-accent border-b last:border-0 rounded-none">
                                        <div className="flex items-center justify-between w-full">
                                            <span className="font-medium text-sm">{n.title}</span>
                                            <span className="text-[10px] text-muted-foreground">{n.time}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                            {n.description}
                                        </p>
                                    </DropdownMenuItem>
                                ))
                            )}
                        </div>
                        {notifications.length > 0 && (
                            <div className="p-2 border-t mt-1">
                                <Button variant="outline" size="sm" className="w-full text-xs h-8">
                                    View all notifications
                                </Button>
                            </div>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>

            </div>
        </header>
    )
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <TopBar />
                <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden p-6 w-full">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
