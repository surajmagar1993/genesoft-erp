import { PublicNavbar } from "@/components/marketing/navbar";
import { PublicFooter } from "@/components/marketing/footer";

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <PublicNavbar />

      <main className="flex-1 pt-32 pb-24">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 md:p-16 shadow-xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-2 leading-tight">
              Terms of <span className="text-orange-600">Service</span>.
            </h1>
            <p className="text-sm text-slate-400 dark:text-slate-500">Last Updated: April 10, 2026</p>
            
            <hr className="border-slate-100 dark:border-slate-800" />

            <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-slate-600 dark:text-slate-300">
              <p className="leading-relaxed">
                By subscribing to, registering an account for, or interacting with the Genesoft ERP & CRM application hosted at <a href="https://genesoftinfotech.com" className="text-orange-600 hover:underline">genesoftinfotech.com</a>, you agree to comply with and be bound by the following Terms of Service.
              </p>

              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4">1. Scope of Services & Multi-Country Use</h2>
              <p className="leading-relaxed">
                Genesoft Infotech Private Limited ("Genesoft") grants you a non-exclusive, non-transferable, revocable license to access our platform solely for your business operations. The services support multi-country localizations including currency conversions, dynamic tax calculations (GST, VAT, Sales Tax), and warehouse controls. You are responsible for ensuring that your usage of Genesoft matches your local municipal, state, and national compliance regulations.
              </p>

              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4">2. Subscription Billing, Fees & Disputes</h2>
              <p className="leading-relaxed">
                SaaS services are billed on a recurring basis (monthly or annual cycles) as detailed on our <a href="/pricing" className="text-orange-600 hover:underline">Pricing page</a>. We offer a 15-day free trial. If a subscription is not renewed or fails to process, write access to your tenant directory will be restricted. Billing disputes must be lodged in writing with our billing department at <a href="mailto:info@genesoftinfotech.com" className="text-orange-600 hover:underline">info@genesoftinfotech.com</a> within 30 days of the invoice date.
              </p>

              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4">3. Data Integrity & Prohibited Content</h2>
              <p className="leading-relaxed">
                You retain complete ownership of all data uploaded to your tenant workspace. You represent and warrant that you own or have the necessary licenses to process all uploaded customer information. You agree not to upload any data that violates local laws, contains malware, or constitutes intellectual property infringement.
              </p>

              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4">4. Uptime Commitments & Support SLA</h2>
              <p className="leading-relaxed">
                We make commercially reasonable efforts to maintain an application uptime of 99.9%. Maintenance windows are scheduled during off-peak weekend hours and communicated via email notification. Support levels (ranging from standard support email queues to dedicated priority account managers) are determined by your paid pricing tier.
              </p>

              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4">5. Limitation of Liability & Warranties</h2>
              <p className="leading-relaxed">
                Genesoft is provided on an "as-is" and "as-available" basis without any express or implied warranties. In no event shall Genesoft Infotech Private Limited be liable for any indirect, incidental, or consequential damages (including loss of business profits, data, or operational interruptions) arising out of the use of our SaaS software.
              </p>

              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4">6. Governing Law and Jurisdiction</h2>
              <p className="leading-relaxed">
                These Terms of Service shall be governed by and construed in accordance with the laws of India. Any legal action or dispute arising under these terms shall be subject to the exclusive jurisdiction of the competent courts in Pune, Maharashtra, India.
              </p>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
