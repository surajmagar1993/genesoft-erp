import { Globe2, Layers, MapPin, ShieldCheck, Users } from "lucide-react"
import { SITE_CONTAINER } from "@/components/marketing/container"
import { Eyebrow, H1, H2, Lead, SiteButton } from "@/components/marketing/ui"
import { PLATFORM } from "@/lib/constants/platform"
import { getPageContent, getPublishedItems, getSiteSettings, list, mapsHref, text } from "@/lib/site-cms"

export const metadata = {
    title: "About us | Genesoft Infotech",
    description: "Genesoft Infotech is a Pune-based technology company: software, digital marketing, IT rentals and IT support, and the makers of Genesoft ERP.",
}

const VALUES = [
    { icon: Layers, title: "Straight answers", text: "Clear scope and price before we start; no hidden extras." },
    { icon: ShieldCheck, title: "Your data, protected", text: "Careful with access, passwords and client information." },
    { icon: Globe2, title: "Built to last", text: "Work that's maintainable, documented and yours to keep." },
    { icon: Users, title: "Here after launch", text: "Support that picks up the phone, and comes on site when needed." },
]

export default async function AboutPage() {
    const [about, team, site] = await Promise.all([getPageContent("page:about"), getPublishedItems("team"), getSiteSettings()])
    return (
        <>
            <section className="bg-s-band">
                <div className={`${SITE_CONTAINER} flex flex-col gap-5 py-16 md:py-24`}>
                    <Eyebrow>About {PLATFORM.brandName}</Eyebrow>
                    <H1 className="max-w-4xl">{text(about.heading)}</H1>
                    <Lead className="max-w-3xl">{text(about.lead)}</Lead>
                </div>
            </section>

            <section className={`${SITE_CONTAINER} grid gap-12 py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] xl:gap-16`}>
                <H2>What we do</H2>
                <div className="flex flex-col gap-4 text-lg leading-relaxed">
                    {list(about.story).map((para) => (
                        <p key={para.slice(0, 40)}>{para}</p>
                    ))}
                </div>
            </section>

            <section className="bg-s-band py-20">
                <div className={`${SITE_CONTAINER} flex flex-col gap-8`}>
                    <H2>What we stand for</H2>
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {VALUES.map(({ icon: Icon, title, text }) => (
                            <div key={title} className="flex flex-col gap-3 rounded-2xl border border-s-border bg-s-card p-6">
                                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-s-orange-tint text-s-orange-text">
                                    <Icon className="h-5 w-5" aria-hidden="true" />
                                </span>
                                <h3 className="font-display text-lg font-semibold text-s-ink">{title}</h3>
                                <p className="leading-relaxed">{text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {team.length > 0 && (
                <section className={`${SITE_CONTAINER} flex flex-col gap-8 pt-20`}>
                    <H2>The team</H2>
                    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {team.map((m) => (
                            <li key={m.id} className="overflow-hidden rounded-2xl border border-s-border bg-s-card">
                                <div className="flex aspect-square items-center justify-center bg-s-band">
                                    {text(m.data.photo) ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={text(m.data.photo)} alt={text(m.data.name)} className="h-full w-full object-cover" />
                                    ) : (
                                        <Users className="h-10 w-10 text-s-muted" aria-hidden="true" />
                                    )}
                                </div>
                                <div className="flex flex-col p-5">
                                    <strong className="font-display text-lg text-s-ink">{text(m.data.name)}</strong>
                                    <span className="text-s-muted">{text(m.data.role)}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <section className={`${SITE_CONTAINER} grid gap-6 py-20 lg:grid-cols-2`}>
                <div className="flex flex-col gap-3 rounded-[20px] border border-s-border bg-s-card p-8">
                    <h2 className="font-display text-2xl font-bold text-s-ink">Visit us</h2>
                    <p className="flex items-start gap-2 text-lg leading-relaxed">
                        <MapPin className="mt-1 h-5 w-5 shrink-0 text-s-orange-text" aria-hidden="true" />
                        {site.addressLine1}, {site.addressLine2}
                    </p>
                    <a href={mapsHref(site)} target="_blank" rel="noopener noreferrer" className="font-bold text-s-orange-text hover:underline">Open in Google Maps →</a>
                </div>
                <div className="flex flex-col items-start justify-center gap-4 rounded-[20px] bg-s-orange p-8 text-s-on-orange">
                    <h2 className="font-display text-2xl font-bold">Let&apos;s work together</h2>
                    <p className="text-lg leading-relaxed">Tell us what you need and we&apos;ll reply within one working day.</p>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <SiteButton href="/contact" variant="dark">Get a quote</SiteButton>
                        <SiteButton href="/register" variant="onOrange">Try Genesoft ERP</SiteButton>
                    </div>
                </div>
            </section>
        </>
    )
}
