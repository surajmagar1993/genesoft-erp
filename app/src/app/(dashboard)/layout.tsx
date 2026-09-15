"use client"

import { useState, useEffect } from "react"
import { UserProfileEmail } from "@/components/auth/user-profile-email"
import { createClient } from "@/lib/supabase/client"
import { LogoutMenuItem } from '@/components/auth/logout-button'
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
    Truck,
    PackageCheck,
    Factory,
    DollarSign,
    UserCog,
    FolderKanban,
    Home,
    FileMinus,
    ChevronDown,

    Bell,
    Search,
    Moon,
    Sun,
    CheckSquare,
    CreditCard,
    Landmark,
    TrendingUp,
    Wallet,
    ReceiptText,
    Tag,
    Scale,
    Repeat,
    Mail,
    Globe,
    Monitor,
    Percent,
    FileSpreadsheet,
    ShieldCheck,
    MessageSquare,
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
import { NotificationsDropdown } from '@/components/notifications-dropdown'
import Script from "next/script"
import { getTaxJurisdiction, isTaxRouteApplicable } from "@/lib/tax-jurisdiction"
import { getTenantSettings } from "@/app/actions/settings/tenant"

const STATUTORY_TAX_ROUTES = [
    "/finance/gst-returns",
    "/finance/tds",
    "/finance/vat-uae",
    "/finance/vat-ksa",
    "/finance/tax-australia",
    "/finance/vat-uk",
]

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
            { name: "Emails", href: "/crm/emails", icon: Mail },
            { name: "WhatsApp", href: "/crm/whatsapp", icon: MessageSquare },
            { name: "Web Forms", href: "/crm/forms", icon: Globe },
            { name: "Tasks", href: "/crm/tasks", icon: CheckSquare },
        ],
    },
    {
        label: "Sales",
        items: [
            { name: "Products", href: "/sales/products", icon: Package },
            { name: "Price Lists", href: "/sales/price-lists", icon: Tag },
            { name: "Quotations", href: "/sales/quotes", icon: FileText },
            { name: "Orders", href: "/sales/orders", icon: ShoppingCart },
            { name: "Invoices", href: "/sales/invoices", icon: Receipt },
            { name: "Delivery Challans", href: "/sales/delivery-challans", icon: PackageCheck },
            { name: "E-Way Bills", href: "/sales/eway-bills", icon: Truck },
            { name: "Recurring Invoices", href: "/sales/invoices/recurring", icon: Repeat },
            { name: "Credit Notes", href: "/sales/credit-notes", icon: FileMinus },
            { name: "Rental", href: "/sales/rental", icon: Home },
            { name: "POS Terminal", href: "/sales/pos", icon: Monitor },
        ],
    },
    {
        label: "Finance",
        items: [
            { name: "Chart of Accounts", href: "/finance/accounts", icon: Landmark },
            { name: "Expenses & Ledger", href: "/finance/expenses", icon: ReceiptText },
            { name: "Bank Reconciliation", href: "/finance/bank-reconciliation", icon: Scale },
            { name: "Receivables", href: "/finance/receivable", icon: TrendingUp },
            { name: "Payables", href: "/finance/payable", icon: Wallet },
            { name: "Bills", href: "/finance/bills", icon: FileText },
            { name: "Payments", href: "/finance/payments", icon: CreditCard },
            { name: "TDS & Withholding", href: "/finance/tds", icon: Percent },
            { name: "GST Returns (GSTR)", href: "/finance/gst-returns", icon: FileSpreadsheet },
            { name: "UAE VAT (Form 201)", href: "/finance/vat-uae", icon: Landmark },
            { name: "KSA VAT & ZATCA", href: "/finance/vat-ksa", icon: ShieldCheck },
            { name: "Australia BAS (GST)", href: "/finance/tax-australia", icon: Landmark },
            { name: "UK VAT (MTD)", href: "/finance/vat-uk", icon: FileSpreadsheet },
            { name: "Reports", href: "/finance/reports", icon: BarChart3 },
        ],
    },
    {
        label: "Operations",
        items: [
            { name: "Purchase", href: "/purchase", icon: Truck },
            { name: "Inventory", href: "/inventory", icon: Warehouse },
            { name: "Manufacturing", href: "/manufacturing", icon: Factory },
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

interface AppSidebarProps {
    countryCode: string
    multiJurisdiction: boolean
    tenantName?: string
}

function AppSidebar({ countryCode, multiJurisdiction, tenantName }: AppSidebarProps) {
    const pathname = usePathname()
    const jurisdiction = getTaxJurisdiction(countryCode)

    const filteredNavigation = navigation.map((group) => {
        if (group.label === "Finance") {
            const items = group.items.filter((item) => {
                if (STATUTORY_TAX_ROUTES.includes(item.href)) {
                    return isTaxRouteApplicable(item.href, countryCode, multiJurisdiction)
                }
                return true
            })
            return { ...group, items }
        }
        if (group.label === "Sales") {
            const items = group.items.filter((item) => {
                if (item.href === "/sales/eway-bills") {
                    return countryCode === "IN" || multiJurisdiction
                }
                return true
            })
            return { ...group, items }
        }
        return group
    })

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
                                    <span className="truncate font-semibold text-base">
                                        {tenantName || "Genesoft ERP"}
                                    </span>
                                    <span className="truncate text-xs text-muted-foreground flex items-center gap-1">
                                        <span>{jurisdiction.flag} {jurisdiction.taxLabel}</span>
                                        <span>•</span>
                                        <span>{jurisdiction.currencyCode}</span>
                                    </span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {filteredNavigation.map((group) => (
                    <SidebarGroup key={group.label}>
                        <SidebarGroupLabel className="flex items-center justify-between">
                            <span>{group.label}</span>
                            {group.label === "Finance" && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-sidebar-accent text-sidebar-foreground/80">
                                    {jurisdiction.flag} {jurisdiction.taxLabel}
                                </span>
                            )}
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
                                        <span className="truncate font-semibold uppercase">
                                            {pathname.includes("/admin") || pathname.includes("/saas") ? "SaaS Admin" : "User Profile"}
                                        </span>
                                        <span className="truncate text-xs text-muted-foreground opacity-70">
                                            <UserProfileEmail />
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
                                <DropdownMenuItem asChild>
                                    <Link href="/settings" className="flex items-center cursor-pointer w-full">
                                        <Settings className="mr-2 h-4 w-4" />
                                        Settings
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

function TopBar() {
    const { theme, setTheme } = useTheme()

    return (
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />

            {/* Search */}
            <div className="flex-1 max-w-xs sm:max-w-md">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search ERP..."
                        className="pl-8 h-9 bg-muted/50 text-xs sm:text-sm"
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
                <NotificationsDropdown />

            </div>
        </header>
    )
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const [tenantCountry, setTenantCountry] = useState<string>("IN")
    const [multiJurisdiction, setMultiJurisdiction] = useState<boolean>(false)
    const [tenantName, setTenantName] = useState<string>("")

    useEffect(() => {
        let isMounted = true
        getTenantSettings()
            .then((settings) => {
                if (isMounted && settings) {
                    if (settings.country_code) setTenantCountry(settings.country_code)
                    if (settings.name) setTenantName(settings.name)
                    if (settings.settings?.enable_multijurisdiction) {
                        setMultiJurisdiction(true)
                    }
                }
            })
            .catch((err) => {
                console.error("Error loading tenant settings:", err)
            })
        return () => {
            isMounted = false
        }
    }, [])

    useEffect(() => {
        const checkRole = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: userData } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single()
                
                if (userData?.role === 'SUPER_ADMIN') {
                    // Only redirect if not already on an admin page (should be safe due to layout structure)
                    if (!pathname.startsWith('/admin') && !pathname.startsWith('/saas')) {
                        window.location.href = '/admin/dashboard'
                    }
                }
            }
        }
        checkRole()
    }, [pathname])

    return (
        <SidebarProvider>
            <Script {...({ id: "razorpay-checkout", src: "https://checkout.razorpay.com/v1/checkout.js", strategy: "lazyOnload" } as any)} />
            <AppSidebar

                countryCode={tenantCountry}
                multiJurisdiction={multiJurisdiction}
                tenantName={tenantName}
            />
            <SidebarInset>
                <TopBar />
                <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 w-full">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}


