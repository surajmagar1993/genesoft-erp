import { PublicNavbar } from "@/components/marketing/navbar";
import { PublicFooter } from "@/components/marketing/footer";

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <PublicNavbar />

      <main className="flex-1 pt-32 pb-24">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 md:p-16 shadow-xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-2 leading-tight">
              Privacy <span className="text-orange-600">Policy</span>.
            </h1>
            <p className="text-sm text-slate-400 dark:text-slate-500">Last Updated: April 10, 2026</p>
            
            <hr className="border-slate-100 dark:border-slate-800" />

            <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-slate-600 dark:text-slate-300">
              <p className="leading-relaxed">
                At Genesoft Infotech Private Limited ("Genesoft", "we", "us", "our"), we prioritize your privacy. This Privacy Policy details how we collect, store, share, and protect your information when you subscribe to our multi-tenant SaaS ERP & CRM application hosted at <a href="https://genesoftinfotech.com" className="text-orange-600 hover:underline">genesoftinfotech.com</a>.
              </p>

              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4">1. Information We Collect and Process</h2>
              <p className="leading-relaxed">
                We collect personal information such as full name, work email address, billing phone number, company registration data (including GSTIN, Tax Registration Numbers, or Corporate Registry Codes depending on your jurisdiction), and credit card/billing transactions. Additionally, we process database records uploaded by you (including your contacts, leads, customer transactions, bill items, and financial ledgers) strictly for the purpose of rendering the SaaS ERP service.
              </p>

              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4">2. Row-Level Security & Tenant Data Isolation</h2>
              <p className="leading-relaxed">
                Our database architecture strictly enforces database-level Row-Level Security (RLS) policies. Every client environment is assigned a unique `tenant_id`. All read, write, update, and delete queries run with context-aware tenant filters. This mathematical isolation guarantees that your company's records are completely inaccessible by any other tenant user.
              </p>

              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4">3. Regulatory Compliance (GDPR, CCPA, DPDP Act)</h2>
              <p className="leading-relaxed">
                We align our data processing with major global standards:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>GDPR (EU)</strong>: You have the right to request deletion ("Right to be Forgotten"), access, or rectification of your personal data. Genesoft acts as the "Data Processor" and you act as the "Data Controller" for uploaded ERP files.</li>
                <li><strong>CCPA (USA)</strong>: We do not sell or monetize personal information or business logs. You may opt out of third-party analytical cookies.</li>
                <li><strong>DPDP Act (India)</strong>: We process business records strictly under valid agreements for authorized corporate activities. Data is purged upon contract expiry.</li>
              </ul>

              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4">4. Sub-Processors and Integrations</h2>
              <p className="leading-relaxed">
                To run our global services, we integrate with secure processors:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Supabase / AWS</strong>: Encrypted database hosting and row-level routing.</li>
                <li><strong>Razorpay / Stripe</strong>: Payment gate gateways (we do not store raw card numbers on our servers).</li>
                <li><strong>Resend</strong>: Transactional notification emails.</li>
              </ul>

              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4">5. Security Standards and Data Breaches</h2>
              <p className="leading-relaxed">
                All data in transit is protected using TLS 1.3 encryption. Passwords and API tokens are processed via secure hashing algorithms. In the rare event of a data breach, we will notify affected tenant administrators within 72 hours of verification.
              </p>

              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4">6. Data Protection Officer (DPO)</h2>
              <p className="leading-relaxed">
                If you have questions regarding data privacy, compliance audits, or data export requests, please contact our Data Protection Officer at:
                <br />
                <strong>Email:</strong> <a href="mailto:hello@genesoftinfotech.com" className="text-orange-600 hover:underline">hello@genesoftinfotech.com</a>
                <br />
                <strong>Address:</strong> Shivtirtha Bungalow Lane 15, Khese Park Lohegaon Pune, Maharashtra, India 411032.
              </p>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
