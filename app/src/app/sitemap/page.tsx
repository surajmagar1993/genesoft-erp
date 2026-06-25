import Link from "next/link";
import { PublicNavbar } from "@/components/marketing/navbar";
import { PublicFooter } from "@/components/marketing/footer";

export default function SitemapPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <PublicNavbar />

      <main className="flex-1 pt-32 pb-24">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 md:p-16 shadow-xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-2 leading-tight">
              HTML <span className="text-orange-600">Sitemap</span>.
            </h1>
            <p className="text-sm text-slate-400 dark:text-slate-500">Overview of all public routes</p>
            
            <hr className="border-slate-100 dark:border-slate-800" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-slate-700 dark:text-slate-300">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Marketing Pages</h3>
                <ul className="space-y-3">
                  <li><Link href="/" className="hover:text-orange-600 transition-colors">Home Page / Features</Link></li>
                  <li><Link href="/pricing" className="hover:text-orange-600 transition-colors">Pricing & Plans</Link></li>
                  <li><Link href="/contact" className="hover:text-orange-600 transition-colors">Contact Support</Link></li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Authentication Routes</h3>
                <ul className="space-y-3">
                  <li><Link href="/login" className="hover:text-orange-600 transition-colors">Client Login</Link></li>
                  <li><Link href="/register" className="hover:text-orange-600 transition-colors">Register / Onboard</Link></li>
                  <li><Link href="/forgot-password" className="hover:text-orange-600 transition-colors">Reset Password</Link></li>
                </ul>
              </div>

              <div className="md:col-span-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Legal & Governance</h3>
                <ul className="space-y-3">
                  <li><Link href="/privacy" className="hover:text-orange-600 transition-colors">Privacy Policy</Link></li>
                  <li><Link href="/terms" className="hover:text-orange-600 transition-colors">Terms of Service</Link></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
