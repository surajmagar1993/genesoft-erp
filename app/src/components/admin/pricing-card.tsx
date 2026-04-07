"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CreditCard } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { updatePricingPlan } from "@/app/actions/saas/admin"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function PricingCard({ plan }: { plan: any }) {
    const [amount, setAmount] = useState(plan.amount?.toString() || "0")
    const [isActive, setIsActive] = useState(plan.isActive)
    const [isLoading, setIsLoading] = useState(false)

    const handleUpdate = async () => {
        try {
            setIsLoading(true)
            await updatePricingPlan(plan.id, {
                amount: parseFloat(amount),
                isActive,
            })
            toast.success(`${plan.tier} plan updated successfully`)
        } catch (error) {
            toast.error("Failed to update plan")
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className="relative overflow-hidden border-primary/10 shadow-lg group hover:shadow-xl transition-all duration-300">
            <div className={cn(
                "absolute top-0 left-0 w-full h-1",
                plan.tier === "ENTERPRISE" ? "bg-gradient-to-r from-primary to-indigo-600" :
                plan.tier === "PRO" ? "bg-primary" : "bg-muted"
            )} />
            <CardHeader className="bg-muted/30">
                <div className="flex items-center justify-between">
                    <Badge variant={isActive ? "default" : "secondary"} className="text-[10px] h-5 transition-colors">
                        {isActive ? "Live" : "Inactive"}
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
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
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
                    <Switch 
                        checked={isActive} 
                        onCheckedChange={setIsActive} 
                    />
                </div>
            </CardContent>
            <CardFooter className="bg-muted/10 border-t justify-end p-4">
                <Button 
                    size="sm" 
                    onClick={handleUpdate}
                    disabled={isLoading}
                    className="font-bold tracking-tight shadow-md hover:scale-105 transition-transform"
                >
                    {isLoading ? "Updating..." : `Update ${plan.tier}`}
                </Button>
            </CardFooter>
        </Card>
    )
}
