import { Manrope, Sora } from "next/font/google"
import { PublicNavbar } from "@/components/marketing/navbar"
import { PublicFooter } from "@/components/marketing/footer"
import { WhatsAppButton, PhoneActionBar } from "@/components/marketing/contact-actions"
import { SITE_THEME_SCRIPT } from "@/components/marketing/site-theme"

const sora = Sora({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-sora", display: "swap" })
const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-manrope", display: "swap" })

/**
 * Public website (genesoftinfotech.com). Its own light/dark theme follows the
 * visitor's device (or their toggle), separately from the app's theme.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
    return (
        <div
            id="site-root"
            suppressHydrationWarning
            className={`site light ${sora.variable} ${manrope.variable} flex min-h-screen flex-col bg-s-bg font-site text-s-text antialiased`}
        >
            <script dangerouslySetInnerHTML={{ __html: SITE_THEME_SCRIPT }} />
            <PublicNavbar />
            <main className="flex-1">{children}</main>
            <PublicFooter />
            <WhatsAppButton />
            <PhoneActionBar />
        </div>
    )
}
