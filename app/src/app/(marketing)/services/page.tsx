import Link from "next/link"
import { Check } from "lucide-react"
import { SITE_CONTAINER } from "@/components/marketing/container"
import { ServiceIcon } from "@/components/marketing/service-icon"
import { Eyebrow, H1, H2, Lead, SiteButton } from "@/components/marketing/ui"
import { PROCESS, SERVICES } from "@/lib/site-content"
import { getServiceShorts } from "@/lib/site-cms"
import { pageMeta } from "@/lib/seo"

export const metadata = pageMeta({
    title: "Services | Genesoft Infotech",
    description: "Software development, digital marketing, IT rentals and IT support from one team in Pune.",
    path: "/services",
})

export default async function ServicesPage() {
    const shorts = await getServiceShorts(SERVICES.map((s) => s.slug))
    return (
        <>
            <section className={`${SITE_CONTAINER} flex flex-col gap-5 py-16 md:py-20`}>
                <Eyebrow>Services</Eyebrow>
                <H1 className="max-w-4xl">Everything your business needs from technology, under one roof</H1>
                <Lead className="max-w-3xl">Pick one service or combine them: the same team plans, builds, markets and supports, so nothing gets lost between suppliers.</Lead>
            </section>

            <section className={`${SITE_CONTAINER} grid gap-6 pb-20 md:grid-cols-2`}>
                {SERVICES.map((s) => (
                    <article key={s.slug} className="flex flex-col gap-4 rounded-[20px] border border-s-border bg-s-card p-7 md:p-8">
                        <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-s-orange-tint text-s-orange-text">
                            <ServiceIcon name={s.icon} className="h-7 w-7" />
                        </span>
                        <h2 className="font-display text-2xl font-bold text-s-ink">{s.name}</h2>
                        <p className="text-lg leading-relaxed">{shorts[s.slug] || s.short}</p>
                        {s.includes.length > 0 && (
                            <ul className="grid gap-2 sm:grid-cols-2">
                                {s.includes.slice(0, 4).map((i) => (
                                    <li key={i.title} className="flex items-center gap-2 text-sm">
                                        <Check className="h-4 w-4 shrink-0 text-s-orange-text" aria-hidden="true" /> {i.title}
                                    </li>
                                ))}
                            </ul>
                        )}
                        <Link href={`/services/${s.slug}`} className="mt-auto font-bold text-s-orange-text hover:underline">
                            {s.slug === "it-rentals" ? "See equipment and get a quote" : `More about ${s.name}`} →
                        </Link>
                    </article>
                ))}
            </section>

            <section className="bg-s-band py-20">
                <div className={`${SITE_CONTAINER} flex flex-col gap-9`}>
                    <H2 className="text-center">How we work</H2>
                    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                        {PROCESS.map((p, i) => (
                            <li key={p.title} className="flex flex-col gap-2.5 rounded-2xl border border-s-border bg-s-card p-5">
                                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-s-orange font-bold text-s-on-orange">{i + 1}</span>
                                <span className="font-display font-semibold text-s-ink">{p.title}</span>
                                <span className="text-sm leading-relaxed">{p.text}</span>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            <section className={`${SITE_CONTAINER} flex flex-col items-center gap-5 py-20 text-center`}>
                <H2>Not sure which service you need?</H2>
                <Lead className="max-w-2xl">Tell us what you&apos;re trying to do. We&apos;ll suggest the simplest way to get there.</Lead>
                <SiteButton href="/contact">Talk to us</SiteButton>
            </section>
        </>
    )
}
