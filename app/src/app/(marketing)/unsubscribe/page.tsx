import Link from "next/link"
import { CheckCircle2, MailX, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PLATFORM } from "@/lib/constants/platform"
import { verifyUnsubscribeToken } from "@/lib/unsubscribe-token"
import { unsubscribeWithToken } from "@/app/actions/unsubscribe"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "Unsubscribe | Genesoft ERP",
    description: "Stop receiving product news and offers from Genesoft ERP.",
    robots: { index: false },
}

export default async function UnsubscribePage({
    searchParams,
}: {
    searchParams: Promise<{ t?: string; status?: string }>
}) {
    const { t, status } = await searchParams
    // Unsubscribing needs a click: email security scanners open links, and must not unsubscribe people.
    const valid = !!verifyUnsubscribeToken(t)

    let icon = <MailX className="h-10 w-10 text-blue-600" />
    let title = "Unsubscribe from marketing emails"
    let body: React.ReactNode = (
        <>
            You&apos;ll stop getting product news, tips and offers from {PLATFORM.productName}. Service emails, such as password resets,
            receipts and security alerts, will still be sent.
        </>
    )
    let showButton = valid

    if (status === "done") {
        icon = <CheckCircle2 className="h-10 w-10 text-green-600" />
        title = "You're unsubscribed"
        body = (
            <>
                We won&apos;t send you marketing emails any more. Changed your mind? Turn them back on in{" "}
                <Link href="/settings?tab=account" className="text-blue-600 underline">Settings → Email preferences</Link>.
            </>
        )
        showButton = false
    } else if (status === "error") {
        icon = <AlertTriangle className="h-10 w-10 text-amber-600" />
        title = "Something went wrong"
        body = <>We couldn&apos;t save that just now. Please try again, or email <a href={`mailto:${PLATFORM.email}`} className="text-blue-600 underline">{PLATFORM.email}</a> and we&apos;ll unsubscribe you.</>
    } else if (!valid) {
        icon = <AlertTriangle className="h-10 w-10 text-amber-600" />
        title = "This link isn't valid"
        body = (
            <>
                The unsubscribe link may be incomplete. Use the link from your latest email, turn marketing emails off in{" "}
                <Link href="/settings?tab=account" className="text-blue-600 underline">Settings → Email preferences</Link>, or email{" "}
                <a href={`mailto:${PLATFORM.email}`} className="text-blue-600 underline">{PLATFORM.email}</a>.
            </>
        )
    }

    return (
        <section className="bg-gradient-to-b from-blue-50/60 to-white">
            <div className="mx-auto max-w-lg px-4 py-20 text-center md:py-28">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
                    {icon}
                </div>
                <h1 className="text-balance text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
                <p className="mt-4 text-slate-600">{body}</p>
                {showButton && (
                    <form action={unsubscribeWithToken} className="mt-8">
                        <input type="hidden" name="t" value={t} />
                        <Button type="submit" size="lg">Unsubscribe</Button>
                    </form>
                )}
            </div>
        </section>
    )
}
