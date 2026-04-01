"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { clearSystemLogs } from "@/app/actions/saas/admin"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function PruneLogsButton() {
    const [isPending, setIsPending] = useState(false)
    const router = useRouter()

    const handlePrune = async () => {
        if (!confirm("Are you sure you want to delete all system logs? This action cannot be undone.")) {
            return
        }

        setIsPending(true)
        try {
            await clearSystemLogs()
            toast.success("All system logs have been pruned")
            router.refresh()
        } catch (error) {
            toast.error("Failed to prune logs")
        } finally {
            setIsPending(false)
        }
    }

    return (
        <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePrune} 
            disabled={isPending}
            className="h-10 px-4 gap-2 text-xs font-bold border-rose-500/20 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 transition-all"
        >
            <Trash2 className="h-3.5 w-3.5" />
            {isPending ? "Pruning..." : "Prune Logs"}
        </Button>
    )
}
