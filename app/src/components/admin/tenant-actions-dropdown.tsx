"use client"

import { useState } from "react"
import { Building2, Calendar, MoreHorizontal, UserCheck, UserX, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { toggleTenantStatus, extendTenantTrial, updateTenantPlan } from "@/app/actions/saas/admin"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function TenantActionsDropdown({ tenant }: { tenant: any }) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const handleExtendTrial = async () => {
        try {
            setIsLoading(true)
            await extendTenantTrial(tenant.id, 7) // +7 days
            toast.success("Trial extended by 7 days")
            router.refresh()
        } catch (error) {
            console.error(error)
            toast.error("Failed to extend trial")
        } finally {
            setIsLoading(false)
        }
    }

    const handleToggleStatus = async () => {
        try {
            setIsLoading(true)
            await toggleTenantStatus(tenant.id, !tenant.isActive)
            toast.success(`Tenant ${tenant.isActive ? 'suspended' : 'activated'} successfully`)
            router.refresh()
        } catch (error) {
            console.error(error)
            toast.error("Failed to update status")
        } finally {
            setIsLoading(false)
        }
    }

    const handleUpgradePlan = async () => {
        try {
            setIsLoading(true)
            await updateTenantPlan(tenant.id, "PRO") // Assuming PRO upgrade for now
            toast.success("Tenant upgraded to PRO")
            router.refresh()
        } catch (error) {
            console.error(error)
            toast.error("Failed to update plan")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                    disabled={isLoading}
                >
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Tenant Control</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 focus:bg-primary/5 cursor-pointer">
                    <Building2 className="h-4 w-4 opacity-70" />
                    View Details
                </DropdownMenuItem>
                <DropdownMenuItem 
                    className="gap-2 focus:bg-primary/5 cursor-pointer"
                    onClick={handleExtendTrial}
                >
                    <Calendar className="h-4 w-4 opacity-70" />
                    Extend Trial (+7d)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                    className="gap-2 text-amber-600 focus:text-amber-600 focus:bg-amber-50 cursor-pointer dark:focus:bg-amber-950"
                    onClick={handleUpgradePlan}
                >
                    <CreditCard className="h-4 w-4 opacity-70" />
                    Upgrade to PRO
                </DropdownMenuItem>
                <DropdownMenuItem 
                    className={tenant.isActive ? "text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950 gap-2 cursor-pointer" : "text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50 dark:focus:bg-emerald-950 gap-2 cursor-pointer"}
                    onClick={handleToggleStatus}
                >
                    {tenant.isActive ? (
                        <>
                            <UserX className="h-4 w-4 opacity-70" />
                            Suspend Account
                        </>
                    ) : (
                        <>
                            <UserCheck className="h-4 w-4 opacity-70" />
                            Activate Account
                        </>
                    )}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
