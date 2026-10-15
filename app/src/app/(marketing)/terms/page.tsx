import Link from "next/link"
import { LegalPage, type LegalSection } from "@/components/marketing/legal-page"
import { PLATFORM } from "@/lib/constants/platform"

export const metadata = {
    title: "Terms of Service | Genesoft ERP",
    description: "The terms for using Genesoft ERP, provided by Genesoft Infotech.",
}

const UPDATED = "14 October 2026"

const sections: LegalSection[] = [
    {
        id: "agreement",
        title: "Agreement",
        body: (
            <>
                <p>
                    These terms are an agreement between you and <strong>{PLATFORM.legalName}</strong> (&quot;Genesoft&quot;, &quot;we&quot;) for the use of Genesoft
                    ERP, our website at <a href={PLATFORM.website}>genesoftinfotech.com</a> and related services (together, the &quot;Service&quot;).
                </p>
                <p>
                    By creating an account or using the Service you agree to these terms, our <Link href="/privacy">Privacy Policy</Link> and our{" "}
                    <Link href="/refund-policy">Refund &amp; Cancellation Policy</Link>. If you use the Service for a company, you confirm you&apos;re
                    allowed to accept these terms on its behalf. You must be 18 or older.
                </p>
            </>
        ),
    },
    {
        id: "accounts",
        title: "Your account",
        body: (
            <ul>
                <li>Give accurate details when you sign up, including your business country, and keep them up to date.</li>
                <li>Keep your password safe. You&apos;re responsible for what happens under your account and the users you invite.</li>
                <li>Workspace admins decide who joins the workspace and what each person&apos;s role allows.</li>
                <li>Tell us straight away at <a href={`mailto:${PLATFORM.email}`}>{PLATFORM.email}</a> if you think your account has been misused.</li>
            </ul>
        ),
    },
    {
        id: "trial-plans",
        title: "Free trial and free plan",
        body: (
            <p>
                New workspaces get a 15-day free trial. No payment details are needed to start. When the trial ends you can choose a paid plan or continue
                on the free plan, which has the limits shown on our <Link href="/erp/pricing">Pricing</Link> page. We may change what the free plan includes,
                with notice.
            </p>
        ),
    },
    {
        id: "billing",
        title: "Paid plans and billing",
        body: (
            <ul>
                <li>Prices are shown on our <Link href="/erp/pricing">Pricing</Link> page in your currency and include applicable taxes. You pay in advance for each monthly or yearly period.</li>
                <li>In India we take payments through Razorpay; you pay for each new period when it&apos;s due. In other countries we use Stripe, which renews your plan automatically until you cancel.</li>
                <li>If you upgrade during a period, you pay the prorated difference straight away. Downgrades take effect at your next renewal.</li>
                <li>If a renewal isn&apos;t paid, we may move your workspace to the free plan. Your data stays in your workspace.</li>
                <li>We&apos;ll tell you in advance before changing the price of your plan. New prices apply from your next period.</li>
            </ul>
        ),
    },
    {
        id: "refunds",
        title: "Cancellation and refunds",
        body: (
            <p>
                You can cancel anytime; your plan stays active until the end of the period you&apos;ve paid for. Your <strong>first</strong> paid
                subscription comes with a 7-day money-back guarantee. Renewals aren&apos;t refundable. Full details are in our{" "}
                <Link href="/refund-policy">Refund &amp; Cancellation Policy</Link>.
            </p>
        ),
    },
    {
        id: "your-data",
        title: "Your data",
        body: (
            <ul>
                <li>The business data you put into Genesoft ERP belongs to you. You give us permission to store and process it only to provide the Service.</li>
                <li>You&apos;re responsible for having the right to store the personal data of your customers, suppliers and employees, and for using it lawfully.</li>
                <li>You can export your data while your account is open. After you close your account we delete it as described in our <Link href="/privacy">Privacy Policy</Link>.</li>
            </ul>
        ),
    },
    {
        id: "communications",
        title: "Emails and marketing communications",
        body: (
            <>
                <p>
                    <strong>Service emails.</strong> We&apos;ll send you emails needed to run your account, such as sign-up confirmation, password resets,
                    payment receipts, security alerts and important changes to the Service or these terms. These are part of the Service and you can&apos;t
                    turn them off while your account is open.
                </p>
                <p>
                    <strong>Marketing emails.</strong> We send product news, tips and offers only if you&apos;ve opted in, for example with the checkbox at
                    sign-up. You can withdraw that consent anytime with the unsubscribe link in any marketing email, in <strong>Settings → Email
                    preferences</strong>, or by emailing <a href={`mailto:${PLATFORM.email}`}>{PLATFORM.email}</a>. Withdrawing consent doesn&apos;t affect
                    your account or service emails.
                </p>
                <p>
                    <strong>Messages you send from Genesoft ERP.</strong> If you use the Service to email or WhatsApp your own customers, you&apos;re
                    responsible for having their permission and for following anti-spam and messaging laws (and WhatsApp&apos;s policies) that apply to you.
                </p>
            </>
        ),
    },
    {
        id: "acceptable-use",
        title: "Acceptable use",
        body: (
            <>
                <p>Don&apos;t use the Service to:</p>
                <ul>
                    <li>break any law, including tax, data protection and consumer laws,</li>
                    <li>send spam or messages people haven&apos;t agreed to receive,</li>
                    <li>store or share content you don&apos;t have the right to, or that is harmful or fraudulent,</li>
                    <li>try to access other companies&apos; data, test our security without permission, or disrupt the Service, or</li>
                    <li>copy, resell or reverse-engineer the Service.</li>
                </ul>
            </>
        ),
    },
    {
        id: "tax",
        title: "Tax figures",
        body: (
            <p>
                Genesoft ERP calculates GST, VAT or sales tax from the rates and details you enter, and gives you a tax summary for any period. It isn&apos;t
                tax or legal advice. You&apos;re responsible for checking your figures and filing returns with your tax authority, or asking your accountant
                to. Direct filing with government systems isn&apos;t part of the Service yet.
            </p>
        ),
    },
    {
        id: "third-parties",
        title: "Third-party services",
        body: (
            <p>
                Some features rely on services you connect, such as Razorpay, Stripe, PayPal, WhatsApp or your own email server. Their terms apply to your
                use of them, and we&apos;re not responsible for their availability or actions.
            </p>
        ),
    },
    {
        id: "availability",
        title: "Availability and changes",
        body: (
            <p>
                We work to keep the Service available and reliable, but we can&apos;t promise it will never be interrupted. We may need to pause it for
                maintenance or updates, and we&apos;ll try to give notice for planned work. We may add, change or remove features; if we remove something
                important to paying customers, we&apos;ll tell you in advance.
            </p>
        ),
    },
    {
        id: "suspension",
        title: "Suspension and termination",
        body: (
            <p>
                You can close your account anytime. We may suspend or close an account that breaks these terms, puts the Service or other users at risk, or
                is unpaid. Unless it&apos;s urgent or the law prevents it, we&apos;ll warn you first and give you a chance to fix the problem or export
                your data.
            </p>
        ),
    },
    {
        id: "liability",
        title: "Disclaimers and liability",
        body: (
            <>
                <p>
                    The Service is provided &quot;as is&quot;. To the extent the law allows, we don&apos;t give warranties beyond those stated in these terms.
                </p>
                <p>
                    To the extent the law allows, we&apos;re not liable for indirect or consequential losses (such as lost profits or data), and our total
                    liability for any claim is limited to the amount you paid us for the Service in the 12 months before the claim. Nothing in these terms
                    limits liability that can&apos;t be limited by law.
                </p>
            </>
        ),
    },
    {
        id: "law",
        title: "Governing law",
        body: (
            <p>
                These terms are governed by the laws of India. The courts of {PLATFORM.jurisdiction} have exclusive jurisdiction over any dispute about them.
                If you&apos;re a consumer in another country, you keep any rights your local law gives you that can&apos;t be waived.
            </p>
        ),
    },
    {
        id: "changes",
        title: "Changes to these terms",
        body: (
            <p>
                We may update these terms. We&apos;ll show the new date at the top and, for significant changes, tell account holders by email or in the app
                before they take effect. If you keep using the Service after that, the new terms apply.
            </p>
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

export default function TermsPage() {
    return (
        <LegalPage
            title="Terms of Service"
            updated={UPDATED}
            summary={
                <>
                    <strong>In short:</strong> use Genesoft ERP lawfully for your business, keep your account secure, and pay for the plan you choose. Your
                    data stays yours. You can cancel anytime, and your first payment comes with a 7-day money-back guarantee. Marketing emails are opt-in.
                </>
            }
            sections={sections}
        />
    )
}
