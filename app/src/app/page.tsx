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
  Layers,
  Hammer,
  ShoppingCart,
  Briefcase,
  Building2
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

          <div className="container mx-auto px-4 md:px-6 relative text-center pt-8">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-8 max-w-4xl mx-auto leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-1000">
              One Unified Platform.<br />Engineered for <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-orange-400">Global Operations</span>.
            </h1>
            
            <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-12 duration-1200">
              Genesoft consolidates CRM pipelines, localized tax compliance, and multi-currency accounting ledgers into a secure, row-level isolated system. Accelerate growth and orchestrate operations across borders without friction.
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
            <div className="relative max-w-5xl mx-auto group animate-in zoom-in-95 fade-in duration-1500">
              <div className="absolute -inset-4 bg-gradient-to-r from-orange-500 to-orange-400 rounded-3xl blur-[40px] opacity-20 group-hover:opacity-30 transition-opacity" />
              <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl overflow-hidden p-3 md:p-6">
                
                {/* Mockup Header Bar */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-900 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-400" />
                    <span className="w-3 h-3 rounded-full bg-yellow-400" />
                    <span className="w-3 h-3 rounded-full bg-green-400" />
                    <div className="ml-4 h-6 w-36 md:w-48 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center px-3 gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                      <span className="text-[10px] text-slate-400 font-mono truncate">workspace-live-usd</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-24 bg-slate-100 dark:bg-slate-900 rounded-full hidden sm:block" />
                    <div className="h-7 w-7 rounded-full bg-slate-200 dark:bg-slate-800" />
                  </div>
                </div>

                {/* Mockup Main Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-left">
                  {/* Mock Sidebar */}
                  <div className="hidden md:block col-span-1 space-y-2 border-r border-slate-100 dark:border-slate-900 pr-4">
                    <div className="h-8 bg-orange-600/10 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400 rounded-lg flex items-center px-3 gap-2 text-xs font-bold">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-600" /> CRM Overview
                    </div>
                    {["Accounts Ledger", "GST/VAT Compliance", "Billing & Quotes", "Team Workflows", "Operations Panel"].map(item => (
                      <div key={item} className="h-8 hover:bg-slate-50 dark:hover:bg-slate-900/50 rounded-lg flex items-center px-3 text-xs font-medium text-slate-500 dark:text-slate-400 transition-colors">
                        {item}
                      </div>
                    ))}
                  </div>

                  {/* Mock Workspace Panel */}
                  <div className="col-span-1 md:col-span-3 space-y-6">
                    {/* Mock Mini KPIs */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100/50 dark:border-slate-800/50">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Global Revenue</p>
                        <p className="text-sm md:text-lg font-black text-slate-900 dark:text-white">$142,850</p>
                        <span className="text-[9px] text-green-500 font-bold">+12.4% this mo</span>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100/50 dark:border-slate-800/50">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Active Pipeline</p>
                        <p className="text-sm md:text-lg font-black text-slate-900 dark:text-white">342 Deals</p>
                        <span className="text-[9px] text-green-500 font-bold">+8.2% conversion</span>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100/50 dark:border-slate-800/50">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Outstanding AR</p>
                        <p className="text-sm md:text-lg font-black text-slate-900 dark:text-white">$12,400</p>
                        <span className="text-[9px] text-amber-500 font-bold">14 overdue bills</span>
                      </div>
                    </div>

                    {/* Mock Graph & Recent Transactions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Visual Chart Graphic */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100/50 dark:border-slate-800/50 flex flex-col justify-between h-48">
                        <div>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Revenue Growth Trend</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">Multi-currency consolidated</p>
                        </div>
                        {/* Mock SVG Line Chart */}
                        <div className="h-24 w-full flex items-end">
                          <svg viewBox="0 0 100 30" className="w-full h-full text-orange-500 overflow-visible" preserveAspectRatio="none">
                            <defs>
                              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="rgb(249, 115, 22)" stopOpacity="0.2"/>
                                <stop offset="100%" stopColor="rgb(249, 115, 22)" stopOpacity="0.0"/>
                              </linearGradient>
                            </defs>
                            <path d="M0,25 Q15,10 30,18 T60,5 T90,8 T100,2" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                            <path d="M0,25 Q15,10 30,18 T60,5 T90,8 T100,2 L100,30 L0,30 Z" fill="url(#chartGrad)" />
                          </svg>
                        </div>
                      </div>

                      {/* Recent Activities */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100/50 dark:border-slate-800/50 flex flex-col justify-between h-48">
                        <div>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Recent Transactions</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">Updated 1m ago</p>
                        </div>
                        <div className="space-y-2 mt-2">
                          {[
                            { name: "Enterprise Client", type: "B2B Sales Invoice", val: "+$4,200", status: "Paid", col: "bg-green-500/10 text-green-600 dark:text-green-400" },
                            { name: "Consulting Partner", type: "Consulting Quote", val: "$1,850", status: "Pending", col: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
                            { name: "SaaS Subscription", type: "Subscription Bill", val: "+$950", status: "Paid", col: "bg-green-500/10 text-green-600 dark:text-green-400" }
                          ].map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-[11px] border-b border-slate-100 dark:border-slate-800/50 pb-1.5">
                              <div>
                                <p className="font-bold text-slate-800 dark:text-slate-200">{item.name}</p>
                                <p className="text-[9px] text-slate-400">{item.type}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-slate-800 dark:text-slate-200">{item.val}</p>
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${item.col}`}>{item.status}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

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
                    Inventory, invoicing, and localized tax reports in one place. Real-time updates across multiple warehouses and regions.
                 </p>
                 <ul className="space-y-3">
                   {["GST & VAT Invoicing", "Multi-Warehouse Tracking", "Hierarchical Ledger Logs"].map(it => (
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

        {/* --- SOLUTIONS SECTION --- */}
        <section id="solutions" className="py-24 md:py-32 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto mb-20">
               <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
                 Tailored Solutions for <span className="text-orange-500">Every Vertical</span>.
               </h2>
               <p className="text-lg text-slate-500 dark:text-slate-400">
                 Genesoft adapts to your industry-specific compliance rules, workflows, and transaction scales natively.
               </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
              {/* Manufacturing */}
              <div id="solutions-manufacturing" className="group p-8 md:p-10 rounded-[2.5rem] bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 hover:border-orange-500/30 hover:shadow-2xl transition-all duration-300">
                 <div className="w-14 h-14 rounded-2xl bg-orange-600/10 flex items-center justify-center mb-6 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                   <Hammer className="w-7 h-7 text-orange-600 group-hover:text-white transition-colors" />
                 </div>
                 <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Manufacturing & Production</h3>
                 <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                    Streamline your workshop or factory operations. Build multi-level Bills of Materials (BoM), monitor active routings, manage shop-floor work orders, and automate inventory staging.
                 </p>
                 <div className="flex flex-wrap gap-2">
                   {["Bills of Materials", "Shop floor control", "Routing schedules", "Inventory staging"].map(tag => (
                     <span key={tag} className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800">
                       {tag}
                     </span>
                   ))}
                 </div>
              </div>

              {/* Retail & POS */}
              <div id="solutions-retail" className="group p-8 md:p-10 rounded-[2.5rem] bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 hover:border-blue-500/30 hover:shadow-2xl transition-all duration-300">
                 <div className="w-14 h-14 rounded-2xl bg-blue-600/10 flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                   <ShoppingCart className="w-7 h-7 text-blue-600 group-hover:text-white transition-colors" />
                 </div>
                 <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Retail & POS Integration</h3>
                 <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                    Accelerate over-the-counter checkouts. Manage complex retail customer groups (VIP, Wholesale, retail), enforce customer credit limits dynamically, and track sales statements through unified customer ledgers.
                 </p>
                 <div className="flex flex-wrap gap-2">
                   {["Fast Checkout", "Credit Limits", "Customer Ledgers", "VIP & Wholesale split"].map(tag => (
                     <span key={tag} className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800">
                       {tag}
                     </span>
                   ))}
                 </div>
              </div>

              {/* Service Industry */}
              <div id="solutions-services" className="group p-8 md:p-10 rounded-[2.5rem] bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 hover:border-purple-500/30 hover:shadow-2xl transition-all duration-300">
                 <div className="w-14 h-14 rounded-2xl bg-purple-600/10 flex items-center justify-center mb-6 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                   <Briefcase className="w-7 h-7 text-purple-600 group-hover:text-white transition-colors" />
                 </div>
                 <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Professional Service Industry</h3>
                 <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                    Scale your consulting, agency, or subscription business. Set up a service catalog, generate high-fidelity estimations and quotes, and automate recurring billings with custom region codes and tax compliance.
                 </p>
                 <div className="flex flex-wrap gap-2">
                   {["Estimates & Quotes", "Service Catalog", "Recurring Billing", "HSN/SAC splits"].map(tag => (
                     <span key={tag} className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800">
                       {tag}
                     </span>
                   ))}
                 </div>
              </div>

              {/* Enterprise ERP */}
              <div id="solutions-enterprise" className="group p-8 md:p-10 rounded-[2.5rem] bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 hover:border-emerald-500/30 hover:shadow-2xl transition-all duration-300">
                 <div className="w-14 h-14 rounded-2xl bg-emerald-600/10 flex items-center justify-center mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                   <Building2 className="w-7 h-7 text-emerald-600 group-hover:text-white transition-colors" />
                 </div>
                 <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Enterprise Multi-Country ERP</h3>
                 <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                    Consolidate global subsidiaries in a single workspace. Establish hierarchical Charts of Accounts, operate across dozens of currencies with automated conversions, and maintain zero-leak data governance using Row-Level Security (RLS).
                 </p>
                 <div className="flex flex-wrap gap-2">
                   {["Global Chart of Accounts", "Multi-Currency Ledger", "Row-Level Isolation", "Role-Based RBAC"].map(tag => (
                     <span key={tag} className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800">
                       {tag}
                     </span>
                   ))}
                 </div>
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
