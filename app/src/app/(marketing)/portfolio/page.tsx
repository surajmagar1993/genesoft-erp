import Link from "next/link"
import { FolderOpen } from "lucide-react"
import { SITE_CONTAINER } from "@/components/marketing/container"
import { H1, Lead, SiteButton } from "@/components/marketing/ui"
import { SERVICES } from "@/lib/site-content"

export const metadata = {
    title: "Our work | Genesoft Infotech",
    description: "Projects Genesoft Infotech has delivered: software, marketing, IT rentals and IT support.",
}

/**
 * Case studies come from Super Admin → Website → Portfolio (planned). Until
 * one is published the page says so, rather than showing made-up projects.
 */
export default function PortfolioPage() {
    return (
        <>
            <section className={`${SITE_CONTAINER} flex flex-col gap-5 py-16 md:py-20`}>
                <H1>Our work</H1>
                <Lead className="max-w-3xl">Projects we&apos;ve delivered for real clients. Each case study shows the problem, what we built and what changed.</Lead>
            </section>
            <section className={`${SITE_CONTAINER} pb-20`}>
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
                    <p className="mt-4 text-sm text-s-muted">
                        Interested in a specific service?{" "}
                        {SERVICES.map((s, i) => (
                            <span key={s.slug}>
                                <Link href={`/services/${s.slug}`} className="font-semibold text-s-orange-text hover:underline">{s.name}</Link>
                                {i < SERVICES.length - 1 ? " · " : ""}
                            </span>
                        ))}
                    </p>
                </div>
            </section>
        </>
    )
}
