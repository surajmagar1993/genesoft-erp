"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const LINKS = [
    { href: "/#features", label: "Features" },
    { href: "/#countries", label: "Countries" },
    { href: "/pricing", label: "Pricing" },
    { href: "/contact", label: "Contact" },
]

export function PublicNavbar() {
    const pathname = usePathname()

    return (
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
                <Link href="/" className="flex items-center gap-2.5" aria-label="Genesoft ERP home">
                    <Image src="/logo.png" alt="" width={32} height={32} className="h-8 w-8 rounded-md object-contain" priority />
                    <span className="text-[15px] font-semibold tracking-tight text-slate-900">Genesoft ERP</span>
                </Link>

                <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
                    {LINKS.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900",
                                pathname === link.href && "text-slate-900"
                            )}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                <div className="hidden items-center gap-2 md:flex">
                    <Button asChild variant="ghost" className="text-slate-700 hover:bg-slate-100 hover:text-slate-900">
                        <Link href="/login">Sign in</Link>
                    </Button>
                    <Button asChild className="bg-blue-600 text-white hover:bg-blue-700">
                        <Link href="/register">Start free trial</Link>
                    </Button>
                </div>

                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-slate-700 md:hidden" aria-label="Open menu">
                            <Menu className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="light w-72 bg-white text-slate-900">
                        <SheetHeader>
                            <SheetTitle className="text-left text-slate-900">Genesoft ERP</SheetTitle>
                        </SheetHeader>
                        <nav className="mt-2 flex flex-col gap-1 px-4" aria-label="Mobile">
                            {LINKS.map((link) => (
                                <Link key={link.href} href={link.href} className="rounded-md px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
                                    {link.label}
                                </Link>
                            ))}
                            <div className="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-4">
                                <Button asChild variant="outline" className="border-slate-300 bg-white text-slate-800">
                                    <Link href="/login">Sign in</Link>
                                </Button>
                                <Button asChild className="bg-blue-600 text-white hover:bg-blue-700">
                                    <Link href="/register">Start free trial</Link>
                                </Button>
                            </div>
                        </nav>
                    </SheetContent>
                </Sheet>
            </div>
        </header>
    )
}
