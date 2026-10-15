import { SITE_CONTAINER } from "@/components/marketing/container"
import Link from "next/link"
import { LEGAL_LINKS } from "@/components/marketing/legal-links"
import { SERVICES } from "@/lib/site-content"

export const metadata = {
    title: "Sitemap | Genesoft Infotech",
    description: "All public pages on the Genesoft Infotech website.",
}

const GROUPS: { title: string; links: string[][] }[] = [
    { title: "Company", links: [["/", "Home"], ["/about", "About us"], ["/portfolio", "Portfolio"], ["/careers", "Careers"], ["/contact", "Contact us"]] },
    { title: "Services", links: [["/services", "All services"], ...SERVICES.map((s) => [`/services/${s.slug}`, s.name])] },
    { title: "Genesoft ERP", links: [["/erp", "Overview"], ["/erp#features", "Features"], ["/erp#countries", "Countries & tax"], ["/erp/pricing", "Pricing"], ["/register", "Start free trial"], ["/login", "Sign in"], ["/forgot-password", "Reset password"]] },
    { title: "Legal", links: LEGAL_LINKS.map((l) => [l.href, l.label]) },
]

export default function SitemapPage() {
    return (
        <div className={`${SITE_CONTAINER} py-16`}>
            <h1 className="text-4xl font-bold tracking-tight text-s-ink">Sitemap</h1>
            <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
                {GROUPS.map((g) => (
                    <section key={g.title}>
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-s-muted">{g.title}</h2>
                        <ul className="mt-3 space-y-2">
                            {g.links.map(([href, label]) => (
                                <li key={href}><Link href={href} className="text-s-orange-text hover:underline">{label}</Link></li>
                            ))}
                        </ul>
                    </section>
                ))}
            </div>
        </div>
    )
}
