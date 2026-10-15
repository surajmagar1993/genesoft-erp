import Link from "next/link"
import { SITE_CONTAINER } from "@/components/marketing/container"
import {
    ArrowRight,
    Check,
    Users,
    FileText,
    Boxes,
    Landmark,
    ScanBarcode,
    UserRoundCheck,
    FolderKanban,
    Workflow,
    ShieldCheck,
    Globe2,
    Smartphone,
    KeyRound,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { pageMeta } from "@/lib/seo"
import { JsonLd } from "@/components/marketing/json-ld"
import { appUrl } from "@/lib/app-url"
import { softwareLd } from "@/lib/structured-data"

const DESCRIPTION =
    "Genesoft ERP by Genesoft Infotech brings CRM, invoicing, inventory, accounting, HR and POS together, with GST, VAT or sales tax worked out for your country."

export const metadata = pageMeta({
    title: "Genesoft ERP: CRM, invoicing, inventory and accounting in one place",
    description: DESCRIPTION,
    path: "/erp",
})

const FEATURES = [
    { icon: Users, title: "CRM", text: "Leads, deals, contacts and companies, with tasks, email and WhatsApp in one timeline." },
    { icon: FileText, title: "Quotes to invoices", text: "Quotes, sales orders, delivery challans, invoices, credit notes and recurring billing." },
    { icon: Boxes, title: "Inventory & purchasing", text: "Multiple warehouses, stock transfers, batches and serials, purchase orders and vendor bills." },
    { icon: Landmark, title: "Accounting", text: "Chart of accounts, expenses, payments, receivables, payables and bank statement matching." },
    { icon: ScanBarcode, title: "Point of sale", text: "A fast counter screen with barcode scanning, walk-in customers and printed receipts." },
    { icon: UserRoundCheck, title: "HR & payroll", text: "Employees, attendance, leave, payslips, appraisals and an employee self-service portal." },
    { icon: FolderKanban, title: "Projects", text: "Tasks on a board, milestones, team members and billable timesheets." },
    { icon: Workflow, title: "Automation", text: "Rules that create tasks, send emails or call webhooks when invoices, leads or stock change." },
]

const COUNTRIES = [
    { flag: "🇮🇳", name: "India", tax: "GST", detail: "CGST + SGST or IGST by state, HSN/SAC codes, GSTIN on invoices." },
    { flag: "🇦🇪", name: "United Arab Emirates", tax: "VAT 5%", detail: "Tax invoices with your TRN, zero-rated and standard items." },
    { flag: "🇸🇦", name: "Saudi Arabia", tax: "VAT 15% + ZATCA", detail: "ZATCA phase 1 QR code on every invoice, with your VAT number." },
    { flag: "🇬🇧", name: "United Kingdom", tax: "VAT", detail: "VAT invoices at 20%, 5% or 0% with your VAT registration number." },
    { flag: "🇺🇸", name: "United States", tax: "Sales tax", detail: "Set the sales tax rates you charge; your EIN on invoices." },
    { flag: "🇦🇺", name: "Australia", tax: "GST 10%", detail: "Tax invoices with your ABN and GST at 10% or GST-free." },
]

const TRUST = [
    { icon: KeyRound, title: "Roles for every person", text: "Admins, managers, staff and view-only users each see and change only what they should." },
    { icon: ShieldCheck, title: "Your data stays yours", text: "Each company's records are kept separate, payment and email passwords are stored encrypted, and you can export your data." },
    { icon: Globe2, title: "Multi-currency", text: "Invoice in your currency with the right number format, and record foreign-currency transactions." },
    { icon: Smartphone, title: "Works on any screen", text: "Use it in the browser on a laptop, tablet or phone. Nothing to install." },
]

const STEPS = [
    { n: "1", title: "Create your workspace", text: "Sign up, pick your country and currency. Your tax setup is ready straight away." },
    { n: "2", title: "Add customers and products", text: "Type them in or import a CSV. Invite your team and give each person a role." },
    { n: "3", title: "Send your first invoice", text: "Email it, share it on WhatsApp, or let customers view and download it from their own portal." },
]

const FAQ = [
    { q: "How does the free trial work?", a: "You get 15 days to use Genesoft ERP. No card is needed to start. At the end of the trial, choose a plan or stay on the free plan." },
    { q: "Can I get a refund?", a: "Yes. If you're not happy with your first paid subscription, ask for a refund within 7 days of paying and we'll return it in full. See the Refund & Cancellation policy." },
    { q: "Which countries do you support?", a: "India, the UAE, Saudi Arabia, the UK, the US and Australia have their tax rules built in. Businesses elsewhere can set their own tax name and rates." },
    { q: "Do you file my GST or VAT returns?", a: "Not yet. Genesoft ERP works out the tax on every document and gives you a tax summary for any period, which you or your accountant use to file. Direct filing is planned." },
    { q: "Who owns my data?", a: "You do. We only process it to run the service for you, and you can export it or ask us to delete it." },
    { q: "Is there a mobile app?", a: "Genesoft ERP works in the browser on phones and tablets today. A dedicated mobile app is planned." },
]

export default function LandingPage() {
    return (
        <>
            <JsonLd data={softwareLd(appUrl(), DESCRIPTION)} />
            {/* Hero */}
            <section className="border-b border-s-border bg-gradient-to-b from-s-orange-tint/50 to-s-bg">
                <div className={`${SITE_CONTAINER} grid items-center gap-12 py-16 md:grid-cols-2 md:py-24 xl:gap-20 2xl:py-28`}>
                    <div className="space-y-6">
                        <span className="inline-flex items-center gap-2 rounded-full border border-s-border bg-s-card px-3 py-1 text-xs font-medium text-s-orange-text">
                            Built for India, the Gulf, the UK, the US and Australia
                        </span>
                        <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight text-s-ink md:text-5xl xl:text-6xl">
                            Run sales, stock and accounts in one place.
                        </h1>
                        <p className="max-w-xl text-lg leading-relaxed text-s-text xl:text-xl">
                            Genesoft ERP brings your CRM, invoicing, inventory, accounting, HR and point of sale together, with GST, VAT or sales tax worked out for your country.
                        </p>
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <Button asChild size="lg" className="bg-s-orange text-s-on-orange hover:brightness-95">
                                <Link href="/register">
                                    Start 15-day free trial <ArrowRight className="ml-1 h-4 w-4" />
                                </Link>
                            </Button>
                            <Button asChild size="lg" variant="outline" className="border-s-border-strong bg-s-card text-s-ink hover:bg-s-band">
                                <Link href="/erp/pricing">See pricing</Link>
                            </Button>
                        </div>
                        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-s-text">
                            {["No card needed to start", "Cancel anytime", "7-day money-back on your first payment"].map((t) => (
                                <li key={t} className="flex items-center gap-1.5">
                                    <Check className="h-4 w-4 text-s-orange-text" /> {t}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Illustrative invoice: sample data, not customer data */}
                    <div className="relative w-full md:justify-self-end lg:max-w-xl" aria-hidden="true">
                        <div className="rounded-xl border border-s-border bg-s-card p-6 shadow-xl shadow-black/5">
                            <div className="flex items-start justify-between border-b border-s-border pb-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-s-orange-text">Tax Invoice</p>
                                    <p className="mt-1 text-sm font-semibold text-s-ink">INV-0042</p>
                                </div>
                                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Paid</span>
                            </div>
                            <div className="space-y-3 py-4 text-sm">
                                {[
                                    ["Annual maintenance contract", "₹48,000.00"],
                                    ["On-site support visits (4)", "₹12,000.00"],
                                ].map(([item, amount]) => (
                                    <div key={item} className="flex justify-between text-s-text">
                                        <span>{item}</span>
                                        <span className="font-medium text-s-ink">{amount}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-1.5 border-t border-s-border pt-4 text-sm">
                                <div className="flex justify-between text-s-muted"><span>CGST 9%</span><span>₹5,400.00</span></div>
                                <div className="flex justify-between text-s-muted"><span>SGST 9%</span><span>₹5,400.00</span></div>
                                <div className="flex justify-between pt-2 text-base font-semibold text-s-ink"><span>Total</span><span>₹70,800.00</span></div>
                            </div>
                            <p className="mt-4 text-[11px] text-s-muted">Sample invoice. Outside India the same invoice shows one VAT or GST line.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section id="features" className="scroll-mt-20 py-20">
                <div className={SITE_CONTAINER}>
                    <div className="mx-auto max-w-2xl text-center">
                        <h2 className="text-3xl font-bold tracking-tight text-s-ink xl:text-4xl">Everything a growing business runs on</h2>
                        <p className="mt-3 text-s-text xl:text-lg">One login, one set of records. Sales, stock and accounts stay in step without re-typing.</p>
                    </div>
                    <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:gap-6">
                        {FEATURES.map(({ icon: Icon, title, text }) => (
                            <div key={title} className="rounded-xl border border-s-border bg-s-card p-5 transition-shadow hover:shadow-md xl:p-6">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-s-orange-tint text-s-orange-text">
                                    <Icon className="h-5 w-5" />
                                </div>
                                <h3 className="mt-4 font-semibold text-s-ink">{title}</h3>
                                <p className="mt-1.5 text-sm leading-relaxed text-s-text">{text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Countries */}
            <section id="countries" className="scroll-mt-20 border-y border-s-border bg-s-band py-20">
                <div className={SITE_CONTAINER}>
                    <div className="mx-auto max-w-2xl text-center">
                        <h2 className="text-3xl font-bold tracking-tight text-s-ink xl:text-4xl">The right tax for your country</h2>
                        <p className="mt-3 text-s-text xl:text-lg">
                            Choose your country when you sign up. Invoices, quotes and bills then use your tax, currency and number format automatically.
                        </p>
                    </div>
                    <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {COUNTRIES.map((c) => (
                            <div key={c.name} className="rounded-xl border border-s-border bg-s-card p-5">
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-2 font-semibold text-s-ink">
                                        <span className="text-xl" aria-hidden="true">{c.flag}</span> {c.name}
                                    </span>
                                    <span className="rounded-full bg-s-orange-tint px-2.5 py-0.5 text-xs font-medium text-s-orange-text">{c.tax}</span>
                                </div>
                                <p className="mt-3 text-sm leading-relaxed text-s-text">{c.detail}</p>
                            </div>
                        ))}
                    </div>
                    <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-s-text">
                        Somewhere else? Pick <strong className="font-semibold text-s-ink">Other country</strong> and set your own tax name and rates.
                        Every workspace gets a tax summary for any period to file with your tax authority.
                    </p>
                </div>
            </section>

            {/* Trust */}
            <section className="py-20">
                <div className={SITE_CONTAINER}>
                    <h2 className="text-center text-3xl font-bold tracking-tight text-s-ink xl:text-4xl">Built to be trusted with your business</h2>
                    <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                        {TRUST.map(({ icon: Icon, title, text }) => (
                            <div key={title}>
                                <Icon className="h-6 w-6 text-s-orange-text" />
                                <h3 className="mt-3 font-semibold text-s-ink">{title}</h3>
                                <p className="mt-1.5 text-sm leading-relaxed text-s-text">{text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Steps */}
            <section className="border-y border-s-border bg-s-band py-20">
                <div className={SITE_CONTAINER}>
                    <h2 className="text-center text-3xl font-bold tracking-tight text-s-ink xl:text-4xl">Get started in three steps</h2>
                    <ol className="mt-12 grid gap-6 md:grid-cols-3">
                        {STEPS.map((s) => (
                            <li key={s.n} className="rounded-xl border border-s-border bg-s-card p-6">
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-s-orange text-sm font-semibold text-s-on-orange">{s.n}</span>
                                <h3 className="mt-4 font-semibold text-s-ink">{s.title}</h3>
                                <p className="mt-1.5 text-sm leading-relaxed text-s-text">{s.text}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-20">
                <div className={SITE_CONTAINER}>
                    <h2 className="text-center text-3xl font-bold tracking-tight text-s-ink xl:text-4xl">Questions people ask</h2>
                    <div className="mt-10 grid items-start gap-4 lg:grid-cols-2">
                        {FAQ.map((item) => (
                            <details key={item.q} className="group rounded-xl border border-s-border bg-s-card p-5 [&_summary::-webkit-details-marker]:hidden">
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-s-ink">
                                    {item.q}
                                    <span className="text-xl leading-none text-s-muted transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                                </summary>
                                <p className="mt-3 text-sm leading-relaxed text-s-text">{item.a}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className={`${SITE_CONTAINER} pb-20`}>
                <div className="rounded-2xl bg-s-orange px-6 py-14 text-center text-s-on-orange md:px-12 xl:py-20">
                    <h2 className="text-3xl font-bold tracking-tight xl:text-4xl">Try Genesoft ERP free for 15 days</h2>
                    <p className="mx-auto mt-3 max-w-xl text-s-on-orange/80">No card needed. Set up your company in minutes and send your first invoice today.</p>
                    <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                        <Button asChild size="lg" className="bg-s-card text-s-orange-text hover:bg-s-orange-tint">
                            <Link href="/register">Start free trial</Link>
                        </Button>
                        <Button asChild size="lg" variant="outline" className="border-s-on-orange bg-transparent text-s-on-orange hover:bg-black/10 hover:text-s-on-orange">
                            <Link href="/contact">Talk to us</Link>
                        </Button>
                    </div>
                </div>
            </section>
        </>
    )
}
