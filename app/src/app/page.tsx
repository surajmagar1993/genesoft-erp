import Link from "next/link";
import Image from "next/image";
import { 
  ArrowRight, 
  CheckCircle2, 
  BarChart3, 
  Users2, 
  Zap, 
  Globe2, 
  ShieldCheck, 
  Layers
} from "lucide-react";
import { PublicNavbar } from "@/components/marketing/navbar";
import { PublicFooter } from "@/components/marketing/footer";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-slate-950 font-sans selection:bg-orange-100 selection:text-orange-900">
      <PublicNavbar />

      <main className="flex-1 pt-20 overflow-hidden">
        {/* --- HERO SECTION --- */}
        <section className="relative pt-20 pb-24 md:pt-32 md:pb-40 overflow-hidden">
          {/* Background Elements */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-500/10 dark:bg-orange-950/20 rounded-full blur-[120px] pointer-events-none -z-10" />
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none -z-10" />

          <div className="container mx-auto px-4 md:px-6 relative text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-900/30 border border-orange-100 dark:border-orange-800/50 text-orange-600 dark:text-orange-400 text-xs font-bold uppercase tracking-widest mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
               <span className="flex h-2 w-2 rounded-full bg-orange-600 animate-pulse" />
               New: CRM 2.0 is live
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-8 max-w-4xl mx-auto leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-1000">
              The OS for <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-orange-400">High-Growth</span> Indian Businesses.
            </h1>
            
            <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-12 duration-1200">
              Genesoft combines CRM, ERP, and Sales into one seamless platform. Built specifically for the Indian market with GST compliance and multi-currency support.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 animate-in fade-in slide-in-from-bottom-16 duration-1500">
              <Link 
                href="/register" 
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-full bg-orange-600 text-white text-lg font-semibold hover:bg-orange-700 hover:shadow-2xl hover:shadow-orange-600/30 transition-all active:scale-95 group"
              >
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href="/pricing" 
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-full bg-white dark:bg-transparent border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-lg font-semibold hover:bg-slate-50 dark:hover:bg-slate-900 transition-all active:scale-95"
              >
                View Pricing
              </Link>
            </div>

            {/* Dashboard Mockup */}
            <div className="relative max-w-6xl mx-auto group animate-in zoom-in-95 fade-in duration-1500">
              <div className="absolute -inset-4 bg-gradient-to-r from-orange-500 to-orange-400 rounded-3xl blur-[40px] opacity-20 group-hover:opacity-30 transition-opacity" />
              <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden aspect-[16/9] md:aspect-[21/9]">
                <Image 
                  src="/header.png" 
                  alt="Genesoft CRM Dashboard" 
                  fill
                  className="object-cover opacity-90 group-hover:scale-105 transition-transform duration-1000"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent pointer-events-none" />
              </div>
            </div>
          </div>
        </section>

        {/* --- LOGO STRIP --- */}
        <section className="bg-slate-50 dark:bg-slate-900/50 py-12 border-y border-slate-100 dark:border-slate-800/50">
          <div className="container mx-auto px-4">
             <p className="text-center text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-8">
               Trusted by Leading Enterprises
             </p>
             <div className="flex flex-wrap items-center justify-center gap-12 md:gap-24 opacity-60 grayscale hover:grayscale-0 transition-all">
                {/* Mock Logo Icons */}
                <div className="flex items-center gap-2 font-bold text-slate-500 text-xl"><Globe2 className="w-8 h-8 text-blue-500" /> TATA</div>
                <div className="flex items-center gap-2 font-bold text-slate-500 text-xl"><Layers className="w-8 h-8 text-indigo-500" /> RELIANCE</div>
                <div className="flex items-center gap-2 font-bold text-slate-500 text-xl"><Zap className="w-8 h-8 text-yellow-500" /> WIPRO</div>
                <div className="flex items-center gap-2 font-bold text-slate-500 text-xl"><BarChart3 className="w-8 h-8 text-orange-500" /> INFOSYS</div>
             </div>
          </div>
        </section>

        {/* --- FEATURES GRID --- */}
        <section id="features" className="py-24 md:py-32 bg-white dark:bg-slate-950">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto mb-20">
               <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
                 Everything You Need to <span className="text-orange-500">Scale</span>.
               </h2>
               <p className="text-lg text-slate-500 dark:text-slate-400">
                 Integrated modules that work together to eliminate data silos and manual processes.
               </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="group p-8 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-orange-500/30 hover:shadow-2xl transition-all duration-300">
                 <div className="w-14 h-14 rounded-2xl bg-orange-600/10 flex items-center justify-center mb-6 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                   <Users2 className="w-7 h-7 text-orange-600 group-hover:text-white transition-colors" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Intelligent CRM</h3>
                 <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                    Manage leads, deals, and contacts with ease. Automated follow-ups and pipeline tracking to close deals faster.
                 </p>
                 <ul className="space-y-3">
                   {["Lead Scoring", "Email Tracking", "Sales Pipeline"].map(it => (
                     <li key={it} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                       <CheckCircle2 className="w-4 h-4 text-green-500" /> {it}
                     </li>
                   ))}
                 </ul>
              </div>

              {/* Feature 2 */}
              <div className="group p-8 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-blue-500/30 hover:shadow-2xl transition-all duration-300">
                 <div className="w-14 h-14 rounded-2xl bg-blue-600/10 flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                   <BarChart3 className="w-7 h-7 text-blue-600 group-hover:text-white transition-colors" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Modern ERP</h3>
                 <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                    Inventory, Invoicing, and GST reports in one place. Real-time updates across multiple warehouses.
                 </p>
                 <ul className="space-y-3">
                   {["GST Invoicing", "Multi-Warehouse", "Ledger Logs"].map(it => (
                     <li key={it} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                       <CheckCircle2 className="w-4 h-4 text-green-500" /> {it}
                     </li>
                   ))}
                 </ul>
              </div>

              {/* Feature 3 */}
              <div className="group p-8 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-purple-500/30 hover:shadow-2xl transition-all duration-300">
                 <div className="w-14 h-14 rounded-2xl bg-purple-600/10 flex items-center justify-center mb-6 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                   <ShieldCheck className="w-7 h-7 text-purple-600 group-hover:text-white transition-colors" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Secure & Scalable</h3>
                 <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                    Bank-grade security with 99.9% uptime. Your data is encrypted and backed up in real-time.
                 </p>
                 <ul className="space-y-3">
                   {["ISO Certified", "OAuth 2.0 Auth", "Daily Backups"].map(it => (
                     <li key={it} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                       <CheckCircle2 className="w-4 h-4 text-green-500" /> {it}
                     </li>
                   ))}
                 </ul>
              </div>
            </div>
          </div>
        </section>

        {/* --- STATS SECTION --- */}
        <section className="py-20 md:py-32 bg-orange-600 dark:bg-orange-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-20 opacity-10 pointer-events-none">
             <Globe2 className="w-64 h-64 text-white" />
          </div>
          <div className="container mx-auto px-4">
             <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
                <div>
                   <div className="text-4xl md:text-6xl font-black mb-2 tracking-tight">10K+</div>
                   <div className="text-orange-100 text-sm font-semibold uppercase tracking-wider">Happy Users</div>
                </div>
                <div>
                   <div className="text-4xl md:text-6xl font-black mb-2 tracking-tight">500+</div>
                   <div className="text-orange-100 text-sm font-semibold uppercase tracking-wider">Enterprises</div>
                </div>
                <div>
                   <div className="text-4xl md:text-6xl font-black mb-2 tracking-tight">99.9%</div>
                   <div className="text-orange-100 text-sm font-semibold uppercase tracking-wider">Uptime SLA</div>
                </div>
                <div>
                   <div className="text-4xl md:text-6xl font-black mb-2 tracking-tight">24/7</div>
                   <div className="text-orange-100 text-sm font-semibold uppercase tracking-wider">Expert Support</div>
                </div>
             </div>
          </div>
        </section>

        {/* --- FINAL CTA --- */}
        <section className="py-24 md:py-40 bg-white dark:bg-slate-950 flex items-center justify-center text-center px-4">
          <div className="relative z-10 max-w-4xl">
             <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white mb-8 leading-tight">
               Ready to Modernize Your <span className="text-orange-600 underline underline-offset-8 decoration-orange-600/30">Business Flow</span>?
             </h2>
             <p className="text-xl text-slate-500 dark:text-slate-400 mb-12 max-w-2xl mx-auto">
               Join 500+ businesses and start your 14-day free trial today. No credit card required.
             </p>
             <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link 
                  href="/register" 
                  className="w-full sm:w-auto px-10 py-5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold text-lg hover:scale-105 active:scale-95 transition-all shadow-xl"
                >
                  Create Your Account
                </Link>
                <Link 
                  href="/contact" 
                  className="w-full sm:w-auto px-10 py-5 rounded-full border-2 border-slate-900 dark:border-white text-slate-900 dark:text-white font-bold text-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
                >
                  Schedule a Demo
                </Link>
             </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
