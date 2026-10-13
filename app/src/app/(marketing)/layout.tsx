import { PublicNavbar } from "@/components/marketing/navbar"
import { PublicFooter } from "@/components/marketing/footer"

/**
 * Public website (genesoftinfotech.com): always light, regardless of the
 * app's theme, so the marketing pages look the same for every visitor.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="light flex min-h-screen flex-col bg-white text-slate-900 [color-scheme:light]">
            <PublicNavbar />
            <main className="flex-1">{children}</main>
            <PublicFooter />
        </div>
    )
}
