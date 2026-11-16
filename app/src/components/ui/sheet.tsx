"use client"

import * as React from "react"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  CLOSE_X,
  Dialog,
  DialogClose,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  ModalSurface,
} from "@/components/ui/dialog"

/** A side panel on the native <dialog> (see dialog.tsx); slides in from `side` (globals.css). */
function Sheet({
  open,
  defaultOpen,
  onOpenChange,
  children,
}: React.ComponentProps<typeof Dialog> & Record<string, unknown>) {
  // Other props (callers spread their own) are ignored, as the Radix root did
  return <Dialog open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>{children}</Dialog>
}

const SheetTrigger = DialogTrigger
const SheetClose = DialogClose

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof ModalSurface> & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}) {
  return (
    <ModalSurface
      variant={`sheet-${side}`}
      data-slot="sheet-content"
      className={cn(
        "flex flex-col gap-4 border-0 bg-background p-0 text-foreground shadow-lg outline-none",
        side === "right" && "ms-auto h-dvh max-h-none w-3/4 border-l sm:max-w-sm",
        side === "left" && "me-auto h-dvh max-h-none w-3/4 border-r sm:max-w-sm",
        side === "top" && "mb-auto h-auto w-full max-w-none border-b",
        side === "bottom" && "mt-auto h-auto w-full max-w-none border-t",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogClose className={CLOSE_X}>
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </DialogClose>
      )}
    </ModalSurface>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-header" className={cn("flex flex-col gap-1.5 p-4", className)} {...props} />
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-footer" className={cn("mt-auto flex flex-col gap-2 p-4", className)} {...props} />
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof DialogTitle>) {
  return <DialogTitle className={cn("text-base leading-normal font-semibold text-foreground", className)} {...props} />
}

const SheetDescription = DialogDescription

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
