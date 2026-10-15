import Link from "next/link"
import { LegalPage, type LegalSection } from "@/components/marketing/legal-page"
import { PLATFORM } from "@/lib/constants/platform"

export const metadata = {
    title: "Service Delivery Policy | Genesoft ERP",
    description: "Genesoft ERP is an online service: nothing is shipped. Your workspace is ready as soon as you sign up, and paid plans start once your payment is confirmed.",
}

const UPDATED = "15 October 2026"

const sections: LegalSection[] = [
    {
        id: "what-we-deliver",
        title: "What we deliver",
        body: (
            <p>
                Genesoft ERP is software you use online, in your web browser. We don&apos;t ship any physical goods, so there are no shipping charges or
                delivery addresses. Everything you buy from us is delivered as access to your Genesoft ERP workspace.
            </p>
        ),
    },
    {
        id: "free-trial",
        title: "When you sign up",
        body: (
            <p>
                Your workspace is created as soon as you complete sign-up, and you can start using it straight away. If we ask you to confirm your email
                address, you can sign in once you&apos;ve clicked the link we send you. Every new workspace starts with a 15-day free trial.
            </p>
        ),
    },
    {
        id: "paid-plans",
        title: "When you buy or change a plan",
        body: (
            <>
                <p>
                    You pay for plans in Settings → Billing, through Razorpay in India or Stripe in other countries. Your new plan starts as soon as the
                    payment provider confirms the payment, which is usually within a few seconds.
                </p>
                <p>A receipt is added to Settings → Billing for every payment.</p>
            </>
        ),
    },
    {
        id: "delays",
        title: "If something goes wrong",
        body: (
            <p>
                If you&apos;ve been charged but your plan hasn&apos;t changed within 24 hours, email us at{" "}
                <a href={`mailto:${PLATFORM.email}`}>{PLATFORM.email}</a> with your company name and the payment reference. We&apos;ll either start your
                plan or refund the payment.
            </p>
        ),
    },
    {
        id: "where",
        title: "Where the service is available",
        body: (
            <p>
                Genesoft ERP can be used from any country with an internet connection. Tax rules are built in for India, the UAE, Saudi Arabia, the UK, the
                US and Australia; businesses elsewhere set up their own tax name and rates.
            </p>
        ),
    },
    {
        id: "refunds",
        title: "Cancellations and refunds",
        body: (
            <p>
                You can cancel anytime. Refunds are covered by our <Link href="/refund-policy">Refund &amp; Cancellation Policy</Link>.
            </p>
        ),
    },
    {
        id: "contact",
        title: "Contact",
        body: (
            <p>
                {PLATFORM.legalName}, {PLATFORM.address.line1}, {PLATFORM.address.line2}. Email:{" "}
                <a href={`mailto:${PLATFORM.email}`}>{PLATFORM.email}</a>. Phone: {PLATFORM.phone}.
            </p>
        ),
    },
]

export default function DeliveryPolicyPage() {
    return (
        <LegalPage
            title="Service Delivery Policy"
            updated={UPDATED}
            summary={
                <>
                    <strong>In short:</strong> Genesoft ERP is an online service, so nothing is shipped. Your workspace is ready when you sign up, and a paid
                    plan starts as soon as your payment is confirmed.
                </>
            }
            sections={sections}
        />
    )
}
