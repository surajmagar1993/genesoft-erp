"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, CreditCard, Sparkles, Zap, Shield } from "lucide-react"
import { createRazorpayOrder, verifyRazorpayPayment } from "@/app/actions/saas/razorpay"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface BillingTabProps {
  settings: any
}

const PRICING_PLANS = [
  {
    name: "FREE",
    price: "₹0",
    description: "Start your journey with essential ERP tools.",
    features: ["Max 5 Contacts", "Max 10 Invoices/mo", "Single User", "Basic Reports"],
    buttonText: "Current Plan",
    disabled: true,
    color: "bg-slate-500",
    icon: <Zap className="h-5 w-5" />,
  },
  {
    name: "BASIC",
    price: "₹999",
    description: "Perfect for growing small businesses.",
    features: ["Unlimited Contacts", "Unlimited Invoices", "3 Team Members", "Advanced GST Reports", "Email Support"],
    buttonText: "Upgrade to Basic",
    disabled: false,
    color: "bg-blue-600",
    icon: <Sparkles className="h-5 w-5" />,
  },
  {
    name: "PRO",
    price: "₹2499",
    description: "The complete suite for professional teams.",
    features: ["All Basic Features", "Multi-Warehouse", "HR & Payroll", "Inventory Management", "24/7 Priority Support"],
    buttonText: "Upgrade to Pro",
    disabled: false,
    popular: true,
    color: "bg-primary",
    icon: <Shield className="h-5 w-5" />,
  }
]

import { createCheckoutSession, createPortalSession } from "@/app/actions/saas/stripe"

export default function BillingTab({ settings }: BillingTabProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()
  const currentPlan = settings?.plan || "FREE"
  const isINR = settings?.currency_code === "INR" || settings?.currencyCode === "INR"

  const handlePortal = async () => {
    setLoading("portal")
    try {
      const { url } = await createPortalSession()
      if (url) window.location.href = url
    } catch (err) {
      toast.error("Failed to open billing portal")
    } finally {
      setLoading(null)
    }
  }

  const handleSubscription = async (plan: typeof PRICING_PLANS[0]) => {
    try {
      setLoading(plan.name)
      
      // Razorpay Path (Unified for both Domestic and International)
      const amount = parseInt(plan.price.replace("₹", ""))
      const currency = isINR ? "INR" : (settings?.currency_code || settings?.currencyCode || "INR")
      
      const order = await createRazorpayOrder(amount, settings.id, plan.name, currency)

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_placeholder",
        amount: order.amount,
        currency: order.currency,
        name: "Genesoft ERP",
        description: `Upgrade to ${plan.name} Plan`,
        order_id: order.id,
        handler: async function (response: any) {
          try {
            await verifyRazorpayPayment(
              order.id,
              response.razorpay_payment_id,
              response.razorpay_signature,
              settings.id,
              plan.name
            )
            toast.success(`Successfully upgraded to ${plan.name}!`)
            router.refresh()
          } catch (err) {
            toast.error("Payment verification failed. Please contact support.")
          }
        },
        prefill: {
          name: settings.name,
          email: settings.email,
        },
        theme: { color: "#2563eb" },
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    } catch (error) {
      console.error(error)
      toast.error("Failed to initiate payment. Please try again.")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Plan Summary Header */}
      <Card className="border-primary/20 bg-primary/5 relative overflow-hidden backdrop-blur-sm">
        <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12">
            <CreditCard className="h-24 w-24" />
        </div>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                Your Current Plan: <Badge variant="secondary" className="text-lg font-mono px-3 py-1 bg-primary/20 text-primary">{currentPlan}</Badge>
              </CardTitle>
              <CardDescription className="text-muted-foreground font-medium">
                {settings?.isTrial ? `Trialing until ${new Date(settings.trialEndsAt).toLocaleDateString()}` : "Your subscription is active and recurring."}
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
               {/* Stripe Portal Hidden until Account is active */}
               {/* {!isINR && (
                 <Button variant="outline" size="sm" onClick={handlePortal} disabled={loading === 'portal'}>
                    <CreditCard className="w-4 h-4 mr-2" /> 
                    {loading === 'portal' ? 'Opening...' : 'Manage Subscription'}
                 </Button>
               )} */}
               {settings?.isTrial && settings?.trialEndsAt && (
                  <div className="text-right">
                      <p className="text-[10px] uppercase font-black text-primary/60 tracking-widest">Days Remaining</p>
                      <p className="text-2xl font-black text-primary leading-none">
                          {Math.max(0, Math.ceil((new Date(settings.trialEndsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}
                      </p>
                  </div>
               )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PRICING_PLANS.map((plan) => {
          const isCurrent = plan.name === currentPlan
          
          return (
            <Card key={plan.name} className={`flex flex-col relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${plan.popular ? 'border-primary shadow-lg ring-2 ring-primary/20' : 'border-border/50'}`}>
              {plan.popular && (
                <div className="absolute top-0 right-0">
                  <div className="bg-primary text-primary-foreground text-[10px] font-black uppercase px-6 py-1 rotate-45 translate-x-4 translate-y-2 shadow-sm">
                    Popular
                  </div>
                </div>
              )}
              
              <CardHeader>
                <div className={`h-12 w-12 rounded-2xl ${plan.color} flex items-center justify-center text-white mb-4 shadow-lg shadow-primary/10`}>
                  {plan.icon}
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-black tracking-tight">{plan.price}</span>
                  <span className="text-muted-foreground font-medium">/month</span>
                </div>
                <CardDescription className="pt-2 min-h-[48px] leading-relaxed italic opacity-80">
                  {plan.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1 space-y-4 pt-4">
                <div className="h-px bg-border/50 w-full" />
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm group">
                      <div className="mt-1 rounded-full bg-emerald-500/10 p-0.5">
                        <Check className="h-3 w-3 text-emerald-500 stroke-[3]" />
                      </div>
                      <span className="text-muted-foreground group-hover:text-foreground transition-colors cursor-default">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="pt-6">
                <Button 
                  className={`w-full font-bold h-11 shadow-md transition-all ${plan.popular ? 'bg-primary hover:bg-primary/90' : 'bg-muted/80 backdrop-blur-sm'}`}
                  variant={plan.popular ? "default" : "outline"}
                  disabled={isCurrent || plan.disabled || (loading !== null)}
                  onClick={() => handleSubscription(plan)}
                >
                  {loading === plan.name ? "Processing..." : isCurrent ? "Active Plan" : plan.buttonText}
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground py-4 flex items-center justify-center gap-2">
        <Shield className="h-3 w-3" /> Secure payments powered by Razorpay. All cards accepted.
      </p>
    </div>
  )
}
