import Link from "next/link"
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react"
import { BrandLogo } from "@/components/brand-logo"
import { SITE_CONTAINER } from "@/components/marketing/container"
import { LEGAL_LINKS } from "@/components/marketing/legal-links"
import { PLATFORM, telHref, whatsappHref } from "@/lib/constants/platform"
import { SERVICES } from "@/lib/site-content"

const COLUMNS = [
    { title: "Services", links: SERVICES.map((s) => ({ href: `/services/${s.slug}`, label: s.name })) },
    {
        title: "Genesoft ERP",
        links: [
            { href: "/erp", label: "Overview" },
            { href: "/erp/pricing", label: "Pricing" },
            { href: "/register", label: "Start free trial" },
            { href: "/login", label: "Sign in" },
        ],
    },
    {
        title: "Company",
        links: [
            { href: "/about", label: "About" },
            { href: "/portfolio", label: "Portfolio" },
            { href: "/careers", label: "Careers" },
            { href: "/contact", label: "Contact" },
        ],
    },
    { title: "Legal", links: [...LEGAL_LINKS] },
]

/** Always dark (charcoal), so it uses the white-lettered logo in both themes. */
export function PublicFooter() {
    const year = new Date().getFullYear()

    return (
        <footer className="bg-s-footer text-[#D9D4CC]">
            <div className={`${SITE_CONTAINER} grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))] lg:py-[72px]`}>
                <div className="space-y-4 md:col-span-2 lg:col-span-1">
                    <Link href="/" className="inline-flex" aria-label="Genesoft Infotech home">
                        <BrandLogo on="dark" className="h-12" />
                    </Link>
                    <p className="max-w-sm leading-relaxed">Software, digital marketing, IT rentals and IT support for growing businesses.</p>
                    <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-[#A39E96]" aria-hidden="true" />
                            <a href={`mailto:${PLATFORM.email}`} className="hover:text-white">{PLATFORM.email}</a>
                        </li>
                        <li className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-[#A39E96]" aria-hidden="true" />
                            <a href={telHref(PLATFORM.phone)} className="hover:text-white">{PLATFORM.phone}</a>
                            <span className="text-[#A39E96]">·</span>
                            <a href={whatsappHref(PLATFORM.whatsapp)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-white">
                                <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp
                            </a>
                        </li>
                        <li className="flex items-start gap-2">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#A39E96]" aria-hidden="true" />
                            <span>{PLATFORM.address.line1}, {PLATFORM.address.line2}</span>
                        </li>
                    </ul>
                </div>

                {COLUMNS.map((col) => (
                    <div key={col.title}>
                        <h3 className="text-sm font-bold text-[#F6F3EE]">{col.title}</h3>
                        <ul className="mt-3 space-y-2.5">
                            {col.links.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} className="text-sm hover:text-white">{link.label}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
            <div className="border-t border-[#3A3733]">
                <div className={`${SITE_CONTAINER} flex flex-col gap-2 py-5 text-xs text-[#A39E96] md:flex-row md:items-center md:justify-between`}>
                    <p>© {year} {PLATFORM.brandName}. All rights reserved.</p>
                    <Link href="/sitemap" className="hover:text-white">Sitemap</Link>
                </div>
            </div>
        </footer>
    )
}
