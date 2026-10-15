import Link from "next/link"
import { notFound } from "next/navigation"
import { SITE_CONTAINER } from "@/components/marketing/container"
import { H1 } from "@/components/marketing/ui"
import { getPublishedItem, list, text } from "@/lib/site-cms"
import { ApplyForm } from "./apply-form"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    const job = await getPublishedItem("job", (await params).slug)
    return job ? { title: `${text(job.data.title)} | Careers at Genesoft Infotech`, description: text(job.data.about).slice(0, 160) } : {}
}

export default async function JobPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const job = await getPublishedItem("job", slug)
    if (!job) notFound()
    const d = job.data
    const tags = [text(d.type), text(d.location), text(d.experience), text(d.department)].filter(Boolean)

    return (
        <section className={`${SITE_CONTAINER} grid items-start gap-12 py-14 md:py-20 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]`}>
            <article className="flex flex-col gap-5">
                <nav aria-label="Breadcrumb" className="text-sm text-s-muted">
                    <Link href="/careers" className="hover:text-s-ink">Careers</Link> / <span className="font-semibold text-s-ink">{text(d.title)}</span>
                </nav>
                <H1 className="md:text-5xl xl:text-5xl">{text(d.title)}</H1>
                <div className="flex flex-wrap gap-2">
                    {tags.map((t) => (
                        <span key={t} className="rounded-full bg-s-band px-3 py-1.5 text-sm font-semibold text-s-ink">{t}</span>
                    ))}
                </div>
                <h2 className="pt-2 font-display text-xl font-bold text-s-ink">About the role</h2>
                <p className="whitespace-pre-line text-lg leading-relaxed">{text(d.about)}</p>
                {list(d.responsibilities).length > 0 && (
                    <>
                        <h2 className="pt-2 font-display text-xl font-bold text-s-ink">You&apos;ll work on</h2>
                        <ul className="flex list-disc flex-col gap-1.5 pl-5 leading-relaxed">{list(d.responsibilities).map((r) => <li key={r}>{r}</li>)}</ul>
                    </>
                )}
                {list(d.requirements).length > 0 && (
                    <>
                        <h2 className="pt-2 font-display text-xl font-bold text-s-ink">You&apos;ll bring</h2>
                        <ul className="flex list-disc flex-col gap-1.5 pl-5 leading-relaxed">{list(d.requirements).map((r) => <li key={r}>{r}</li>)}</ul>
                    </>
                )}
            </article>
            <ApplyForm job={slug} title={text(d.title)} />
        </section>
    )
}
