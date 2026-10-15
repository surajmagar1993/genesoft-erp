import { Mail, MapPin, MessageCircle, Phone } from "lucide-react"
import { SITE_CONTAINER } from "@/components/marketing/container"
import { EnquiryForm } from "@/components/marketing/enquiry-form"
import { H1, Lead } from "@/components/marketing/ui"
import { PLATFORM, telHref, whatsappHref } from "@/lib/constants/platform"
import { CONTACT_TOPICS } from "@/lib/site-content"

export const metadata = {
    title: "Contact us | Genesoft Infotech",
    description: "Talk to Genesoft Infotech about software, digital marketing, IT rentals, IT support or Genesoft ERP. WhatsApp, call or send us a message.",
}

const MAPS = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${PLATFORM.address.line1}, ${PLATFORM.address.line2}`)}`

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
    const { topic } = await searchParams
    const preset = (CONTACT_TOPICS as readonly string[]).includes(topic || "") ? topic! : "General"

    const ways = [
        { icon: MessageCircle, title: "WhatsApp Business", text: `${PLATFORM.whatsapp} · usually the fastest`, href: whatsappHref(PLATFORM.whatsapp, "Hello Genesoft Infotech"), external: true, tint: "bg-[#E3F2EA] text-[#1E7A4B] dark:bg-[#12291D] dark:text-[#4CC38A]" },
        { icon: Phone, title: "Call us", text: PLATFORM.phone, href: telHref(PLATFORM.phone), external: false, tint: "bg-s-orange-tint text-s-orange-text" },
        { icon: Mail, title: "Email", text: PLATFORM.email, href: `mailto:${PLATFORM.email}`, external: false, tint: "bg-s-orange-tint text-s-orange-text" },
    ]

    return (
        <section className={`${SITE_CONTAINER} grid items-start gap-12 py-16 md:py-20 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] xl:gap-16`}>
            <div className="flex flex-col gap-6">
                <H1>Let&apos;s talk</H1>
                <Lead>Tell us what you need, or reach us directly. We reply within one working day.</Lead>
                <div className="flex flex-col gap-3">
                    {ways.map(({ icon: Icon, title, text, href, external, tint }) => (
                        <a
                            key={title}
                            href={href}
                            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                            className="flex items-center gap-3.5 rounded-[14px] border border-s-border bg-s-card p-4 transition hover:border-s-orange"
                        >
                            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tint}`}>
                                <Icon className="h-5 w-5" aria-hidden="true" />
                            </span>
                            <span className="flex flex-col">
                                <strong className="text-s-ink">{title}</strong>
                                <span>{text}</span>
                            </span>
                        </a>
                    ))}
                </div>
                <div className="flex flex-col gap-2 rounded-[14px] border border-s-border bg-s-card p-5">
                    <strong className="text-s-ink">Office</strong>
                    <p className="flex items-start gap-2 leading-relaxed">
                        <MapPin className="mt-1 h-4 w-4 shrink-0 text-s-orange-text" aria-hidden="true" />
                        {PLATFORM.address.line1}, {PLATFORM.address.line2}
                    </p>
                    <a href={MAPS} target="_blank" rel="noopener noreferrer" className="font-bold text-s-orange-text hover:underline">Open in Google Maps →</a>
                </div>
            </div>
            <EnquiryForm topic={preset} />
        </section>
    )
}
