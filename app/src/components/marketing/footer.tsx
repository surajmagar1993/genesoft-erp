import Link from "next/link"
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react"
import { BrandLogo } from "@/components/brand-logo"
import { SITE_CONTAINER } from "@/components/marketing/container"
import { PLATFORM, telHref, whatsappHref } from "@/lib/constants/platform"
import { getLegalLinks, getSiteSettings } from "@/lib/site-cms"
import { SocialIcon } from "@/components/marketing/social-icon"
import { SERVICES } from "@/lib/site-content"

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
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
]

/** Always dark (charcoal), so it uses the white-lettered logo in both themes. */
export async function PublicFooter() {
    const year = new Date().getFullYear()
    const [site, legalLinks] = await Promise.all([getSiteSettings(), getLegalLinks()])
    const columns = [...COLUMNS, { title: "Legal", links: legalLinks }]

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
                            <a href={`mailto:${site.email}`} className="hover:text-white">{site.email}</a>
                        </li>
                        <li className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-[#A39E96]" aria-hidden="true" />
                            <a href={telHref(site.phone)} className="hover:text-white">{site.phone}</a>
                            <span className="text-[#A39E96]">·</span>
                            <a href={whatsappHref(site.whatsapp)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-white">
                                <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp
                            </a>
                        </li>
                        <li className="flex items-start gap-2">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#A39E96]" aria-hidden="true" />
                            <span>{site.addressLine1}, {site.addressLine2}</span>
                        </li>
                    </ul>
                    {site.socials.length > 0 && (
                        <div className="flex gap-2.5 pt-1">
                            {site.socials.map((so) => (
                                <a
                                    key={so.network}
                                    href={so.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={so.network}
                                    className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#3A3733] hover:border-[#F6A55C] hover:text-white"
                                >
                                    <SocialIcon network={so.network} />
                                </a>
                            ))}
                        </div>
                    )}
                </div>

                {columns.map((col) => (
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
