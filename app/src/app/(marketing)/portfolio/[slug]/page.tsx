import Link from "next/link"
import { notFound } from "next/navigation"
import { SITE_CONTAINER } from "@/components/marketing/container"
import { H1, SiteButton } from "@/components/marketing/ui"
import { getPublishedItem, getPublishedItems, text } from "@/lib/site-cms"
import { SERVICES } from "@/lib/site-content"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    const item = await getPublishedItem("portfolio", (await params).slug)
    return item ? { title: `${text(item.data.title)} | Genesoft Infotech`, description: text(item.data.summary) } : {}
}

export default async function CaseStudyPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const all = await getPublishedItems("portfolio")
    const i = all.findIndex((x) => x.slug === slug)
    if (i < 0) notFound()
    const d = all[i].data
    const prev = all[i - 1], next = all[i + 1]
    const service = SERVICES.find((s) => s.name === text(d.service))
    const facts = [
        ["Client", text(d.client)],
        ["Service", text(d.service)],
        ["Technologies", text(d.technologies)],
        ["Year", text(d.year)],
    ].filter(([, v]) => v)
    const story = [
        ["The challenge", text(d.challenge)],
        ["What we did", text(d.solution)],
        ["The result", text(d.result)],
    ].filter(([, v]) => v)

    return (
        <article className={`${SITE_CONTAINER} flex flex-col gap-10 py-14 md:py-20`}>
            <div className="flex max-w-4xl flex-col gap-4">
                <nav aria-label="Breadcrumb" className="text-sm text-s-muted">
                    <Link href="/portfolio" className="hover:text-s-ink">Portfolio</Link> / <span className="font-semibold text-s-ink">{text(d.title)}</span>
                </nav>
                <H1>{text(d.title)}</H1>
                <p className="text-xl leading-relaxed">{text(d.summary)}</p>
            </div>
            {facts.length > 0 && (
                <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {facts.map(([k, v]) => (
                        <div key={k} className="rounded-[14px] border border-s-border bg-s-card p-5">
                            <dt className="text-sm text-s-muted">{k}</dt>
                            <dd className="font-semibold text-s-ink">{v}</dd>
                        </div>
                    ))}
                </dl>
            )}
            {text(d.image) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={text(d.image)} alt="" className="max-h-[560px] w-full rounded-[24px] border border-s-border object-cover" />
            )}
            {story.length > 0 && (
                <div className="grid gap-8 lg:grid-cols-3">
                    {story.map(([k, v]) => (
                        <section key={k} className="flex flex-col gap-2.5">
                            <h2 className="font-display text-2xl font-bold text-s-ink">{k}</h2>
                            <p className="whitespace-pre-line text-lg leading-relaxed">{v}</p>
                        </section>
                    ))}
                </div>
            )}
            {text(d.link) && (
                <a href={text(d.link)} target="_blank" rel="noopener noreferrer" className="self-start font-bold text-s-orange-text hover:underline">Visit the project →</a>
            )}
            <div className="flex flex-col items-center justify-between gap-4 border-t border-s-border pt-8 sm:flex-row">
                {prev ? <Link href={`/portfolio/${prev.slug}`} className="font-bold text-s-orange-text hover:underline">← {text(prev.data.title)}</Link> : <span />}
                <SiteButton href={`/contact?topic=${encodeURIComponent(service?.topic || "General")}`}>Start a similar project</SiteButton>
                {next ? <Link href={`/portfolio/${next.slug}`} className="font-bold text-s-orange-text hover:underline">{text(next.data.title)} →</Link> : <span />}
            </div>
        </article>
    )
}
