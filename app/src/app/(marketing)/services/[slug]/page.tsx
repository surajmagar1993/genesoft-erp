import Link from "next/link"
import { notFound } from "next/navigation"
import { Check } from "lucide-react"
import { SITE_CONTAINER } from "@/components/marketing/container"
import { EnquiryForm } from "@/components/marketing/enquiry-form"
import { H1, H2, Lead, SiteButton } from "@/components/marketing/ui"
import { whatsappHref } from "@/lib/constants/platform"
import { PROCESS, SERVICES, serviceBySlug } from "@/lib/site-content"
import { getPageContent, getPublishedItems, getSiteSettings, list, text, type Faq, type Pair } from "@/lib/site-cms"
import { PortfolioCard } from "@/components/marketing/portfolio-card"

/** Service page template: Software Development, Digital Marketing, IT Support (IT Rentals has its own page). */
export function generateStaticParams() {
    return SERVICES.filter((s) => s.slug !== "it-rentals").map((s) => ({ slug: s.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    const s = serviceBySlug((await params).slug)
    if (!s) return {}
    const c = await getPageContent(`service:${s.slug}`)
    return { title: `${s.name} | Genesoft Infotech`, description: text(c.intro) }
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
    const base = serviceBySlug((await params).slug)
    if (!base || base.slug === "it-rentals") notFound()
    const [c, work, site] = await Promise.all([getPageContent(`service:${base.slug}`), getPublishedItems("portfolio"), getSiteSettings()])
    // Published text from Super Admin → Website → Pages, over the built-in defaults
    const s = {
        ...base,
        heading: text(c.heading),
        intro: text(c.intro),
        includes: list<Pair>(c.includes),
        getList: list(c.getList),
        faqs: list<Faq>(c.faqs).map((f) => ({ q: f.q, a: f.a })),
        tech: base.tech ? list(c.tech) : undefined,
    }
    const related = work.filter((w) => text(w.data.service) === base.name).slice(0, 3)

    return (
        <>
            <section className={`${SITE_CONTAINER} grid items-start gap-12 py-14 md:py-20 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] xl:gap-16`}>
                <div className="flex flex-col gap-5">
                    <nav aria-label="Breadcrumb" className="text-sm text-s-muted">
                        <Link href="/" className="hover:text-s-ink">Home</Link> / <Link href="/services" className="hover:text-s-ink">Services</Link> / <span className="font-semibold text-s-ink">{s.name}</span>
                    </nav>
                    <H1>{s.heading}</H1>
                    <Lead className="max-w-[680px]">{s.intro}</Lead>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <SiteButton href="#enquiry">Discuss your project</SiteButton>
                        <SiteButton href={whatsappHref(site.whatsapp, `Hello, I'd like to talk about ${s.name}.`)} external variant="secondary">WhatsApp us</SiteButton>
                    </div>
                </div>
                <aside className="flex flex-col gap-3.5 rounded-[20px] border border-s-border bg-s-card p-7">
                    <h2 className="font-display text-xl font-bold text-s-ink">What you get</h2>
                    <ul className="flex flex-col gap-2.5">
                        {s.getList.map((g) => (
                            <li key={g} className="flex items-start gap-2.5">
                                <Check className="mt-0.5 h-5 w-5 shrink-0 text-s-orange-text" aria-hidden="true" /> {g}
                            </li>
                        ))}
                    </ul>
                </aside>
            </section>

            <section className="bg-s-band py-20">
                <div className={`${SITE_CONTAINER} flex flex-col gap-8`}>
                    <H2>What we {s.slug === "digital-marketing" ? "do" : s.slug === "it-support" ? "look after" : "build"}</H2>
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {s.includes.map((i) => (
                            <div key={i.title} className="flex flex-col gap-2.5 rounded-2xl border border-s-border bg-s-card p-6">
                                <h3 className="font-display text-lg font-semibold text-s-ink">{i.title}</h3>
                                <p className="leading-relaxed">{i.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {s.tech && s.tech.length > 0 && (
                <section className={`${SITE_CONTAINER} flex flex-col gap-5 py-20`}>
                    <H2>Technologies</H2>
                    <p className="max-w-2xl text-lg">We pick the stack that suits your project and your team.</p>
                    <div className="flex flex-wrap gap-2.5">
                        {s.tech.map((t) => (
                            <span key={t} className="rounded-full border border-s-border bg-s-card px-4 py-2 text-sm font-semibold text-s-ink">{t}</span>
                        ))}
                    </div>
                </section>
            )}

            <section className={s.tech ? "bg-s-band py-20" : "py-20"}>
                <div className={`${SITE_CONTAINER} flex flex-col gap-8`}>
                    <H2>How we work</H2>
                    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                        {PROCESS.map((p, i) => (
                            <li key={p.title} className="flex flex-col gap-2 rounded-2xl border border-s-border bg-s-card p-5">
                                <span className="text-sm font-bold text-s-orange-text">Step {i + 1}</span>
                                <span className="font-display font-semibold text-s-ink">{p.title}</span>
                                <span className="text-sm leading-relaxed">{p.text}</span>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {related.length > 0 && (
                <section className={`${SITE_CONTAINER} flex flex-col gap-8 py-20`}>
                    <H2>Related work</H2>
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {related.map((w) => (
                            <PortfolioCard key={w.id} item={w} />
                        ))}
                    </div>
                </section>
            )}

            {s.faqs.length > 0 && (
                <section className={`${SITE_CONTAINER} grid gap-10 py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]`}>
                    <H2>Questions</H2>
                    <div className="flex flex-col gap-3">
                        {s.faqs.map((f) => (
                            <details key={f.q} className="group rounded-[14px] border border-s-border bg-s-card px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-s-ink">
                                    {f.q}
                                    <span className="text-xl leading-none text-s-muted transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                                </summary>
                                <p className="mt-2.5 leading-relaxed">{f.a}</p>
                            </details>
                        ))}
                    </div>
                </section>
            )}

            <section id="enquiry" className="scroll-mt-24 bg-s-band py-20">
                <div className={`${SITE_CONTAINER} grid items-start gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]`}>
                    <div className="flex flex-col gap-4">
                        <H2 className="leading-tight">Tell us about your project</H2>
                        <p className="text-lg leading-relaxed">
                            We reply from <strong className="text-s-ink">{site.email}</strong> within one working day. Prefer to talk? Call or WhatsApp {site.phone}.
                        </p>
                    </div>
                    <EnquiryForm topic={s.topic} title="Your project" showTopics={false} whatsapp={site.whatsapp} />
                </div>
            </section>
        </>
    )
}
