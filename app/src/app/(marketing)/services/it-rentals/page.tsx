import Link from "next/link"
import { Laptop, Monitor, Network, Printer, Server, Tv } from "lucide-react"
import { SITE_CONTAINER } from "@/components/marketing/container"
import { Eyebrow, H2, SiteButton } from "@/components/marketing/ui"
import { whatsappHref } from "@/lib/constants/platform"
import { DEFAULT_RENTAL_ITEMS, getPageContent, getPublishedItems, getSiteSettings, text } from "@/lib/site-cms"
import { RENTAL_STEPS } from "@/lib/site-content"
import { RentalQuoteForm } from "./quote-form"

export const metadata = {
    title: "IT Rentals: laptops, desktops and servers on rent | Genesoft Infotech",
    description: "Rent laptops, desktops, servers, networking and displays for a week, a project or a year. Delivered and set up. Ask for a quote.",
}

const ICONS = [Laptop, Monitor, Server, Network, Tv, Printer]

export default async function ItRentalsPage() {
    const [site, c, published] = await Promise.all([getSiteSettings(), getPageContent("service:it-rentals"), getPublishedItems("rental_item")])
    // Rental catalogue from Super Admin → Website, else the built-in categories
    const categories = published.length ? published.map((i) => ({ name: text(i.data.name), text: text(i.data.text) })) : DEFAULT_RENTAL_ITEMS
    return (
        <>
            <section className="bg-s-charcoal text-[#D9D4CC]">
                <div className={`${SITE_CONTAINER} grid items-center gap-12 py-16 md:py-20 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]`}>
                    <div className="flex flex-col gap-5">
                        <nav aria-label="Breadcrumb" className="text-sm text-[#A39E96]">
                            <Link href="/" className="hover:text-white">Home</Link> / <Link href="/services" className="hover:text-white">Services</Link> / <span className="font-semibold text-[#F6F3EE]">IT Rentals</span>
                        </nav>
                        <h1 className="text-balance font-display text-4xl font-bold leading-[1.08] text-[#F6F3EE] md:text-5xl xl:text-6xl">{text(c.heading)}</h1>
                        <p className="max-w-[640px] text-lg leading-relaxed xl:text-xl">{text(c.intro)}</p>
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <a href="#quote" className="inline-flex h-[52px] items-center justify-center rounded-[10px] bg-[#F28C33] px-6 font-bold text-s-on-orange hover:brightness-95">Request a quote</a>
                            <a
                                href={whatsappHref(site.whatsapp, "Hello, I'd like a quote for IT equipment on rent.")}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex h-[52px] items-center justify-center rounded-[10px] border border-[#55514B] px-6 font-semibold text-[#F6F3EE] hover:bg-white/5"
                            >
                                WhatsApp us
                            </a>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3" aria-hidden="true">
                        {ICONS.map((Icon, i) => (
                            <div key={i} className="flex aspect-square items-center justify-center rounded-2xl border border-[#3A3733] bg-[#24221F]">
                                <Icon className="h-10 w-10 text-[#F6A55C]" />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className={`${SITE_CONTAINER} flex flex-col gap-7 py-20`}>
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <H2>What you can rent</H2>
                    <span className="text-sm text-s-muted">Prices on request. Brands and specs depend on stock.</span>
                </div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {categories.map((cat, i) => {
                        const Icon = ICONS[i % ICONS.length] ?? Laptop
                        return (
                            <div key={cat.name} className="flex flex-col gap-2.5 rounded-2xl border border-s-border bg-s-card p-6">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-s-orange-tint text-s-orange-text">
                                        <Icon className="h-5 w-5" aria-hidden="true" />
                                    </span>
                                    <h3 className="font-display text-lg font-semibold text-s-ink">{cat.name}</h3>
                                </div>
                                <p className="leading-relaxed">{cat.text}</p>
                                <a href="#quote" className="font-bold text-s-orange-text hover:underline">Add to quote →</a>
                            </div>
                        )
                    })}
                </div>
            </section>

            <section className="bg-s-band py-20">
                <div className={`${SITE_CONTAINER} flex flex-col gap-7`}>
                    <H2>How renting works</H2>
                    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {RENTAL_STEPS.map((s, i) => (
                            <li key={s.title} className="flex flex-col gap-2 rounded-2xl bg-s-card p-6">
                                <span className="font-bold text-s-orange-text">Step {i + 1}</span>
                                <span className="font-display font-semibold text-s-ink">{s.title}</span>
                                <span className="leading-relaxed">{s.text}</span>
                            </li>
                        ))}
                    </ol>
                    <p className="text-sm text-s-muted">Deposit, delivery and return terms come with your quote.</p>
                </div>
            </section>

            <section id="quote" className={`${SITE_CONTAINER} grid scroll-mt-24 items-start gap-12 py-20 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]`}>
                <div className="flex flex-col gap-4">
                    <Eyebrow>Quote</Eyebrow>
                    <H2 className="leading-tight">Request a rental quote</H2>
                    <p className="text-lg leading-relaxed">
                        Your request goes to <strong className="text-s-ink">{site.email}</strong>. We confirm stock and email the price and terms within one working day.
                    </p>
                    <SiteButton href={whatsappHref(site.whatsapp, "Hello, I'd like a quote for IT equipment on rent.")} external variant="secondary" className="self-start">
                        Or WhatsApp us
                    </SiteButton>
                </div>
                <RentalQuoteForm categories={categories.map((x) => x.name)} whatsapp={site.whatsapp} />
            </section>
        </>
    )
}
