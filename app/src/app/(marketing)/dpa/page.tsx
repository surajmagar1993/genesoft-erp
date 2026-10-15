import Link from "next/link"
import { LegalPage, type LegalSection } from "@/components/marketing/legal-page"
import { PLATFORM } from "@/lib/constants/platform"

export const metadata = {
    title: "Data Processing Agreement | Genesoft ERP",
    description: "How Genesoft Infotech processes the personal data your business keeps in Genesoft ERP, on your instructions.",
}

const UPDATED = "15 October 2026"

/** Providers that process customer data for us. Keep in step with the Privacy Policy. */
const SUBPROCESSORS = [
    { name: "Supabase", purpose: "Database and sign-in", location: "Mumbai, India" },
    { name: "Vercel", purpose: "Hosting the website and app", location: "Global network" },
    { name: "Resend", purpose: "Sending emails from the service", location: "United States" },
    { name: "Razorpay", purpose: "Subscription payments (India)", location: "India" },
    { name: "Stripe", purpose: "Subscription payments (other countries)", location: "United States and other countries" },
]

const sections: LegalSection[] = [
    {
        id: "scope",
        title: "What this agreement covers",
        body: (
            <>
                <p>
                    This Data Processing Agreement (&quot;DPA&quot;) is part of our <Link href="/terms">Terms of Service</Link>. It applies when your
                    business (&quot;you&quot;) stores personal data about other people in Genesoft ERP: for example your customers, suppliers, leads and
                    employees (&quot;Customer Data&quot;).
                </p>
                <p>
                    For Customer Data you are the controller (or data fiduciary) and {PLATFORM.legalName} (&quot;we&quot;) is your processor. You don&apos;t
                    need to sign anything: this DPA applies automatically while you use the service.
                </p>
            </>
        ),
    },
    {
        id: "instructions",
        title: "We only act on your instructions",
        body: (
            <p>
                We process Customer Data only to provide Genesoft ERP to you, as set out in the Terms and in what you do in your workspace (for example
                sending an invoice by email or WhatsApp). We don&apos;t sell Customer Data or use it for advertising. If the law requires us to process it
                in another way, we&apos;ll tell you first unless the law forbids it.
            </p>
        ),
    },
    {
        id: "details",
        title: "What data and why",
        body: (
            <ul>
                <li><strong>People:</strong> your customers, suppliers, leads, employees and team members.</li>
                <li><strong>Data:</strong> names, contact details, addresses, tax IDs, transaction and payment records, and HR and payroll records you enter.</li>
                <li><strong>Purpose:</strong> running your CRM, sales, purchasing, inventory, accounting, HR and payroll in Genesoft ERP.</li>
                <li><strong>Duration:</strong> while you have a workspace, plus the deletion period below.</li>
            </ul>
        ),
    },
    {
        id: "responsibilities",
        title: "Your responsibilities",
        body: (
            <p>
                You make sure you&apos;re allowed to put Customer Data into Genesoft ERP (for example, that you have a lawful basis or consent) and that
                you give people any notices the law requires. Don&apos;t store special categories of data (such as health records) unless you need to
                and the law allows it.
            </p>
        ),
    },
    {
        id: "staff",
        title: "Confidentiality",
        body: <p>Only people who need access to run or support the service can reach Customer Data, and they are bound to keep it confidential.</p>,
    },
    {
        id: "security",
        title: "Security",
        body: (
            <>
                <p>We protect Customer Data with measures that include:</p>
                <ul>
                    <li>Encrypted connections (HTTPS) between your browser and the service.</li>
                    <li>Each business&apos;s records kept separate, with checks on every request.</li>
                    <li>Roles and per-module access, set by your own workspace admin.</li>
                    <li>Passwords for email, payment and messaging connections stored encrypted.</li>
                    <li>Records of administrator actions and monitoring for errors.</li>
                </ul>
            </>
        ),
    },
    {
        id: "subprocessors",
        title: "Subprocessors",
        body: (
            <>
                <p>You agree that we may use these providers to run the service. Each is bound by a contract that protects the data:</p>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full min-w-[480px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-3 py-2 font-semibold">Provider</th>
                                <th className="px-3 py-2 font-semibold">What for</th>
                                <th className="px-3 py-2 font-semibold">Where</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {SUBPROCESSORS.map((s) => (
                                <tr key={s.name}>
                                    <td className="px-3 py-2.5 font-medium text-slate-900">{s.name}</td>
                                    <td className="px-3 py-2.5">{s.purpose}</td>
                                    <td className="px-3 py-2.5">{s.location}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p>
                    If you connect your own WhatsApp Business account or email server, those are your providers, not ours. We&apos;ll update this list
                    before adding a new subprocessor; if you object for a good reason, you can close your workspace.
                </p>
            </>
        ),
    },
    {
        id: "transfers",
        title: "International transfers",
        body: (
            <p>
                Your workspace data is stored in India. Some subprocessors may process data in other countries; when they do, we rely on their contractual
                safeguards (such as standard contractual clauses) to protect it.
            </p>
        ),
    },
    {
        id: "assistance",
        title: "Helping you with requests",
        body: (
            <p>
                If someone asks you to see, correct, export or delete their data, you can usually do it yourself in your workspace (Settings → Data &amp;
                Account exports everything). Where you can&apos;t, we&apos;ll help. If we receive such a request directly, we&apos;ll pass it to you.
            </p>
        ),
    },
    {
        id: "breaches",
        title: "Data breaches",
        body: (
            <p>
                If we become aware of a breach affecting Customer Data, we&apos;ll tell you without undue delay and give you the information we have, so
                you can meet any duty to notify authorities or people.
            </p>
        ),
    },
    {
        id: "deletion",
        title: "Deletion at the end",
        body: (
            <p>
                You can export your data at any time. When you close your workspace you have 30 days to change your mind; after that we delete Customer
                Data, except records the law requires us to keep.
            </p>
        ),
    },
    {
        id: "audits",
        title: "Information and audits",
        body: (
            <p>
                We&apos;ll answer reasonable questions about how we protect Customer Data so you can show you meet the law. Email{" "}
                <a href={`mailto:${PLATFORM.email}`}>{PLATFORM.email}</a>.
            </p>
        ),
    },
    {
        id: "order",
        title: "If documents disagree",
        body: (
            <p>
                If this DPA and the Terms of Service conflict about Customer Data, this DPA wins. Our <Link href="/privacy">Privacy Policy</Link> covers
                the personal data we handle for ourselves, such as your account details.
            </p>
        ),
    },
]

export default function DpaPage() {
    return (
        <LegalPage
            title="Data Processing Agreement"
            updated={UPDATED}
            summary={
                <>
                    <strong>In short:</strong> the data your business keeps in Genesoft ERP is yours. We process it only to run the service for you, keep it
                    secure, use a short list of providers, and delete it when you leave.
                </>
            }
            sections={sections}
        />
    )
}
