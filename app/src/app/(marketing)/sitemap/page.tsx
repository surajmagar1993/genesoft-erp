import { SITE_CONTAINER } from "@/components/marketing/container"
import Link from "next/link"
import { getLegalLinks } from "@/lib/site-cms"
import { SERVICES } from "@/lib/site-content"
import { pageMeta } from "@/lib/seo"

export const metadata = pageMeta({
    title: "Sitemap | Genesoft Infotech",
    description: "All public pages on the Genesoft Infotech website.",
    path: "/sitemap",
})

const GROUPS: { title: string; links: string[][] }[] = [
    { title: "Company", links: [["/", "Home"], ["/about", "About us"], ["/portfolio", "Portfolio"], ["/careers", "Careers"], ["/contact", "Contact us"]] },
    { title: "Services", links: [["/services", "All services"], ...SERVICES.map((s) => [`/services/${s.slug}`, s.name])] },
    { title: "Genesoft ERP", links: [["/erp", "Overview"], ["/erp#features", "Features"], ["/erp#countries", "Countries & tax"], ["/erp/pricing", "Pricing"], ["/register", "Start free trial"], ["/login", "Sign in"], ["/forgot-password", "Reset password"]] },
]

export default async function SitemapPage() {
    const groups = [...GROUPS, { title: "Legal", links: (await getLegalLinks()).map((l) => [l.href, l.label]) }]
    return (
        <div className={`${SITE_CONTAINER} py-16`}>
            <h1 className="text-4xl font-bold tracking-tight text-s-ink">Sitemap</h1>
            <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
                {groups.map((g) => (
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
