import Link from "next/link"
import { BrandLogo } from "@/components/brand-logo"
import { Button } from "@/components/ui/button"
import { LEGAL_LINKS } from "@/components/marketing/legal-links"

export const metadata = {
    title: "Page not found | Genesoft ERP",
    description: "The page you were looking for doesn't exist.",
}

export default function NotFound() {
    return (
        <div className="light flex min-h-screen flex-col bg-white text-slate-900 [color-scheme:light]">
            <header className="border-b border-slate-200">
                <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center px-4 sm:px-6 lg:px-10 xl:px-16 md:h-[72px]">
                    <Link href="/" aria-label="Genesoft Infotech home">
                        <BrandLogo on="light" className="h-9 md:h-11" />
                    </Link>
                </div>
            </header>
            <main className="flex flex-1 items-center justify-center px-4 py-20">
                <div className="max-w-md text-center">
                    <p className="text-sm font-semibold text-blue-700">404</p>
                    <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Page not found</h1>
                    <p className="mt-3 text-slate-600">The page you were looking for doesn&apos;t exist or has moved.</p>
                    <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                        <Button asChild className="bg-blue-600 text-white hover:bg-blue-700">
                            <Link href="/">Go to the homepage</Link>
                        </Button>
                        <Button asChild variant="outline" className="border-slate-300 bg-white text-slate-800 hover:bg-slate-50">
                            <Link href="/login">Sign in</Link>
                        </Button>
                    </div>
                    <p className="mt-8 text-sm text-slate-500">
                        Need help? <Link href="/contact" className="text-blue-700 hover:underline">Contact us</Link> ·{" "}
                        <Link href="/sitemap" className="text-blue-700 hover:underline">All pages</Link> ·{" "}
                        <Link href={LEGAL_LINKS[1].href} className="text-blue-700 hover:underline">{LEGAL_LINKS[1].label}</Link>
                    </p>
                </div>
            </main>
        </div>
    )
}
