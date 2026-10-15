import Link from "next/link"
import { LegalPage, type LegalSection } from "@/components/marketing/legal-page"
import { PLATFORM } from "@/lib/constants/platform"

export const metadata = {
    title: "Privacy Policy | Genesoft ERP",
    description: "How Genesoft Infotech collects, uses and protects personal data in Genesoft ERP, including marketing email consent.",
}

const UPDATED = "14 October 2026"

const sections: LegalSection[] = [
    {
        id: "who-we-are",
        title: "Who we are",
        body: (
            <>
                <p>
                    Genesoft ERP is run by <strong>{PLATFORM.legalName}</strong> (&quot;Genesoft&quot;, &quot;we&quot;, &quot;us&quot;), {PLATFORM.address.line1},{" "}
                    {PLATFORM.address.line2}, {PLATFORM.address.country}. Website: <a href={PLATFORM.website}>genesoftinfotech.com</a>.
                </p>
                <p>This policy explains how we handle personal data when you visit our website, create an account or use Genesoft ERP.</p>
                <p>
                    We play two roles. For your <strong>account data</strong> (who you are, how you pay us) we decide how it&apos;s used. For the{" "}
                    <strong>business data</strong> you put into Genesoft ERP (your customers, invoices, employees and so on) you decide, and we process it only
                    to run the service for you.
                </p>
            </>
        ),
    },
    {
        id: "what-we-collect",
        title: "What we collect",
        body: (
            <ul>
                <li><strong>Account details:</strong> your name, work email, phone number, company name, country and currency. Passwords are handled by our sign-in provider and stored only in hashed form.</li>
                <li><strong>Business data you enter:</strong> contacts, leads, products, invoices, bills, expenses, employees, attendance and other records you choose to keep in your workspace.</li>
                <li><strong>Billing details:</strong> your plan and payment history. Card and bank details are entered with Razorpay or Stripe; we never see or store full card numbers.</li>
                <li><strong>Technical data:</strong> IP address, browser and device type, and logs of sign-ins and important actions, which we use to keep accounts secure.</li>
                <li><strong>Messages to us:</strong> what you send through our contact form, email or support tickets.</li>
            </ul>
        ),
    },
    {
        id: "how-we-use",
        title: "How we use your data",
        body: (
            <ul>
                <li>To provide Genesoft ERP: create your workspace, store your records, and send the invoices, receipts and messages you ask it to send.</li>
                <li>To bill you for your subscription and keep records our tax laws require.</li>
                <li>To keep the service secure: detect misuse, block attacks and investigate problems.</li>
                <li>To support you when you contact us.</li>
                <li>To send <strong>service emails</strong> you need, such as sign-up confirmation, password resets, payment receipts and important changes to the service.</li>
                <li>To send <strong>marketing emails</strong>, only if you&apos;ve agreed to receive them (see the next section).</li>
            </ul>
        ),
    },
    {
        id: "marketing-emails",
        title: "Marketing emails and your consent",
        body: (
            <>
                <p>
                    We send product news, tips and offers <strong>only to people who have opted in</strong>. You can opt in with the checkbox when you create an
                    account. It&apos;s not ticked for you, and you can use Genesoft ERP without it.
                </p>
                <ul>
                    <li><strong>What you&apos;ll get:</strong> new features, guides on getting more from Genesoft ERP, and occasional offers. We aim for no more than a few emails a month.</li>
                    <li><strong>Changing your mind:</strong> every marketing email has an unsubscribe link. You can also turn marketing emails off in <strong>Settings → Email preferences</strong>, or email us at <a href={`mailto:${PLATFORM.email}`}>{PLATFORM.email}</a>. Unsubscribing in the app or from an email takes effect immediately; emailed requests are handled promptly.</li>
                    <li><strong>What doesn&apos;t change:</strong> unsubscribing doesn&apos;t stop service emails such as password resets and payment receipts, which you need to use your account.</li>
                    <li><strong>Our records:</strong> we keep the date and time you gave or withdrew consent, so we can show we have your permission.</li>
                    <li>We never buy email lists, and we never give or sell your email address to anyone else for their marketing.</li>
                </ul>
            </>
        ),
    },
    {
        id: "legal-basis",
        title: "Why we're allowed to use your data",
        body: (
            <>
                <p>
                    In India we process personal data under the Digital Personal Data Protection Act, 2023: with your consent, or for the legitimate uses the
                    Act allows, such as providing the service you signed up for and meeting legal obligations.
                </p>
                <p>
                    If you&apos;re in the UK or the European Union, our legal bases are: performing our contract with you (running the service), our
                    legitimate interests (security, improving the service), your consent (marketing emails) and legal obligations (tax records).
                </p>
            </>
        ),
    },
    {
        id: "sharing",
        title: "Who we share data with",
        body: (
            <>
                <p>
                    We don&apos;t sell personal data. We share it only with providers that help us run Genesoft ERP, under contracts that protect it. For
                    data your business keeps about its own customers and staff, see our <Link href="/dpa">Data Processing Agreement</Link>.
                </p>
                <ul>
                    <li><strong>Supabase:</strong> database and sign-in.</li>
                    <li><strong>Vercel:</strong> hosting of the website and app.</li>
                    <li><strong>Resend:</strong> sending emails.</li>
                    <li><strong>Razorpay</strong> (India) and <strong>Stripe</strong> (other countries): taking payments.</li>
                    <li><strong>Meta (WhatsApp)</strong> and your own email provider: only if you connect them to send messages from your workspace.</li>
                </ul>
                <p>We may also share data if the law requires it, to protect people&apos;s safety, or as part of a merger or sale of our business (with the same protections).</p>
            </>
        ),
    },
    {
        id: "where-stored",
        title: "Where your data is stored",
        body: (
            <p>
                Your workspace data is stored in a database in Mumbai, India. Some of our providers (for hosting, email and payments) may process data in other
                countries. When that happens, we rely on their contractual safeguards to keep it protected.
            </p>
        ),
    },
    {
        id: "retention",
        title: "How long we keep it",
        body: (
            <p>
                We keep your account and workspace data while your account is open. When you close your account, we delete or anonymise it within a
                reasonable time, except records we must keep by law (for example, invoices and payment records for tax purposes). Copies in backups are
                removed as those backups expire.
            </p>
        ),
    },
    {
        id: "security",
        title: "How we protect it",
        body: (
            <ul>
                <li>All connections use HTTPS.</li>
                <li>Each company&apos;s records are kept separate, and every user has a role that limits what they can see and change.</li>
                <li>Passwords and keys you save for payment gateways, email and WhatsApp are stored encrypted.</li>
                <li>We log sign-ins and important admin actions.</li>
            </ul>
        ),
    },
    {
        id: "your-rights",
        title: "Your rights",
        body: (
            <>
                <p>You can ask us to:</p>
                <ul>
                    <li>tell you what personal data we hold about you and give you a copy,</li>
                    <li>correct data that&apos;s wrong or incomplete,</li>
                    <li>delete your data (unless we must keep it by law),</li>
                    <li>stop marketing emails or withdraw any consent you&apos;ve given,</li>
                    <li>under India&apos;s DPDP Act, nominate someone to exercise these rights for you if you can&apos;t, and</li>
                    <li>if you&apos;re in the UK or EU, restrict or object to some processing and move your data to another provider.</li>
                </ul>
                <p>
                    Email <a href={`mailto:${PLATFORM.email}`}>{PLATFORM.email}</a> to use any of these rights. If your request is about business data a
                    company stores about you in its workspace (for example, you&apos;re one of its customers), we&apos;ll pass it to that company, which decides.
                </p>
            </>
        ),
    },
    {
        id: "cookies",
        title: "Cookies",
        body: (
            <p>
                We use only the cookies needed to keep you signed in and to remember basic preferences, such as light or dark mode. We don&apos;t use
                advertising or cross-site tracking cookies. The <Link href="/cookie-policy">Cookie Policy</Link> lists each one.
            </p>
        ),
    },
    {
        id: "children",
        title: "Children",
        body: <p>Genesoft ERP is a business service for people aged 18 and over. We don&apos;t knowingly collect data from children.</p>,
    },
    {
        id: "grievance",
        title: "Grievance Officer",
        body: (
            <>
                <p>If you have a concern about how we handle your data, contact our Grievance Officer:</p>
                <p>
                    Grievance Officer, {PLATFORM.legalName}<br />
                    {PLATFORM.address.line1}, {PLATFORM.address.line2}<br />
                    Email: <a href={`mailto:${PLATFORM.email}`}>{PLATFORM.email}</a>
                </p>
                <p>
                    We&apos;ll acknowledge your complaint and respond within the time the law requires. If you&apos;re not satisfied, you can complain to
                    the Data Protection Board of India or, in the UK or EU, your local data protection authority.
                </p>
            </>
        ),
    },
    {
        id: "changes",
        title: "Changes to this policy",
        body: (
            <p>
                We&apos;ll update this page when our practices change and show the new date at the top. If a change is significant, we&apos;ll tell
                account holders by email or in the app before it takes effect. See also our <Link href="/terms">Terms of Service</Link> and{" "}
                <Link href="/refund-policy">Refund &amp; Cancellation Policy</Link>.
            </p>
        ),
    },
]

export default function PrivacyPage() {
    return (
        <LegalPage
            title="Privacy Policy"
            updated={UPDATED}
            summary={
                <>
                    <strong>In short:</strong> we collect what we need to run Genesoft ERP and bill you. Your business data belongs to you. We don&apos;t sell
                    personal data. We send marketing emails only if you opt in, and you can stop them anytime.
                </>
            }
            sections={sections}
        />
    )
}
