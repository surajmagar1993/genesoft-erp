import { getPricingPlans, updatePricingPlan } from "@/app/actions/saas/admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Building2, Calendar, MoreHorizontal, UserCheck, UserX, Clock, ChevronRight, CreditCard, Globe } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"

export default async function PricingPage() {
    const plans = await getPricingPlans()

    // Grouping by region for better organization
    const regions = Array.from(new Set<string>(plans.map((p: any) => p.regionCode as string)))

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Global Pricing Engine</h1>
                <p className="text-muted-foreground text-lg max-w-3xl">
                    Configure regional subscription rates and currency tokens for Genesoft SaaS tiers.
                </p>
            </div>

            <div className="grid gap-12">
                {regions.map((region: string) => (
                    <div key={region} className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Globe className="h-6 w-6 text-primary" />
                            <h2 className="text-2xl font-bold text-foreground">Region: {region}</h2>
                            <Separator className="flex-1" />
                        </div>

                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                            {plans.filter((p: any) => p.regionCode === region).map((plan: any) => (
                                <Card key={plan.id} className="relative overflow-hidden border-primary/10 shadow-lg group hover:shadow-xl transition-all duration-300">
                                    <div className={cn(
                                        "absolute top-0 left-0 w-full h-1",
                                        plan.tier === "ENTERPRISE" ? "bg-gradient-to-r from-primary to-indigo-600" :
                                        plan.tier === "PRO" ? "bg-primary" : "bg-muted"
                                    )} />
                                    <CardHeader className="bg-muted/30">
                                        <div className="flex items-center justify-between">
                                            <Badge variant={plan.isActive ? "default" : "secondary"} className="text-[10px] h-5">
                                                {plan.isActive ? "Live" : "Inactive"}
                                            </Badge>
                                            <CreditCard className="h-4 w-4 text-muted-foreground opacity-50" />
                                        </div>
                                        <CardTitle className="text-lg font-black tracking-tight mt-1">{plan.tier}</CardTitle>
                                        <CardDescription>Gateway: {plan.gateway}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-6 space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                                                Monthly Price ({plan.currency})
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <div className="relative flex-1">
                                                    <span className="absolute left-3 top-2.5 text-muted-foreground font-semibold">
                                                        {plan.currency === 'INR' ? '₹' : 
                                                         plan.currency === 'USD' ? '$' : 
                                                         plan.currency === 'AED' ? 'د.إ' : 
                                                         plan.currency === 'GBP' ? '£' : ''}
                                                    </span>
                                                    <Input 
                                                        defaultValue={plan.amount?.toString()} 
                                                        className="pl-8 font-bold text-lg border-primary/10 bg-muted/20"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-primary/5">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-foreground">Visibility</span>
                                                <span className="text-[10px] text-muted-foreground">Show in dashboard</span>
                                            </div>
                                            <Switch defaultChecked={plan.isActive} />
                                        </div>
                                    </CardContent>
                                    <CardFooter className="bg-muted/10 border-t justify-end p-4">
                                        <Button size="sm" className="font-bold tracking-tight shadow-md hover:scale-105 transition-transform">
                                            Update {plan.tier}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ')
}
