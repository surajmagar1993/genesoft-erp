"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { ChevronDown, Menu, X } from "lucide-react"
import { BrandLogo } from "@/components/brand-logo"
import { SITE_CONTAINER } from "@/components/marketing/container"
import { SiteThemePicker, SiteThemeToggle } from "@/components/marketing/site-theme"
import { ServiceIcon } from "@/components/marketing/service-icon"
import { SERVICES } from "@/lib/site-content"
import { cn } from "@/lib/utils"

type MenuLink = { href: string; label: string; text?: string }

const ERP_LINKS: MenuLink[] = [
    { href: "/erp", label: "Overview", text: "Sales, stock and accounts in one place" },
    { href: "/erp/pricing", label: "Pricing", text: "Plans for your country" },
    { href: "/register", label: "Start free trial", text: "15 days, no card needed" },
    { href: "/login", label: "Sign in", text: "For existing customers" },
]

const LINKS: MenuLink[] = [
    { href: "/portfolio", label: "Portfolio" },
    { href: "/about", label: "About" },
    { href: "/careers", label: "Careers" },
    { href: "/contact", label: "Contact" },
]

function isActive(pathname: string, href: string) {
    return pathname === href || pathname.startsWith(`${href}/`)
}

/** A drop-down that stays inside the page (so it keeps the website's theme). */
function NavMenu({ label, active, children }: { label: string; active: boolean; children: React.ReactNode }) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const pathname = usePathname()
    // Close when the page changes (adjusting state during render, not in an effect)
    const [shownFor, setShownFor] = useState(pathname)
    if (shownFor !== pathname) {
        setShownFor(pathname)
        setOpen(false)
    }

    useEffect(() => {
        if (!open) return
        const onDown = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
        document.addEventListener("mousedown", onDown)
        document.addEventListener("keydown", onKey)
        return () => {
            document.removeEventListener("mousedown", onDown)
            document.removeEventListener("keydown", onKey)
        }
    }, [open])

    return (
        <div ref={ref} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
            <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
                className={cn(
                    "flex items-center gap-1 rounded-md px-3 py-2 text-[15px] font-semibold transition-colors hover:text-s-ink",
                    active ? "text-s-orange-text" : "text-s-text"
                )}
            >
                {label}
                <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
            </button>
            {open && (
                <div className="absolute left-0 top-full z-50 pt-2">
                    <div className="w-[340px] rounded-2xl border border-s-border bg-s-card p-2 shadow-xl shadow-black/10">{children}</div>
                </div>
            )}
        </div>
    )
}

function MenuItem({ href, label, text, icon }: MenuLink & { icon?: React.ReactNode }) {
    return (
        <Link href={href} className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-s-band">
            {icon && <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-s-orange-tint text-s-orange-text">{icon}</span>}
            <span className="flex flex-col">
                <span className="font-semibold text-s-ink">{label}</span>
                {text && <span className="text-sm text-s-muted">{text}</span>}
            </span>
        </Link>
    )
}

export function PublicNavbar() {
    const pathname = usePathname() || "/"
    const [drawer, setDrawer] = useState(false)
    const [drawerFor, setDrawerFor] = useState(pathname)
    if (drawerFor !== pathname) {
        setDrawerFor(pathname)
        setDrawer(false)
    }
    useEffect(() => {
        if (!drawer) return
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false)
        document.addEventListener("keydown", onKey)
        document.body.style.overflow = "hidden"
        return () => {
            document.removeEventListener("keydown", onKey)
            document.body.style.overflow = ""
        }
    }, [drawer])

    return (
        <>
        <header className="sticky top-0 z-50 border-b border-s-border bg-s-bg/90 backdrop-blur supports-[backdrop-filter]:bg-s-bg/80">
            <div className={cn(SITE_CONTAINER, "flex h-16 items-center justify-between gap-4 md:h-20")}>
                <Link href="/" className="flex shrink-0 items-center" aria-label="Genesoft Infotech home">
                    <BrandLogo priority className="h-9 md:h-11 xl:h-12" />
                </Link>

                <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
                    <NavMenu label="Services" active={pathname.startsWith("/services")}>
                        {SERVICES.map((s) => (
                            <MenuItem key={s.slug} href={`/services/${s.slug}`} label={s.name} text={s.short.split(",")[0]} icon={<ServiceIcon name={s.icon} className="h-5 w-5" />} />
                        ))}
                        <Link href="/services" className="mt-1 block rounded-xl px-3 py-2.5 text-sm font-bold text-s-orange-text hover:bg-s-band">
                            All services →
                        </Link>
                    </NavMenu>
                    <NavMenu label="Genesoft ERP" active={pathname.startsWith("/erp")}>
                        {ERP_LINKS.map((l) => (
                            <MenuItem key={l.href} {...l} />
                        ))}
                    </NavMenu>
                    {LINKS.map((l) => (
                        <Link
                            key={l.href}
                            href={l.href}
                            className={cn(
                                "rounded-md px-3 py-2 text-[15px] font-semibold transition-colors hover:text-s-ink",
                                isActive(pathname, l.href) ? "text-s-orange-text" : "text-s-text"
                            )}
                        >
                            {l.label}
                        </Link>
                    ))}
                </nav>

                <div className="flex items-center gap-2">
                    <SiteThemeToggle className="hidden sm:inline-flex" />
                    <Link href="/login" className="hidden px-2.5 text-[15px] font-semibold text-s-ink hover:text-s-orange-text lg:inline">
                        Sign in
                    </Link>
                    <Link
                        href="/contact"
                        className="hidden h-11 items-center rounded-[10px] bg-s-orange px-[18px] text-[15px] font-bold text-s-on-orange transition hover:brightness-95 sm:flex"
                    >
                        Get a quote
                    </Link>
                    <button
                        type="button"
                        aria-label="Open menu"
                        aria-expanded={drawer}
                        onClick={() => setDrawer(true)}
                        className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-s-border bg-s-card text-s-ink lg:hidden"
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </header>

            {/* Outside the header: its backdrop blur would trap a fixed drawer inside it */}
            {drawer && (
                <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} aria-hidden="true" />
                    <div className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-s-bg">
                        <div className="flex h-16 items-center justify-between border-b border-s-border px-4">
                            <BrandLogo className="h-9" />
                            <button
                                type="button"
                                aria-label="Close menu"
                                onClick={() => setDrawer(false)}
                                className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-s-border bg-s-card text-s-ink"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <nav aria-label="Phone menu" className="flex-1 overflow-y-auto px-4 py-2 text-[17px] font-semibold">
                            <details className="group border-b border-s-border" open={pathname.startsWith("/services")}>
                                <summary className="flex h-14 cursor-pointer list-none items-center justify-between text-s-ink [&::-webkit-details-marker]:hidden">
                                    Services <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" aria-hidden="true" />
                                </summary>
                                <div className="flex flex-col pb-3 pl-3 text-base font-medium">
                                    {SERVICES.map((s) => (
                                        <Link key={s.slug} href={`/services/${s.slug}`} className="flex h-11 items-center text-s-text">
                                            {s.name}
                                        </Link>
                                    ))}
                                    <Link href="/services" className="flex h-11 items-center text-s-orange-text">All services</Link>
                                </div>
                            </details>
                            <details className="group border-b border-s-border" open={pathname.startsWith("/erp")}>
                                <summary className="flex h-14 cursor-pointer list-none items-center justify-between text-s-ink [&::-webkit-details-marker]:hidden">
                                    Genesoft ERP <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" aria-hidden="true" />
                                </summary>
                                <div className="flex flex-col pb-3 pl-3 text-base font-medium">
                                    {ERP_LINKS.slice(0, 3).map((l) => (
                                        <Link key={l.href} href={l.href} className="flex h-11 items-center text-s-text">
                                            {l.label}
                                        </Link>
                                    ))}
                                </div>
                            </details>
                            {LINKS.map((l) => (
                                <Link key={l.href} href={l.href} className="flex h-14 items-center border-b border-s-border text-s-ink">
                                    {l.label}
                                </Link>
                            ))}
                        </nav>
                        <div className="flex flex-col gap-2.5 border-t border-s-border p-4">
                            <div className="flex items-center justify-between text-[15px] text-s-text">
                                Theme <SiteThemePicker />
                            </div>
                            <Link href="/login" className="flex h-[50px] items-center justify-center rounded-[10px] border border-s-border-strong font-semibold text-s-ink">
                                Sign in to Genesoft ERP
                            </Link>
                            <Link href="/contact" className="flex h-[50px] items-center justify-center rounded-[10px] bg-s-orange font-bold text-s-on-orange">
                                Get a quote
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
