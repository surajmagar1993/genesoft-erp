import { SITE_CONTAINER } from "@/components/marketing/container"
import type { ReactNode } from "react"
import Link from "next/link"
import { LEGAL_LINKS } from "@/components/marketing/legal-links"

export interface LegalSection {
    id: string
    title: string
    body: ReactNode
}

/**
 * Shared layout for the legal pages: title, last-updated date, a short
 * plain-language summary, a linked table of contents and numbered sections.
 */
export function LegalPage({
    title,
    updated,
    summary,
    sections,
}: {
    title: string
    updated: string
    summary: ReactNode
    sections: LegalSection[]
}) {
    return (
        <div className={`${SITE_CONTAINER} py-14 md:py-20`}>
            <header className="max-w-4xl">
                <h1 className="text-balance text-4xl font-bold tracking-tight text-s-ink">{title}</h1>
                <p className="mt-2 text-sm text-s-muted">Last updated: {updated}</p>
                <div className="mt-6 rounded-xl border border-s-border bg-s-orange-tint/60 p-5 text-sm leading-relaxed text-s-text">{summary}</div>
            </header>

            <div className="mt-12 grid gap-12 lg:grid-cols-[240px_1fr] xl:gap-20">
                <nav aria-label="On this page" className="hidden lg:block">
                    <div className="sticky top-24">
                        <p className="text-xs font-semibold uppercase tracking-wide text-s-muted">On this page</p>
                        <ol className="mt-3 space-y-2 text-sm">
                            {sections.map((s, i) => (
                                <li key={s.id}>
                                    <a href={`#${s.id}`} className="text-s-text hover:text-s-ink">{i + 1}. {s.title}</a>
                                </li>
                            ))}
                        </ol>
                    </div>
                </nav>

                <article className="max-w-4xl space-y-10">
                    {sections.map((s, i) => (
                        <section key={s.id} id={s.id} className="scroll-mt-24">
                            <h2 className="text-xl font-semibold text-s-ink">{i + 1}. {s.title}</h2>
                            <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-s-text [&_a]:text-s-orange-text [&_a]:underline-offset-2 hover:[&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-s-ink [&_ul]:space-y-1.5">
                                {s.body}
                            </div>
                        </section>
                    ))}

                    <aside className="rounded-xl border border-s-border bg-s-band p-5">
                        <h2 className="text-sm font-semibold text-s-ink">Related policies</h2>
                        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                            {LEGAL_LINKS.filter((l) => !title.startsWith(l.label)).map((l) => (
                                <li key={l.href}>
                                    <Link href={l.href} className="text-s-orange-text hover:underline">{l.label}</Link>
                                </li>
                            ))}
                        </ul>
                    </aside>
                </article>
            </div>
        </div>
    )
}
