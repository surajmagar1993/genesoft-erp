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
                <h1 className="text-balance text-4xl font-bold tracking-tight text-slate-900">{title}</h1>
                <p className="mt-2 text-sm text-slate-500">Last updated: {updated}</p>
                <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/60 p-5 text-sm leading-relaxed text-slate-700">{summary}</div>
            </header>

            <div className="mt-12 grid gap-12 lg:grid-cols-[240px_1fr] xl:gap-20">
                <nav aria-label="On this page" className="hidden lg:block">
                    <div className="sticky top-24">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">On this page</p>
                        <ol className="mt-3 space-y-2 text-sm">
                            {sections.map((s, i) => (
                                <li key={s.id}>
                                    <a href={`#${s.id}`} className="text-slate-600 hover:text-slate-900">{i + 1}. {s.title}</a>
                                </li>
                            ))}
                        </ol>
                    </div>
                </nav>

                <article className="max-w-4xl space-y-10">
                    {sections.map((s, i) => (
                        <section key={s.id} id={s.id} className="scroll-mt-24">
                            <h2 className="text-xl font-semibold text-slate-900">{i + 1}. {s.title}</h2>
                            <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-700 [&_a]:text-blue-700 [&_a]:underline-offset-2 hover:[&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-slate-900 [&_ul]:space-y-1.5">
                                {s.body}
                            </div>
                        </section>
                    ))}

                    <aside className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                        <h2 className="text-sm font-semibold text-slate-900">Related policies</h2>
                        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                            {LEGAL_LINKS.filter((l) => !title.startsWith(l.label)).map((l) => (
                                <li key={l.href}>
                                    <Link href={l.href} className="text-blue-700 hover:underline">{l.label}</Link>
                                </li>
                            ))}
                        </ul>
                    </aside>
                </article>
            </div>
        </div>
    )
}
