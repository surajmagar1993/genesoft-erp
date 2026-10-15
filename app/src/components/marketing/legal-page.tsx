import { SITE_CONTAINER } from "@/components/marketing/container"
import { Fragment, type ReactNode } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getLegalLinks, getLegalPage } from "@/lib/site-cms"
import { COOKIE_ITEMS, SUBPROCESSORS, legalDef } from "@/lib/legal-content"
import type { Block, Inline, LegalTable } from "@/lib/legal-markdown"

/** Inline pieces → React (never raw HTML). */
function InlineText({ v }: { v: Inline[] }) {
    return (
        <>
            {v.map((n, i) =>
                n.t === "text" ? (
                    <Fragment key={i}>{n.v}</Fragment>
                ) : n.t === "br" ? (
                    <br key={i} />
                ) : n.t === "bold" ? (
                    <strong key={i}>
                        <InlineText v={n.v} />
                    </strong>
                ) : n.href.startsWith("/") ? (
                    <Link key={i} href={n.href}>
                        <InlineText v={n.v} />
                    </Link>
                ) : (
                    <a key={i} href={n.href} {...(n.href.startsWith("https://") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                        <InlineText v={n.v} />
                    </a>
                ),
            )}
        </>
    )
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
    return (
        <div className="overflow-x-auto rounded-lg border border-s-border">
            <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="bg-s-band text-xs uppercase tracking-wide text-s-muted">
                    <tr>
                        {head.map((h) => (
                            <th key={h} className="px-3 py-2 font-semibold">{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-s-border">
                    {rows.map((r, i) => (
                        <tr key={i} className="align-top">
                            {r.map((c, j) => (
                                <td key={j} className="px-3 py-2.5">{c}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

/** Tables kept in code (they describe what the code does), placed with {cookieTable} / {subprocessorTable}. */
function CodeTable({ name }: { name: LegalTable }) {
    if (name === "cookieTable") {
        return (
            <Table
                head={["Name", "What it does", "How long", "Type"]}
                rows={COOKIE_ITEMS.map((c) => [
                    <>
                        <code className="text-[13px] text-s-ink">{c.name}</code>
                        <div className="text-xs text-s-muted">{c.kind}</div>
                    </>,
                    c.purpose,
                    c.lasts,
                    c.needed,
                ])}
            />
        )
    }
    return <Table head={["Provider", "What for", "Where"]} rows={SUBPROCESSORS.map((s) => [<span key="n" className="font-medium text-s-ink">{s.name}</span>, s.purpose, s.location])} />
}

function BlockView({ b }: { b: Block }) {
    if (b.t === "p")
        return (
            <p>
                <InlineText v={b.v} />
            </p>
        )
    if (b.t === "ul")
        return (
            <ul>
                {b.items.map((it, i) => (
                    <li key={i}>
                        <InlineText v={it} />
                    </li>
                ))}
            </ul>
        )
    return <CodeTable name={b.name} />
}

/** Page metadata for a legal page (key from src/lib/legal-content.ts). */
export function legalMetadata(key: string): Metadata {
    const def = legalDef(key)
    return def ? { title: `${def.title} | Genesoft Infotech`, description: def.metaDescription, alternates: { canonical: def.path } } : {}
}

/**
 * A legal page: title, last-updated date, the "in short" summary, a linked
 * table of contents and numbered sections. Text comes from Super Admin →
 * Website (published) over the built-in text in src/lib/legal-content.ts.
 */
export async function LegalPage({ pageKey }: { pageKey: string }) {
    const [page, links] = await Promise.all([getLegalPage(pageKey), getLegalLinks()])
    if (!page) notFound()
    const { def, summary, sections, updated } = page
    return (
        <div className={`${SITE_CONTAINER} py-14 md:py-20`}>
            <header className="max-w-4xl">
                <h1 className="text-balance text-4xl font-bold tracking-tight text-s-ink">{def.title}</h1>
                {updated && <p className="mt-2 text-sm text-s-muted">Last updated: {updated}</p>}
                <div className="mt-6 rounded-xl border border-s-border bg-s-orange-tint/60 p-5 text-sm leading-relaxed text-s-text [&_a]:text-s-orange-text [&_a]:underline [&_strong]:text-s-ink">
                    <InlineText v={summary} />
                </div>
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
                                {s.blocks.map((b, j) => (
                                    <BlockView key={j} b={b} />
                                ))}
                            </div>
                        </section>
                    ))}

                    <aside className="rounded-xl border border-s-border bg-s-band p-5">
                        <h2 className="text-sm font-semibold text-s-ink">Related policies</h2>
                        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                            {links
                                .filter((l) => l.href !== def.path)
                                .map((l) => (
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
