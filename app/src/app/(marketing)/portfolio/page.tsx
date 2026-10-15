import Link from "next/link"
import { FolderOpen } from "lucide-react"
import { SITE_CONTAINER } from "@/components/marketing/container"
import { PortfolioCard } from "@/components/marketing/portfolio-card"
import { H1, Lead, SiteButton } from "@/components/marketing/ui"
import { getPublishedItems, text } from "@/lib/site-cms"
import { SERVICES } from "@/lib/site-content"
import { cn } from "@/lib/utils"
import { pageMeta } from "@/lib/seo"

export const metadata = pageMeta({
    title: "Our work | Genesoft Infotech",
    description: "Projects Genesoft Infotech has delivered: software, marketing, IT rentals and IT support.",
    path: "/portfolio",
})

/** Case studies from Super Admin → Website → Portfolio (published and client-approved only). */
export default async function PortfolioPage({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
    const { service } = await searchParams
    const all = await getPublishedItems("portfolio")
    const items = service ? all.filter((i) => text(i.data.service) === service) : all
    const used = SERVICES.filter((s) => all.some((i) => text(i.data.service) === s.name))

    return (
        <>
            <section className={`${SITE_CONTAINER} flex flex-col gap-5 py-16 md:py-20`}>
                <H1>Our work</H1>
                <Lead className="max-w-3xl">Projects we&apos;ve delivered for real clients. Each case study shows the problem, what we built and what changed.</Lead>
                {used.length > 1 && (
                    <nav aria-label="Filter by service" className="flex flex-wrap gap-2.5 pt-2">
                        {[{ name: "All", href: "/portfolio", active: !service }, ...used.map((s) => ({ name: s.name, href: `/portfolio?service=${encodeURIComponent(s.name)}`, active: service === s.name }))].map((f) => (
                            <Link
                                key={f.name}
                                href={f.href}
                                aria-current={f.active ? "page" : undefined}
                                className={cn("rounded-full px-4 py-2 text-sm font-semibold", f.active ? "bg-s-charcoal text-white" : "border border-s-border-strong text-s-ink hover:bg-s-band")}
                            >
                                {f.name}
                            </Link>
                        ))}
                    </nav>
                )}
            </section>
            <section className={`${SITE_CONTAINER} pb-20`}>
                {items.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {items.map((i) => (
                            <PortfolioCard key={i.id} item={i} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4 rounded-[24px] border border-dashed border-s-border-strong bg-s-card px-6 py-16 text-center">
                        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-s-orange-tint text-s-orange-text">
                            <FolderOpen className="h-7 w-7" aria-hidden="true" />
                        </span>
                        <h2 className="font-display text-2xl font-bold text-s-ink">Case studies are on their way</h2>
                        <p className="max-w-xl text-lg">We&apos;re writing up recent projects with our clients&apos; permission. Want to hear about work similar to yours? Ask us.</p>
                        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                            <SiteButton href="/contact">Ask about our work</SiteButton>
                            <SiteButton href="/services" variant="secondary">See our services</SiteButton>
                        </div>
                    </div>
                )}
            </section>
        </>
    )
}
