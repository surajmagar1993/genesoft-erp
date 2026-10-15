import Link from "next/link"
import { LegalPage, type LegalSection } from "@/components/marketing/legal-page"
import { PLATFORM } from "@/lib/constants/platform"

export const metadata = {
    title: "Cookie Policy | Genesoft ERP",
    description: "The few cookies Genesoft ERP uses to keep you signed in and remember your settings. No advertising or tracking cookies.",
}

const UPDATED = "15 October 2026"

/** Every cookie or browser-storage item the app sets itself. Keep in step with the code. */
const ITEMS = [
    {
        name: "sb-…-auth-token",
        kind: "Cookie (may be split into parts ending .0, .1)",
        purpose: "Keeps you signed in to your workspace.",
        lasts: "Until you sign out or your session ends",
        needed: "Strictly necessary",
    },
    {
        name: "sidebar_state",
        kind: "Cookie",
        purpose: "Remembers whether you keep the app's side menu open or closed.",
        lasts: "7 days",
        needed: "Preference",
    },
    {
        name: "theme",
        kind: "Browser storage (not sent to us)",
        purpose: "Remembers light or dark mode in the app.",
        lasts: "Until you clear your browser data",
        needed: "Preference",
    },
]

const sections: LegalSection[] = [
    {
        id: "what",
        title: "What cookies are",
        body: (
            <p>
                Cookies are small files a website saves in your browser. Browser storage works in a similar way but stays on your device. We use both only
                to make Genesoft ERP work and to remember your settings.
            </p>
        ),
    },
    {
        id: "ours",
        title: "The cookies we use",
        body: (
            <>
                <div className="overflow-x-auto rounded-lg border border-s-border">
                    <table className="w-full min-w-[560px] text-left text-sm">
                        <thead className="bg-s-band text-xs uppercase tracking-wide text-s-muted">
                            <tr>
                                <th className="px-3 py-2 font-semibold">Name</th>
                                <th className="px-3 py-2 font-semibold">What it does</th>
                                <th className="px-3 py-2 font-semibold">How long</th>
                                <th className="px-3 py-2 font-semibold">Type</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-s-border">
                            {ITEMS.map((c) => (
                                <tr key={c.name} className="align-top">
                                    <td className="px-3 py-2.5">
                                        <code className="text-[13px] text-s-ink">{c.name}</code>
                                        <div className="text-xs text-s-muted">{c.kind}</div>
                                    </td>
                                    <td className="px-3 py-2.5">{c.purpose}</td>
                                    <td className="px-3 py-2.5">{c.lasts}</td>
                                    <td className="px-3 py-2.5">{c.needed}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p>We don&apos;t use advertising cookies, analytics cookies or anything that tracks you across other websites.</p>
            </>
        ),
    },
    {
        id: "payments",
        title: "Cookies from payment providers",
        body: (
            <p>
                When you pay for a plan, the payment window is provided by Razorpay (India) or Stripe (other countries). They may set their own cookies, for
                example to prevent fraud. Those cookies are covered by their own policies.
            </p>
        ),
    },
    {
        id: "control",
        title: "Your choices",
        body: (
            <p>
                You can block or delete cookies in your browser settings. If you block the sign-in cookie you won&apos;t be able to stay signed in. Because
                we only use cookies that the service needs or that remember your own settings, we don&apos;t show a cookie banner.
            </p>
        ),
    },
    {
        id: "more",
        title: "More about your data",
        body: (
            <p>
                See our <Link href="/privacy">Privacy Policy</Link> for how we handle personal data, or email{" "}
                <a href={`mailto:${PLATFORM.email}`}>{PLATFORM.email}</a> with any questions.
            </p>
        ),
    },
]

export default function CookiePolicyPage() {
    return (
        <LegalPage
            title="Cookie Policy"
            updated={UPDATED}
            summary={
                <>
                    <strong>In short:</strong> we use a sign-in cookie and two small settings (side menu and light/dark mode). No advertising or tracking
                    cookies.
                </>
            }
            sections={sections}
        />
    )
}
