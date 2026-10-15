import Link from "next/link"
import { ArrowRight, Check, Laptop } from "lucide-react"
import { SITE_CONTAINER } from "@/components/marketing/container"
import { ServiceIcon } from "@/components/marketing/service-icon"
import { Eyebrow, H1, H2, Lead, SiteButton } from "@/components/marketing/ui"
import { PLATFORM, whatsappHref } from "@/lib/constants/platform"
import { PROCESS, SERVICES, WHY_US } from "@/lib/site-content"

export const metadata = {
    title: "Genesoft Infotech | Software, Digital Marketing, IT Rentals and IT Support in Pune",
    description:
        "Genesoft Infotech builds custom software and ERP systems, runs digital marketing, rents laptops and servers, and provides IT support, from Pune, India. Makers of Genesoft ERP.",
}

export default function HomePage() {
    return (
        <>
            {/* Hero */}
            <section className={`${SITE_CONTAINER} grid items-center gap-12 py-16 md:py-24 lg:grid-cols-2 xl:gap-20 2xl:py-28`}>
                <div className="s-reveal flex flex-col gap-6">
                    <Eyebrow>Software · Marketing · IT Rentals · IT Support</Eyebrow>
                    <H1 className="xl:text-[64px]">Technology that keeps your business moving.</H1>
                    <Lead className="max-w-[600px]">
                        From Pune, {PLATFORM.brandName} builds custom software, grows your brand online, rents you the IT equipment you need, and keeps it all running. One team, one point of contact.
                    </Lead>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <SiteButton href="/contact">Get a quote</SiteButton>
                        <SiteButton href="/erp" variant="secondary">Explore Genesoft ERP</SiteButton>
                    </div>
                    <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-s-muted">
                        {["Free first consultation", "Clear quote before we start", "Support after launch"].map((t) => (
                            <li key={t} className="flex items-center gap-1.5">
                                <Check className="h-4 w-4 text-s-orange-text" aria-hidden="true" /> {t}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Four services as a visual, no stock photos */}
                <div className="grid grid-cols-2 gap-4" aria-hidden="true">
                    {SERVICES.map((s, i) => (
                        <div
                            key={s.slug}
                            className={
                                i === 1 || i === 2
                                    ? "flex min-h-[170px] flex-col justify-between rounded-[20px] bg-s-charcoal p-6 text-[#F6F3EE]"
                                    : "flex min-h-[170px] flex-col justify-between rounded-[20px] bg-s-orange-tint p-6 text-s-ink"
                            }
                        >
                            <ServiceIcon name={s.icon} className={i === 1 || i === 2 ? "h-8 w-8 text-[#F6A55C]" : "h-8 w-8 text-s-orange-text"} />
                            <span className="font-display text-lg font-semibold leading-snug">{s.name}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Services */}
            <section className="bg-s-band py-20 md:py-24">
                <div className={`${SITE_CONTAINER} flex flex-col gap-10`}>
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div className="flex max-w-2xl flex-col gap-2.5">
                            <Eyebrow>What we do</Eyebrow>
                            <H2>Four services, one team</H2>
                        </div>
                        <Link href="/services" className="font-bold text-s-orange-text hover:underline">All services →</Link>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                        {SERVICES.map((s) => (
                            <Link
                                key={s.slug}
                                href={`/services/${s.slug}`}
                                className="group flex flex-col gap-3.5 rounded-2xl border border-s-border bg-s-card p-6 transition hover:-translate-y-0.5 hover:border-s-orange"
                            >
                                <span className="flex h-[52px] w-[52px] items-center justify-center rounded-xl bg-s-orange-tint text-s-orange-text">
                                    <ServiceIcon name={s.icon} className="h-6 w-6" />
                                </span>
                                <span className="font-display text-xl font-semibold text-s-ink">{s.name}</span>
                                <span className="leading-relaxed text-s-text">{s.short}</span>
                                <span className="mt-auto font-bold text-s-orange-text">{s.slug === "it-rentals" ? "Get a quote" : "Explore"} →</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* Genesoft ERP */}
            <section className="py-20 md:py-24">
                <div className={SITE_CONTAINER}>
                    <div className="grid items-center gap-12 rounded-[28px] bg-s-charcoal p-8 text-[#D9D4CC] md:p-14 lg:grid-cols-2">
                        <div className="flex flex-col gap-5">
                            <span className="self-start rounded-full bg-[#3A2614] px-3 py-1 text-[13px] font-bold text-[#F6A55C]">Our product</span>
                            <h2 className="text-balance font-display text-3xl font-bold leading-tight text-[#F6F3EE] xl:text-[44px]">Genesoft ERP: sales, stock and accounts in one place</h2>
                            <p className="text-lg leading-relaxed">
                                CRM, invoicing, inventory, accounting, HR and payroll, with GST, VAT or sales tax for your country. Try it free for 15 days, no card needed.
                            </p>
                            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                {["Quotes to invoices", "Multi-warehouse stock", "GST / VAT built in", "Team roles per module"].map((t) => (
                                    <li key={t} className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-[#F6A55C]" aria-hidden="true" /> {t}
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-1 flex flex-col gap-3 sm:flex-row">
                                <Link href="/register" className="inline-flex h-[52px] items-center justify-center rounded-[10px] bg-[#F28C33] px-6 font-bold text-s-on-orange hover:brightness-95">
                                    Start free trial
                                </Link>
                                <Link href="/erp" className="inline-flex h-[52px] items-center justify-center gap-2 rounded-[10px] border border-[#55514B] px-6 font-semibold text-[#F6F3EE] hover:bg-white/5">
                                    Learn more <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                </Link>
                            </div>
                        </div>
                        {/* Illustrative invoice: sample data, not customer data */}
                        <div className="rounded-2xl bg-[#FBFAF8] p-6 text-[#3D3B38] shadow-2xl shadow-black/30" aria-hidden="true">
                            <div className="flex items-start justify-between border-b border-[#E7E2DA] pb-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-[#B4540A]">Tax invoice</p>
                                    <p className="mt-1 text-sm font-semibold text-[#1F1E1D]">INV-0042</p>
                                </div>
                                <span className="rounded-full bg-[#E3F2EA] px-2.5 py-1 text-xs font-semibold text-[#1E7A4B]">Paid</span>
                            </div>
                            <div className="space-y-3 py-4 text-sm">
                                <div className="flex justify-between"><span>Annual maintenance contract</span><span className="font-semibold text-[#1F1E1D]">₹48,000.00</span></div>
                                <div className="flex justify-between"><span>On-site support visits (4)</span><span className="font-semibold text-[#1F1E1D]">₹12,000.00</span></div>
                            </div>
                            <div className="space-y-1.5 border-t border-[#E7E2DA] pt-4 text-sm">
                                <div className="flex justify-between text-[#6B6762]"><span>CGST 9%</span><span>₹5,400.00</span></div>
                                <div className="flex justify-between text-[#6B6762]"><span>SGST 9%</span><span>₹5,400.00</span></div>
                                <div className="flex justify-between pt-2 text-base font-bold text-[#1F1E1D]"><span>Total</span><span>₹70,800.00</span></div>
                            </div>
                            <p className="mt-4 text-[11px] text-[#6B6762]">Sample invoice. Outside India the same invoice shows one VAT or GST line.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Why us */}
            <section className="pb-20 md:pb-24">
                <div className={`${SITE_CONTAINER} grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] xl:gap-16`}>
                    <div className="flex flex-col gap-3">
                        <Eyebrow>Why Genesoft</Eyebrow>
                        <H2 className="leading-tight">A partner for the whole job, not just one part</H2>
                    </div>
                    <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
                        {WHY_US.map((w) => (
                            <div key={w.title} className="flex flex-col gap-2">
                                <h3 className="font-display text-xl font-semibold text-s-ink">{w.title}</h3>
                                <p className="leading-relaxed">{w.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Process */}
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

            {/* IT rentals band */}
            <section className="py-20">
                <div className={`${SITE_CONTAINER} grid items-center gap-8 lg:grid-cols-[auto_minmax(0,1fr)_auto]`}>
                    <span className="hidden h-16 w-16 items-center justify-center rounded-2xl bg-s-orange-tint text-s-orange-text lg:flex">
                        <Laptop className="h-8 w-8" aria-hidden="true" />
                    </span>
                    <div className="flex flex-col gap-2">
                        <h2 className="font-display text-2xl font-bold text-s-ink md:text-3xl">Need laptops or servers for a project?</h2>
                        <p className="text-lg">Rent them for a week, a month or a year, delivered and set up for you.</p>
                    </div>
                    <SiteButton href="/services/it-rentals" variant="secondary">See IT Rentals</SiteButton>
                </div>
            </section>

            {/* Closing call to action */}
            <section className="pb-20 md:pb-24">
                <div className={SITE_CONTAINER}>
                    <div className="flex flex-col items-start justify-between gap-8 rounded-[28px] bg-s-orange p-8 text-s-on-orange md:p-14 lg:flex-row lg:items-center">
                        <div className="flex max-w-2xl flex-col gap-2.5">
                            <h2 className="font-display text-3xl font-bold leading-tight xl:text-4xl">Tell us what you need</h2>
                            <p className="text-lg leading-relaxed">Software, marketing, equipment or support: send a short note and we&apos;ll reply within one working day.</p>
                        </div>
                        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                            <SiteButton href="/contact" variant="dark">Get a quote</SiteButton>
                            <SiteButton href={whatsappHref(PLATFORM.whatsapp, "Hello Genesoft Infotech, I'd like a quote.")} external variant="onOrange">WhatsApp us</SiteButton>
                        </div>
                    </div>
                </div>
            </section>
        </>
    )
}
