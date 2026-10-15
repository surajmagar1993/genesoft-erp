"use client"

import { useState, useEffect } from "react"
import { UserProfileEmail } from "@/components/auth/user-profile-email"
import { LogoutMenuItem } from '@/components/auth/logout-button'
import { RoleProvider } from "@/components/auth/role-context"
import { getMyAccess } from "@/lib/get-tenant-id"
import { MODULES, isAdminRole, moduleForPath, type ModuleAccess } from "@/lib/access"
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
    Megaphone,
    Eye,
    UserCheck,
    Award,
    Zap,
    BookOpen,
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
import { COMPLIANCE_MODULES_ENABLED, isComplianceRoute } from "@/lib/features"
import { getTenantSettings } from "@/app/actions/settings/tenant"
import { getGlobalSettings } from "@/app/actions/saas/admin"

const STATUTORY_TAX_ROUTES = [
    "/finance/vat-uae",
    "/finance/vat-ksa",
    "/finance/tax-australia",
    "/finance/vat-uk",
    "/finance/tax-us",
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
            { name: "General Ledger", href: "/finance/ledger", icon: BookOpen },
            { name: "Expenses & Ledger", href: "/finance/expenses", icon: ReceiptText },
            { name: "Bank Reconciliation", href: "/finance/bank-reconciliation", icon: Scale },
            { name: "Budgets & Variance", href: "/finance/budgets", icon: Target },
            { name: "Receivables", href: "/finance/receivable", icon: TrendingUp },
            { name: "Payables", href: "/finance/payable", icon: Wallet },
            { name: "Bills", href: "/finance/bills", icon: FileText },
            { name: "Payments", href: "/finance/payments", icon: CreditCard },
            { name: "UAE VAT (Form 201)", href: "/finance/vat-uae", icon: Landmark },
            { name: "KSA VAT & ZATCA", href: "/finance/vat-ksa", icon: ShieldCheck },
            { name: "Australia BAS (GST)", href: "/finance/tax-australia", icon: Landmark },
            { name: "UK VAT (MTD)", href: "/finance/vat-uk", icon: FileSpreadsheet },
            { name: "US Sales Tax & 1099", href: "/finance/tax-us", icon: DollarSign },
            { name: "Tax Summary", href: "/finance/tax-summary", icon: Percent },
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
            { name: "Employee Portal", href: "/hr/portal", icon: UserCheck },
            { name: "Performance & Training", href: "/hr/performance", icon: Award },
            { name: "Projects", href: "/projects", icon: FolderKanban },
        ],
    },
    {
        label: "Analytics",
        items: [
            { name: "Overview", href: "/reports", icon: BarChart3 },
            { name: "Report Builder", href: "/reports/builder", icon: FileSpreadsheet },
        ],
    },
    {
        label: "System",
        items: [
            { name: "Settings", href: "/settings", icon: Settings },
            { name: "Workflows", href: "/settings/workflows", icon: Zap },
        ],
    },
]

interface AppSidebarProps {
    /** Module access of a member (null for admins: everything) */
    access: ModuleAccess | null
    accessLoaded: boolean
    /** Modules the workspace's plan includes (POS and Rentals too); hidden when false */
    planModules: Record<string, boolean>
    countryCode: string
    multiJurisdiction: boolean
    tenantName?: string
}

/** Parts of Sales a plan can leave out */
const PLAN_ROUTES: Record<string, string> = { "/sales/pos": "pos", "/sales/rental": "rentals" }

function AppSidebar({ access, accessLoaded, planModules, countryCode, multiJurisdiction, tenantName }: AppSidebarProps) {
    const pathname = usePathname()
    const jurisdiction = getTaxJurisdiction(countryCode)

    const filteredNavigation = navigation.map((group) => {
        // Government-filing modules stay hidden until connected to the official APIs
        if (!COMPLIANCE_MODULES_ENABLED) {
            group = { ...group, items: group.items.filter((item) => !isComplianceRoute(item.href)) }
        }
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
        // Members see only the modules they have access to (hidden until access is known)
        .map((group) => ({
            ...group,
            items: group.items.filter((item) => {
                const module = moduleForPath(item.href)
                // Modules the plan leaves out are hidden for everyone, admins too
                if (planModules[PLAN_ROUTES[item.href] ?? module ?? ""] === false) return false
                if (!module) return true
                if (!accessLoaded) return false
                return !access || access[module] !== "NONE"
            }),
        }))
        .filter((group) => group.items.length > 0)

    return (
        <Sidebar collapsible="icon" variant="sidebar">
            <SidebarHeader className="border-b border-sidebar-border">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/reports" className="flex items-center gap-3">
                                <div className="flex aspect-square size-8 shrink-0 items-center justify-center">
                                    <Image
                                        src="/logo-mark.png"
                                        alt="Genesoft Infotech"
                                        width={32}
                                        height={32}
                                        className="size-8 object-contain"
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
    const [bannerMessage, setBannerMessage] = useState<string | null>(null)
    const [role, setRole] = useState<string | null>(null)
    const [access, setAccess] = useState<ModuleAccess | null>(null)
    const [planModules, setPlanModules] = useState<Record<string, boolean>>({})

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

        getGlobalSettings()
            .then((settings) => {
                if (isMounted && settings?.bannerMessage) {
                    setBannerMessage(settings.bannerMessage)
                }
            })
            .catch((err) => {
                console.error("Error loading global settings:", err)
            })

        return () => {
            isMounted = false
        }
    }, [])

    useEffect(() => {
        let isMounted = true
        getMyAccess()
            .then(({ role, access, planModules }) => {
                if (!isMounted) return
                setRole(role)
                setAccess(access)
                setPlanModules(planModules)
                if (role === 'SUPER_ADMIN' && !pathname.startsWith('/admin') && !pathname.startsWith('/saas')) {
                    window.location.href = '/admin/dashboard'
                }
            })
            .catch((err) => console.error("Error loading access:", err))
        return () => {
            isMounted = false
        }
    }, [pathname])

    const currentModule = moduleForPath(pathname)
    const viewOnlyModule = role && !isAdminRole(role) && access && currentModule && access[currentModule] === "VIEW"
        ? MODULES.find((m) => m.key === currentModule)?.label
        : null

    return (
        <SidebarProvider>
            <Script {...({ id: "razorpay-checkout", src: "https://checkout.razorpay.com/v1/checkout.js", strategy: "lazyOnload" } as any)} />
            <AppSidebar
                access={role && isAdminRole(role) ? null : access}
                accessLoaded={role !== null}
                planModules={planModules}
                countryCode={tenantCountry}
                multiJurisdiction={multiJurisdiction}
                tenantName={tenantName}
            />
            <SidebarInset>
                <TopBar />
                <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 w-full">
                    {bannerMessage && (
                        <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-300 text-xs font-medium flex items-center justify-between shadow-sm animate-in fade-in">
                            <div className="flex items-center gap-2">
                                <Megaphone className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                <span>{bannerMessage}</span>
                            </div>
                            <button
                                onClick={() => setBannerMessage(null)}
                                className="text-muted-foreground hover:text-foreground text-xs p-1"
                                title="Dismiss notice"
                            >
                                ✕
                            </button>
                        </div>
                    )}
                    {viewOnlyModule && (
                        <div className="mb-4 p-3 rounded-lg bg-muted border text-muted-foreground text-xs font-medium flex items-center gap-2">
                            <Eye className="h-4 w-4 shrink-0" />
                            <span>You have view-only access to {viewOnlyModule}. Ask a workspace admin if you need to make changes.</span>
                        </div>
                    )}
                    <RoleProvider role={role} access={access}>
                        {children}
                    </RoleProvider>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}


