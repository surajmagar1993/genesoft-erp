"use client"

import { ConfirmHost } from "@/components/confirm-dialog"
import { useState, useEffect, useRef } from "react"
import { LogoutMenuItem } from '@/components/auth/logout-button'
import { RoleProvider } from "@/components/auth/role-context"
import { SkipLink } from "@/components/skip-link"
import { IdleWatcher } from "@/components/auth/idle-watcher"
import { getMyAccess } from "@/lib/get-tenant-id"
import { MODULES, isAdminRole, moduleForPath, type ModuleAccess } from "@/lib/access"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
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
    Percent,
    FileSpreadsheet,
    ShieldCheck,
    MessageSquare,
    Megaphone,
    X,
    Eye,
    UserCheck,
    Award,
    Zap,
    BookOpen,
} from "lucide-react"
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "next-themes"
import { NotificationsDropdown } from '@/components/notifications-dropdown'
import Script from "next/script"
import { getTaxJurisdiction, isTaxRouteApplicable } from "@/lib/tax-jurisdiction"
import { COMPLIANCE_MODULES_ENABLED, isComplianceRoute, PARKED_MODULES_ENABLED, isParkedRoute } from "@/lib/features"
import { getAnnouncement } from "@/app/actions/announcement"

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
    /** Modules the workspace's plan includes (Rentals too); hidden when false */
    planModules: Record<string, boolean>
    countryCode: string
    multiJurisdiction: boolean
    tenantName?: string
    /** The platform Super Admin, in their own workspace: show the way back to the console */
    isSuperAdmin?: boolean
    userName: string
    userEmail: string
}

/** What the server layout loads once before the first paint */
export interface ShellInitial {
    role: string
    access: ModuleAccess
    planModules: Record<string, boolean>
    /** The business's country ("" until they set one) */
    countryCode: string
    multiJurisdiction: boolean
    tenantName: string
    announcement: string | null
    userName: string
    userEmail: string
}

/** Two letters for the avatar, from the person's name or email */
function initialsOf(name: string, email: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean)
    if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase()
    return (words[0] || email).slice(0, 2).toUpperCase()
}

const DISMISSED_ANNOUNCEMENT_KEY = "genesoft:dismissed-announcement"

/** Parts of Sales a plan can leave out */
const PLAN_ROUTES: Record<string, string> = { "/sales/rental": "rentals" }

/** The menu as this person sees it: modules switched off, not in the plan, or without access are left out */
function visibleNavigation({ access, accessLoaded, planModules, countryCode, multiJurisdiction }: Pick<AppSidebarProps, "access" | "accessLoaded" | "planModules" | "countryCode" | "multiJurisdiction">) {
    return navigation.map((group) => {
        // Government-filing modules stay hidden until connected to the official APIs
        if (!COMPLIANCE_MODULES_ENABLED) {
            group = { ...group, items: group.items.filter((item) => !isComplianceRoute(item.href)) }
        }
        // Emails, WhatsApp, Web Forms and Bank Reconciliation are switched off
        if (!PARKED_MODULES_ENABLED) {
            group = { ...group, items: group.items.filter((item) => !isParkedRoute(item.href)) }
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
                const pathModule = moduleForPath(item.href)
                // Modules the plan leaves out are hidden for everyone, admins too
                if (planModules[PLAN_ROUTES[item.href] ?? pathModule ?? ""] === false) return false
                if (!pathModule) return true
                if (!accessLoaded) return false
                return !access || access[pathModule] !== "NONE"
            }),
        }))
        .filter((group) => group.items.length > 0)
}

function AppSidebar({ access, accessLoaded, planModules, countryCode, multiJurisdiction, tenantName, isSuperAdmin = false, userName, userEmail }: AppSidebarProps) {
    const pathname = usePathname()
    const jurisdiction = getTaxJurisdiction(countryCode)

    const filteredNavigation = visibleNavigation({ access, accessLoaded, planModules, countryCode, multiJurisdiction })

    // Only the closest match is the current page ("Invoices" isn't lit on Recurring Invoices)
    const activeHref = filteredNavigation
        .flatMap((group) => group.items.map((item) => item.href))
        .filter((href) => pathname === href || pathname.startsWith(href + "/"))
        .sort((a, b) => b.length - a.length)[0]

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

            <nav aria-label="Main menu" className="contents">
            <SidebarContent>
                {filteredNavigation.map((group) => (
                    <SidebarGroup key={group.label}>
                        <SidebarGroupLabel className="flex items-center justify-between">
                            <span>{group.label}</span>
                            {group.label === "Finance" && (
                                <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-sidebar-accent text-sidebar-foreground/80">
                                    {jurisdiction.flag} {jurisdiction.taxLabel}
                                </span>
                            )}
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {group.items.map((item) => {
                                    const isActive = item.href === activeHref
                                    return (
                                        <SidebarMenuItem key={item.name}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={isActive}
                                                tooltip={item.name}
                                            >
                                                <Link href={item.href} aria-current={isActive ? "page" : undefined}>
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
            </nav>


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
                                            {initialsOf(userName, userEmail)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-semibold">
                                            {userName || (isSuperAdmin ? "Super Admin" : userEmail)}
                                        </span>
                                        <span className="truncate text-xs text-muted-foreground">
                                            {userName ? userEmail : isSuperAdmin ? userEmail : ""}
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
                                {isSuperAdmin && (
                                    <DropdownMenuItem asChild>
                                        <Link href="/admin/dashboard" className="flex items-center cursor-pointer w-full">
                                            <ShieldCheck className="mr-2 h-4 w-4" />
                                            Super Admin console
                                        </Link>
                                    </DropdownMenuItem>
                                )}
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

function TopBar({ pages }: { pages: { group: string; name: string; href: string }[] }) {
    const { theme, setTheme } = useTheme()
    const router = useRouter()
    const [finderOpen, setFinderOpen] = useState(false)
    // Ctrl+K / ⌘K opens the page finder anywhere in the app
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setFinderOpen((open) => !open)
            }
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [])

    return (
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />

            {/* Find a page */}
            <div className="flex-1 max-w-xs sm:max-w-md">
                <button
                    type="button"
                    onClick={() => setFinderOpen(true)}
                    className="flex h-9 w-full items-center gap-2 rounded-md border bg-muted/50 px-2.5 text-left text-sm text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="flex-1 truncate">Go to a page…</span>
                    <kbd className="hidden sm:inline rounded border bg-background px-1.5 text-xs font-medium">Ctrl K</kbd>
                </button>
            </div>
            <CommandDialog open={finderOpen} onOpenChange={setFinderOpen} title="Go to a page" description="Type the name of a page and press Enter">
                <CommandInput placeholder="Type a page name" />
                <CommandList>
                    <CommandEmpty>No page with that name.</CommandEmpty>
                    {[...new Set(pages.map((p) => p.group))].map((group) => (
                        <CommandGroup key={group} heading={group}>
                            {pages.filter((p) => p.group === group).map((p) => (
                                <CommandItem
                                    key={p.href}
                                    value={`${p.name} ${group}`}
                                    onSelect={() => {
                                        setFinderOpen(false)
                                        router.push(p.href)
                                    }}
                                >
                                    {p.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    ))}
                </CommandList>
            </CommandDialog>

            <div className="ml-auto flex items-center gap-2">
                {/* Theme Toggle */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    aria-label="Switch between light and dark mode"
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

export function DashboardShell({
    children,
    initial,
}: {
    children: React.ReactNode
    initial: ShellInitial
}) {
    const pathname = usePathname()
    const tenantCountry = initial.countryCode
    const multiJurisdiction = initial.multiJurisdiction
    const tenantName = initial.tenantName
    const [announcement, setAnnouncement] = useState<string | null>(initial.announcement)
    const [dismissed, setDismissed] = useState<string | null>(null)
    const [role, setRole] = useState<string>(initial.role)
    const [access, setAccess] = useState<ModuleAccess>(initial.access)
    const [planModules, setPlanModules] = useState<Record<string, boolean>>(initial.planModules)

    // A message the user closed stays closed (on this device) until the platform posts a different one
    useEffect(() => {
        try {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- read from the browser after hydration
            setDismissed(window.localStorage.getItem(DISMISSED_ANNOUNCEMENT_KEY))
        } catch {
            // storage blocked: the message simply shows again next time
        }
    }, [])
    const dismissAnnouncement = () => {
        setDismissed(announcement)
        try {
            if (announcement) window.localStorage.setItem(DISMISSED_ANNOUNCEMENT_KEY, announcement)
        } catch {
            // storage blocked
        }
    }

    // New broadcasts reach people who keep the app open: check again every few minutes
    useEffect(() => {
        const timer = window.setInterval(() => {
            getAnnouncement().then(setAnnouncement).catch(() => {})
        }, 5 * 60 * 1000)
        return () => window.clearInterval(timer)
    }, [])

    // Access was loaded with the page; when the user moves to another page, pick up
    // any change an admin made meanwhile (in the background, the menu doesn't blank)
    const firstPath = useRef(pathname)
    useEffect(() => {
        if (firstPath.current === pathname) return
        firstPath.current = ""
        let isMounted = true
        getMyAccess()
            .then(({ role, access, planModules }) => {
                if (!isMounted) return
                setRole(role)
                setAccess(access)
                setPlanModules(planModules)
            })
            .catch((err) => console.error("Error loading access:", err))
        return () => {
            isMounted = false
        }
    }, [pathname])

    const bannerMessage = announcement && announcement !== dismissed ? announcement : null
    const currentModule = moduleForPath(pathname)
    const viewOnlyModule = !isAdminRole(role) && currentModule && access[currentModule] === "VIEW"
        ? MODULES.find((m) => m.key === currentModule)?.label
        : null

    return (
        <SidebarProvider>
            <SkipLink />
            <ConfirmHost />
            <IdleWatcher />
            <Script {...({ id: "razorpay-checkout", src: "https://checkout.razorpay.com/v1/checkout.js", strategy: "lazyOnload" })} />
            <AppSidebar
                access={isAdminRole(role) ? null : access}
                accessLoaded
                planModules={planModules}
                countryCode={tenantCountry}
                multiJurisdiction={multiJurisdiction}
                tenantName={tenantName}
                isSuperAdmin={role === "SUPER_ADMIN"}
                userName={initial.userName}
                userEmail={initial.userEmail}
            />
            <SidebarInset id="main-content" tabIndex={-1} className="focus:outline-none">
                <TopBar
                    pages={visibleNavigation({
                        access: isAdminRole(role) ? null : access,
                        accessLoaded: true,
                        planModules,
                        countryCode: tenantCountry,
                        multiJurisdiction,
                    }).flatMap((g) => g.items.map((i) => ({ group: g.label, name: i.name, href: i.href })))}
                />
                <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 w-full">
                    {bannerMessage && (
                        <div role="status" className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-300 text-sm font-medium flex items-start justify-between gap-3 shadow-sm animate-in fade-in">
                            <div className="flex items-start gap-2 min-w-0">
                                <Megaphone className="h-4 w-4 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
                                <span className="whitespace-pre-line break-words">{bannerMessage}</span>
                            </div>
                            <button
                                type="button"
                                onClick={dismissAnnouncement}
                                className="shrink-0 rounded p-1.5 text-current opacity-70 hover:opacity-100"
                                aria-label="Dismiss this notice"
                                title="Dismiss this notice"
                            >
                                <X className="h-4 w-4" aria-hidden="true" />
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


