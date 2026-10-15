import { Mail } from "lucide-react"
import { SITE_CONTAINER } from "@/components/marketing/container"
import { H1, H2, Lead } from "@/components/marketing/ui"
import { PLATFORM } from "@/lib/constants/platform"

export const metadata = {
    title: "Careers | Genesoft Infotech",
    description: "Work with Genesoft Infotech in Pune: developers, marketers and IT engineers.",
}

/**
 * Job posts come from Super Admin → Website → Careers (planned). There are no
 * openings now (owner, 15 Oct 2026), so the page invites CVs to careers@.
 */
export default function CareersPage() {
    return (
        <>
            <section className={`${SITE_CONTAINER} flex flex-col gap-5 py-16 md:py-20`}>
                <H1>Work with us</H1>
                <Lead className="max-w-3xl">Developers, marketers and IT engineers who like solving real problems for real businesses.</Lead>
            </section>
            <section className={`${SITE_CONTAINER} grid gap-6 pb-20 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]`}>
                <div className="flex flex-col items-start gap-4 rounded-[20px] border border-s-border bg-s-card p-8 md:p-10">
                    <H2 className="text-2xl xl:text-3xl">No open roles right now</H2>
                    <p className="max-w-2xl text-lg leading-relaxed">
                        We&apos;re always glad to hear from good people. Send your CV and a few lines about what you&apos;d like to work on, and we&apos;ll get in touch when something fits.
                    </p>
                    <a
                        href={`mailto:${PLATFORM.careersEmail}?subject=${encodeURIComponent("CV for Genesoft Infotech")}`}
                        className="mt-2 inline-flex h-[52px] items-center gap-2 rounded-[10px] bg-s-orange px-6 font-bold text-s-on-orange hover:brightness-95"
                    >
                        <Mail className="h-5 w-5" aria-hidden="true" /> Email your CV to {PLATFORM.careersEmail}
                    </a>
                </div>
                <div className="flex flex-col gap-3 rounded-[20px] bg-s-band p-8">
                    <h3 className="font-display text-xl font-semibold text-s-ink">What we work on</h3>
                    <ul className="flex list-disc flex-col gap-2 pl-5 leading-relaxed">
                        <li>Custom software, ERP and CRM systems, including our own Genesoft ERP</li>
                        <li>Digital marketing for growing businesses</li>
                        <li>IT rentals, networking and support for offices in and around Pune</li>
                    </ul>
                    <p className="text-sm text-s-muted">We keep CVs only as long as needed to consider you, as explained in our Privacy Policy.</p>
                </div>
            </section>
        </>
    )
}
