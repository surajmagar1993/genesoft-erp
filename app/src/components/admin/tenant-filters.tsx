"use client"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"

export function TenantFilters() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()

    function updateQuery(key: string, value: string) {
        const params = new URLSearchParams(searchParams.toString())
        if (value && value !== "ALL") {
            params.set(key, value)
        } else {
            params.delete(key)
        }
        
        startTransition(() => {
            router.push(`?${params.toString()}`)
        })
    }

    return (
        <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search businesses or emails..." 
                    className="pl-10 bg-card/50"
                    defaultValue={searchParams.get("search") || ""}
                    onChange={(e) => {
                        const val = e.target.value
                        // Simple debounce-like behavior can be added but for now direct is fine
                        const timer = setTimeout(() => updateQuery("search", val), 500)
                        return () => clearTimeout(timer)
                    }}
                />
            </div>
            
            <Select 
                defaultValue={searchParams.get("plan") || "ALL"} 
                onValueChange={(val) => updateQuery("plan", val)}
            >
                <SelectTrigger className="w-full md:w-[180px] bg-card/50">
                    <SelectValue placeholder="Filter by Plan" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="ALL">All Plans</SelectItem>
                    <SelectItem value="FREE">Free</SelectItem>
                    <SelectItem value="BASIC">Basic</SelectItem>
                    <SelectItem value="PRO">Pro</SelectItem>
                    <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                </SelectContent>
            </Select>

            <Select 
                defaultValue={searchParams.get("status") || "ALL"} 
                onValueChange={(val) => updateQuery("status", val)}
            >
                <SelectTrigger className="w-full md:w-[150px] bg-card/50">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="ALL">All Status</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
                </SelectContent>
            </Select>

            {isPending && (
                <div className="flex items-center text-xs text-muted-foreground animate-pulse">
                    Updating...
                </div>
            )}
        </div>
    )
}
