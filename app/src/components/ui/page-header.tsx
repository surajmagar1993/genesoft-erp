import React from "react"
import { Button } from "@/components/ui/button"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
  icon?: LucideIcon
  className?: string
  action?: {
    label: string
    onClick: () => void
    icon?: LucideIcon
    variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  }
}

export function PageHeader({
  title,
  description,
  children,
  icon: Icon,
  className,
  action
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8", className)}>
      <div className="flex items-start gap-4">
        {Icon && (
          <div className="hidden md:flex h-12 w-12 rounded-2xl bg-primary/10 items-center justify-center text-primary group transition-all hover:bg-primary hover:text-white">
            <Icon className="h-6 w-6" />
          </div>
        )}
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground text-sm font-medium">
              {description}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {children}
        {action && (
          <Button 
            onClick={action.onClick} 
            variant={action.variant || "default"}
            className="shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all"
          >
            {action.icon && <action.icon className="mr-2 h-4 w-4" />}
            {action.label}
          </Button>
        )}
      </div>
    </div>
  )
}
