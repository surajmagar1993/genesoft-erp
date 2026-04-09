import Link from "next/link";
import { Check, ArrowRight, Zap, Shield, Globe } from "lucide-react";
import { PublicNavbar } from "@/components/marketing/navbar";
import { PublicFooter } from "@/components/marketing/footer";
import { prisma } from "@/lib/prisma";
import { Plan } from "@prisma/client";

async function getPricingPlans() {
  try {
    const plans = await prisma.pricingPlan.findMany({
      where: { regionCode: "IN", isActive: true },
      orderBy: { amount: "asc" }
    });
    return plans;
  } catch (error) {
    console.error("Failed to fetch pricing plans:", error);
    return [];
  }
}

const tierFeatures = {
  [Plan.FREE]: ["5 Contacts", "Basic Invoicing", "1 User", "Standard Support"],
  [Plan.BASIC]: ["100 Contacts", "GST Invoicing", "3 Users", "Chat Support", "Inventory Tracking"],
  [Plan.PRO]: ["Unlimited Contacts", "Custom Reports", "10 Users", "Priority Support", "Multi-Warehouse", "API Access"],
  [Plan.ENTERPRISE]: ["Unlimited Everything", "Dedicated Accountant", "Custom Branding", "On-premise Support", "SLA Guarantee"]
};

const tierDescriptions = {
  [Plan.FREE]: "Perfect for freelancers and small projects.",
  [Plan.BASIC]: "Best for small brick-and-mortar businesses.",
  [Plan.PRO]: "Scale your operations with advanced ERP features.",
  [Plan.ENTERPRISE]: "Tailored solutions for large-scale corporations."
};

export default async function PricingPage() {
  const dbPlans = await getPricingPlans();
  
  // Fallback plans if seeding failed
  const plans = dbPlans.length > 0 ? dbPlans : [
    { tier: Plan.FREE, amount: 0, currency: "INR" },
    { tier: Plan.BASIC, amount: 499, currency: "INR" },
    { tier: Plan.PRO, amount: 999, currency: "INR" },
    { tier: Plan.ENTERPRISE, amount: 4999, currency: "INR" }
  ];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <PublicNavbar />

      <main className="flex-1 pt-32 pb-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white mb-6 leading-tight">
              Simple, Transparent <span className="text-orange-600">Pricing</span>.
            </h1>
            <p className="text-lg text-slate-500 dark:text-slate-400">
              Choose the plan that fits your business stage. No hidden fees or setup costs. Start growing with Genesoft today.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-24 anim-delay-500">
            {plans.map((plan: any, idx: number) => (
              <div 
                key={plan.tier}
                className={`relative group bg-white dark:bg-slate-900 rounded-3xl border ${
                   plan.tier === Plan.PRO 
                    ? "border-orange-500 shadow-2xl shadow-orange-600/10 scale-105 z-10" 
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                } p-8 transition-all hover:-translate-y-2 duration-300 animate-in fade-in slide-in-from-bottom-12 delay-${idx * 100}`}
              >
                {plan.tier === Plan.PRO && (
                   <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-orange-600 text-white text-xs font-bold rounded-full uppercase tracking-widest shadow-lg">
                      Most Popular
                   </div>
                )}

                <div className="mb-8">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-wide">{plan.tier}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-snug h-10">
                    {tierDescriptions[plan.tier as Plan]}
                  </p>
                </div>

                <div className="mb-8">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">
                      ₹{typeof plan.amount === 'number' ? plan.amount : parseFloat(plan.amount.toString())}
                    </span>
                    <span className="text-slate-500 text-sm font-medium">/mo</span>
                  </div>
                </div>

                <Link 
                  href={`/register?plan=${plan.tier}`}
                  className={`w-full inline-flex items-center justify-center py-4 rounded-2xl font-bold transition-all mb-8 shadow-sm ${
                    plan.tier === Plan.PRO 
                     ? "bg-orange-600 text-white hover:bg-orange-700 shadow-orange-600/20" 
                     : "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90"
                  }`}
                >
                  {plan.amount === 0 ? "Get Started" : "Select Plan"}
                </Link>

                <div className="space-y-4">
                  <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">What's Included:</p>
                  {(tierFeatures[plan.tier as Plan] || []).map(feature => (
                    <div key={feature} className="flex items-start gap-3">
                      <div className="mt-1 flex-shrink-0 w-4 h-4 rounded-full bg-green-500/10 flex items-center justify-center">
                         <Check className="w-3 h-3 text-green-600" />
                      </div>
                      <span className="text-sm text-slate-600 dark:text-slate-400">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Quick FAQ / trust section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 bg-white dark:bg-slate-900 rounded-[3rem] p-12 md:p-20 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
             <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-600/10 flex items-center justify-center text-orange-600">
                   <Zap className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-bold">Instant Setup</h4>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Deploy your enterprise in under 5 minutes. No infrastructure management required.</p>
             </div>
             <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-600">
                   <Shield className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-bold">Enterprise Security</h4>
                <p className="text-slate-500 dark:text-slate-400 text-sm">SOC2 Type II compliant infrastructure with end-to-end data encryption.</p>
             </div>
             <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 flex items-center justify-center text-indigo-600">
                   <Globe className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-bold">Global Ready</h4>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Built-in multi-currency and localization for businesses expanding beyond borders.</p>
             </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
