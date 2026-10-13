import Link from "next/link"
import Image from "next/image"
import { Mail, Phone, MapPin } from "lucide-react"
import { PLATFORM, telHref } from "@/lib/constants/platform"

const COLUMNS = [
    {
        title: "Product",
        links: [
            { href: "/#features", label: "Features" },
            { href: "/#countries", label: "Countries & tax" },
            { href: "/pricing", label: "Pricing" },
            { href: "/register", label: "Start free trial" },
        ],
    },
    {
        title: "Company",
        links: [
            { href: "/contact", label: "Contact us" },
            { href: "/login", label: "Sign in" },
            { href: "/sitemap", label: "Sitemap" },
        ],
    },
    {
        title: "Legal",
        links: [
            { href: "/privacy", label: "Privacy Policy" },
            { href: "/terms", label: "Terms of Service" },
            { href: "/refund-policy", label: "Refund & Cancellation" },
        ],
    },
]

export function PublicFooter() {
    const year = new Date().getFullYear()

    return (
        <footer className="border-t border-slate-200 bg-slate-50">
            <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-5 md:px-6">
                <div className="md:col-span-2 space-y-4">
                    <Link href="/" className="flex items-center gap-2.5">
                        <Image src="/logo.png" alt="" width={28} height={28} className="h-7 w-7 rounded-md object-contain" />
                        <span className="font-semibold text-slate-900">Genesoft ERP</span>
                    </Link>
                    <p className="max-w-xs text-sm leading-relaxed text-slate-600">
                        CRM, invoicing, inventory, accounting and HR for growing businesses, with GST or VAT handled for your country.
                    </p>
                    <ul className="space-y-2 text-sm text-slate-600">
                        <li className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-slate-400" />
                            <a href={`mailto:${PLATFORM.email}`} className="hover:text-slate-900">{PLATFORM.email}</a>
                        </li>
                        <li className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-slate-400" />
                            <a href={telHref(PLATFORM.phone)} className="hover:text-slate-900">{PLATFORM.phone}</a>
                        </li>
                        <li className="flex items-start gap-2">
                            <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
                            <span>{PLATFORM.address.line1}, {PLATFORM.address.line2}</span>
                        </li>
                    </ul>
                </div>

                {COLUMNS.map((col) => (
                    <div key={col.title}>
                        <h3 className="text-sm font-semibold text-slate-900">{col.title}</h3>
                        <ul className="mt-3 space-y-2">
                            {col.links.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} className="text-sm text-slate-600 hover:text-slate-900">{link.label}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
            <div className="border-t border-slate-200">
                <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-slate-500 md:flex-row md:items-center md:justify-between md:px-6">
                    <p>© {year} {PLATFORM.legalName}. All rights reserved.</p>
                    <p>
                        <a href={PLATFORM.website} className="hover:text-slate-900">genesoftinfotech.com</a>
                    </p>
                </div>
            </div>
        </footer>
    )
}
