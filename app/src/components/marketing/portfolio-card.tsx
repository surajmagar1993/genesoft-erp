import Link from "next/link"
import { FolderOpen } from "lucide-react"
import type { PublicItem } from "@/lib/site-cms"

const t = (v: unknown) => (typeof v === "string" ? v : "")

/** A published case study as a card (Home, Portfolio, service pages). */
export function PortfolioCard({ item }: { item: PublicItem }) {
    const d = item.data
    return (
        <Link href={`/portfolio/${item.slug}`} className="group flex flex-col overflow-hidden rounded-2xl border border-s-border bg-s-card transition hover:-translate-y-0.5 hover:border-s-orange">
            <div className="flex aspect-[16/9] items-center justify-center overflow-hidden bg-s-band">
                {t(d.image) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t(d.image)} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
                ) : (
                    <FolderOpen className="h-10 w-10 text-s-muted" aria-hidden="true" />
                )}
            </div>
            <div className="flex flex-col gap-2 p-5">
                <span className="text-xs font-bold uppercase tracking-wide text-s-orange-text">{t(d.service)}</span>
                <h3 className="font-display text-lg font-semibold text-s-ink">{t(d.title)}</h3>
                <p className="text-sm leading-relaxed">{t(d.summary)}</p>
                {(t(d.client) || t(d.technologies)) && <p className="text-sm text-s-muted">{[t(d.client), t(d.technologies)].filter(Boolean).join(" · ")}</p>}
            </div>
        </Link>
    )
}
