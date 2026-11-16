"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
    Dialog,
    DialogClose,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
    ModalSurface,
} from "@/components/ui/dialog"

/** A confirmation on the native <dialog> (see dialog.tsx). Unlike Dialog, a click outside never closes it. */
const AlertDialog = Dialog
const AlertDialogTrigger = DialogTrigger

function AlertDialogContent({ className, ...props }: React.ComponentProps<typeof ModalSurface>) {
    return (
        <ModalSurface
            role="alertdialog"
            dismissOnOutsideClick={false}
            className={cn(
                "m-auto grid w-full max-w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto gap-4 border bg-background p-6 text-foreground shadow-lg sm:max-w-lg sm:rounded-lg",
                className
            )}
            {...props}
        />
    )
}

const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
)

const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
)

const AlertDialogTitle = ({ className, ...props }: React.ComponentProps<typeof DialogTitle>) => (
    <DialogTitle className={cn("text-lg font-semibold leading-normal", className)} {...props} />
)

const AlertDialogDescription = DialogDescription

/** Runs its onClick, then closes (as Radix did). Call event.preventDefault() in onClick to keep it open. */
const AlertDialogAction = ({ className, ...props }: React.ComponentProps<typeof DialogClose>) => (
    <DialogClose className={cn(buttonVariants(), className)} {...props} />
)

const AlertDialogCancel = ({ className, ...props }: React.ComponentProps<typeof DialogClose>) => (
    <DialogClose className={cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0", className)} {...props} />
)

export {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogFooter,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogAction,
    AlertDialogCancel,
}
