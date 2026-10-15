import Link from "next/link"
import { Globe2, Layers, ShieldCheck, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SITE_CONTAINER } from "@/components/marketing/container"
import { PLATFORM } from "@/lib/constants/platform"

export const metadata = {
    title: "About us | Genesoft ERP",
    description: "Genesoft Infotech builds Genesoft ERP, one system for sales, stock, accounts and people, for growing businesses in India and abroad.",
}

const VALUES = [
    { icon: Layers, title: "One system, not ten", text: "CRM, invoicing, inventory, accounting, HR and payroll share one set of records, so nothing is typed twice." },
    { icon: Globe2, title: "Your country's rules", text: "GST, VAT and sales tax are worked out for India, the Gulf, the UK, the US and Australia, with your currency and number format." },
    { icon: ShieldCheck, title: "Your data stays yours", text: "Each business's records are kept separate. You can export everything at any time, and we never sell your data." },
    { icon: Users, title: "Built for the whole team", text: "Invite your staff and decide what each person can see and change, module by module." },
]

export default function AboutPage() {
    return (
        <>
            <section className="border-b border-slate-100 bg-gradient-to-b from-blue-50/60 to-white">
                <div className={`${SITE_CONTAINER} py-16 md:py-24`}>
                    <div className="max-w-3xl">
                        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">About us</p>
                        <h1 className="mt-3 text-balance text-4xl font-bold tracking-tight text-slate-900 md:text-5xl xl:text-6xl">
                            Business software that keeps things simple
                        </h1>
                        <p className="mt-5 text-lg leading-relaxed text-slate-600 xl:text-xl">
                            {PLATFORM.legalName} is a software company based in Pune, India. We build {PLATFORM.productName}: one place for a growing
                            business to run its sales, stock, accounts and people, with the right tax for its country.
                        </p>
                    </div>
                </div>
            </section>

            <section className="py-16 md:py-20">
                <div className={`${SITE_CONTAINER} grid gap-12 lg:grid-cols-2 xl:gap-20`}>
                    <div className="space-y-4 text-[15px] leading-relaxed text-slate-700 xl:text-base">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 xl:text-4xl">Why we built it</h2>
                        <p>
                            Many small and mid-sized businesses keep customers in one tool, invoices in another and stock in a spreadsheet. Numbers drift
                            apart, the same details are typed again and again, and month-end means chasing figures.
                        </p>
                        <p>
                            {PLATFORM.productName} brings those jobs together. A quote becomes an order and then an invoice; the invoice moves stock, reaches
                            the customer&apos;s statement and posts to the ledger, all without re-typing.
                        </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {VALUES.map(({ icon: Icon, title, text }) => (
                            <div key={title} className="rounded-xl border border-slate-200 bg-white p-5 xl:p-6">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                    <Icon className="h-5 w-5" />
                                </div>
                                <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
                                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="border-t border-slate-100 bg-slate-50 py-16">
                <div className={`${SITE_CONTAINER} flex flex-col items-start justify-between gap-6 md:flex-row md:items-center`}>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Get in touch</h2>
                        <p className="mt-2 text-slate-600">
                            {PLATFORM.address.line1}, {PLATFORM.address.line2} · {PLATFORM.email} · {PLATFORM.phone}
                        </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Button asChild size="lg" className="bg-blue-600 text-white hover:bg-blue-700">
                            <Link href="/register">Start free trial</Link>
                        </Button>
                        <Button asChild size="lg" variant="outline" className="border-slate-300 bg-white text-slate-800 hover:bg-slate-50">
                            <Link href="/contact">Contact us</Link>
                        </Button>
                    </div>
                </div>
            </section>
        </>
    )
}
