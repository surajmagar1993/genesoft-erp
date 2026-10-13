import Link from "next/link"

export const metadata = {
    title: "Sitemap | Genesoft ERP",
    description: "All public pages on the Genesoft ERP website.",
}

const GROUPS = [
    { title: "Product", links: [["/", "Home"], ["/#features", "Features"], ["/#countries", "Countries & tax"], ["/pricing", "Pricing"]] },
    { title: "Account", links: [["/register", "Start free trial"], ["/login", "Sign in"], ["/forgot-password", "Reset password"]] },
    { title: "Company", links: [["/contact", "Contact us"]] },
    { title: "Legal", links: [["/privacy", "Privacy Policy"], ["/terms", "Terms of Service"], ["/refund-policy", "Refund & Cancellation Policy"]] },
]

export default function SitemapPage() {
    return (
        <div className="mx-auto max-w-4xl px-4 py-16 md:px-6">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">Sitemap</h1>
            <div className="mt-10 grid gap-10 sm:grid-cols-2">
                {GROUPS.map((g) => (
                    <section key={g.title}>
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{g.title}</h2>
                        <ul className="mt-3 space-y-2">
                            {g.links.map(([href, label]) => (
                                <li key={href}><Link href={href} className="text-blue-700 hover:underline">{label}</Link></li>
                            ))}
                        </ul>
                    </section>
                ))}
            </div>
        </div>
    )
}
