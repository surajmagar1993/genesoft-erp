import Link from "next/link"
import { LegalPage, type LegalSection } from "@/components/marketing/legal-page"
import { PLATFORM } from "@/lib/constants/platform"

export const metadata = {
    title: "Refund & Cancellation Policy | Genesoft ERP",
    description: "Cancel Genesoft ERP anytime. Your first paid subscription has a 7-day money-back guarantee.",
}

const UPDATED = "14 October 2026"

const sections: LegalSection[] = [
    {
        id: "trial",
        title: "Free trial",
        body: <p>Every new workspace starts with a 15-day free trial. You don&apos;t pay anything during the trial, so there&apos;s nothing to refund.</p>,
    },
    {
        id: "money-back",
        title: "7-day money-back guarantee",
        body: (
            <>
                <p>
                    If you&apos;re not happy with your <strong>first paid subscription</strong>, ask for a refund within <strong>7 days</strong> of that
                    payment and we&apos;ll refund it in full. This applies to monthly and yearly plans.
                </p>
                <p>
                    The guarantee applies once per business. It doesn&apos;t apply to later payments, or to a workspace we&apos;ve suspended for breaking
                    our <Link href="/terms">Terms of Service</Link>.
                </p>
            </>
        ),
    },
    {
        id: "renewals",
        title: "Renewals and upgrades",
        body: (
            <ul>
                <li>Renewal payments (your second and later months or years) aren&apos;t refundable.</li>
                <li>When you upgrade, the prorated amount you pay for the rest of the period isn&apos;t refundable, unless it&apos;s within the 7 days after your first payment.</li>
                <li>We don&apos;t give partial refunds for unused time when you cancel or downgrade.</li>
            </ul>
        ),
    },
    {
        id: "cancel",
        title: "How to cancel",
        body: (
            <>
                <p>
                    You can cancel anytime by switching to the Free plan in <strong>Settings → Billing</strong>, or by emailing <a href={`mailto:${PLATFORM.email}`}>{PLATFORM.email}</a>{" "}
                    from your account email address.
                </p>
                <ul>
                    <li>Your plan stays active until the end of the period you&apos;ve paid for, then your workspace moves to the free plan.</li>
                    <li>Your data isn&apos;t deleted when you cancel. You can export it, or ask us to close your account and delete it.</li>
                    <li>In India (Razorpay), plans don&apos;t renew automatically, so not paying for a new period also ends your paid plan. In other countries (Stripe), cancelling stops automatic renewal.</li>
                </ul>
            </>
        ),
    },
    {
        id: "errors",
        title: "Duplicate or incorrect charges",
        body: (
            <p>
                If you were charged twice, or charged an amount that doesn&apos;t match your plan, tell us and we&apos;ll refund the extra amount in full,
                whenever it happened.
            </p>
        ),
    },
    {
        id: "request",
        title: "How to ask for a refund",
        body: (
            <>
                <p>
                    Email <a href={`mailto:${PLATFORM.email}`}>{PLATFORM.email}</a> from your account email address with your company name and the payment
                    date or receipt number. You don&apos;t have to give a reason, but it helps us improve.
                </p>
                <p>
                    We&apos;ll reply by email to confirm. Approved refunds go back to the card, UPI or bank account you paid with, and usually reach you
                    within 5 to 10 working days, depending on your bank and payment provider. When a refund is made, your workspace moves to the free plan.
                </p>
            </>
        ),
    },
    {
        id: "contact",
        title: "Contact",
        body: (
            <p>
                {PLATFORM.legalName}, {PLATFORM.address.line1}, {PLATFORM.address.line2}, {PLATFORM.address.country}.<br />
                Email: <a href={`mailto:${PLATFORM.email}`}>{PLATFORM.email}</a> · Phone: {PLATFORM.phone}
            </p>
        ),
    },
]

export default function RefundPolicyPage() {
    return (
        <LegalPage
            title="Refund & Cancellation Policy"
            updated={UPDATED}
            summary={
                <>
                    <strong>In short:</strong> try Genesoft ERP free for 15 days. If your first payment doesn&apos;t work out, ask within 7 days for a full
                    refund. Renewals aren&apos;t refundable, but you can cancel anytime and keep access until the end of your paid period.
                </>
            }
            sections={sections}
        />
    )
}
