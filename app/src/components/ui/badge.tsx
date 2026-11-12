import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "bg-destructive text-white focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40 [a&]:hover:bg-destructive/90",
        outline:
          "border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  onClick,
  onKeyDown,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"
  // A badge used as a filter or toggle behaves like a button for keyboard and screen readers
  const clickable = !!onClick && !asChild

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), clickable && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
      onClick={onClick}
      {...(clickable
        ? {
            role: "button",
            tabIndex: 0,
            "aria-pressed": variant === "default",
            onKeyDown: (event: React.KeyboardEvent<HTMLSpanElement>) => {
              onKeyDown?.(event)
              if (!event.defaultPrevented && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault()
                event.currentTarget.click()
              }
            },
          }
        : { onKeyDown })}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
