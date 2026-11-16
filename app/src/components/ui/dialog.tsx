"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { XIcon } from "lucide-react"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/*
 * Modal dialogs on the native <dialog> element (opened with showModal()): the browser gives
 * the top layer, ::backdrop, an inert page, focus containment, Esc / back-gesture closing and
 * focus return. Open/close animations are CSS (`dialog[data-ui-dialog]` in globals.css).
 * Same API as the old Radix version: <Dialog open onOpenChange> + DialogTrigger/Content/Close.
 */

type DialogState = {
  open: boolean
  setOpen: (open: boolean) => void
  titleId: string
  descId: string
  hasDesc: boolean
  setHasDesc: (has: boolean) => void
}
const DialogContext = React.createContext<DialogState | null>(null)

/** The open <dialog> element. Select, Popover, menus and tooltips portal into it, so they sit above the backdrop and aren't inert. */
export const DialogLayerContext = React.createContext<HTMLElement | null>(null)

/** For portaled menus: render into the open dialog when inside one, else into <body> */
export function useDialogLayer(): HTMLElement | undefined {
  return React.useContext(DialogLayerContext) ?? undefined
}

function useDialog(): DialogState {
  const ctx = React.useContext(DialogContext)
  if (!ctx) throw new Error("Dialog parts must be inside <Dialog>")
  return ctx
}

function Dialog({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
}: {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}) {
  const [inner, setInner] = React.useState(defaultOpen)
  const open = openProp ?? inner
  const [hasDesc, setHasDesc] = React.useState(false)
  const titleId = React.useId()
  const descId = React.useId()
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (openProp === undefined) setInner(next)
      onOpenChange?.(next)
    },
    [openProp, onOpenChange]
  )
  const value = React.useMemo(
    () => ({ open, setOpen, titleId, descId, hasDesc, setHasDesc }),
    [open, setOpen, titleId, descId, hasDesc]
  )
  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>
}

type ButtonProps = React.ComponentProps<"button"> & { asChild?: boolean }

function DialogTrigger({ asChild, onClick, ...props }: ButtonProps) {
  const { open, setOpen } = useDialog()
  const Comp = asChild ? Slot.Root : "button"
  return (
    <Comp
      data-slot="dialog-trigger"
      type={asChild ? undefined : "button"}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(e)
        if (!e.defaultPrevented) setOpen(true)
      }}
      {...props}
    />
  )
}

function DialogClose({ asChild, onClick, ...props }: ButtonProps) {
  const { setOpen } = useDialog()
  const Comp = asChild ? Slot.Root : "button"
  return (
    <Comp
      data-slot="dialog-close"
      type={asChild ? undefined : "button"}
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(e)
        if (!e.defaultPrevented) setOpen(false)
      }}
      {...props}
    />
  )
}

/** Form fields people type into; a dialog holding one doesn't close on a stray click outside */
const FORM_FIELDS = "input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([readonly]), textarea:not([readonly]), [role=combobox]"
/** An open Select / Popover / menu inside the dialog: Esc closes that first, not the dialog */
const OPEN_LAYER = "[data-radix-popper-content-wrapper]"
const EXIT_WAIT_MS = 400

function outsideBox(e: React.PointerEvent<HTMLDialogElement>) {
  const r = e.currentTarget.getBoundingClientRect()
  return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom
}

/** Toasts live in a top-layer popover (layout.tsx); re-show it so it stays above a dialog that just opened */
function raiseToasts() {
  const layer = document.getElementById("toast-layer")
  if (layer?.matches(":popover-open")) {
    layer.hidePopover()
    layer.showPopover()
  }
}

/**
 * The <dialog> itself, shared by Dialog, AlertDialog and Sheet. Mounted while open and while
 * its exit animation runs, then unmounted, so forms inside start fresh each time (as before).
 */
function ModalSurface({
  className,
  children,
  variant = "dialog",
  dismissOnOutsideClick = true,
  container,
  onPointerDown,
  onPointerUp,
  ...props
}: Omit<React.ComponentProps<"dialog">, "open"> & {
  variant?: string
  dismissOnOutsideClick?: boolean
  /** Where in the DOM to put the <dialog> (default <body>); it inherits styles from there */
  container?: HTMLElement | null
}) {
  const { open, setOpen, titleId, descId, hasDesc } = useDialog()
  const [el, setEl] = React.useState<HTMLDialogElement | null>(null)
  const [closing, setClosing] = React.useState(false)
  const [wasOpen, setWasOpen] = React.useState(open)
  const pressedOutside = React.useRef(false)

  if (wasOpen !== open) {
    setWasOpen(open)
    setClosing(!open)
  }

  React.useLayoutEffect(() => {
    if (!el) return
    if (open) {
      el.removeAttribute("data-closing")
      if (!el.open) {
        el.showModal()
        raiseToasts()
      }
      return
    }
    // Exit: keep it in the top layer while the closed styles transition, then close and unmount.
    // Done this way in every browser because Firefox/Safari can't animate `overlay`/`display` on close.
    let live = true
    el.setAttribute("data-closing", "")
    const running = el.getAnimations({ subtree: true }).map((a) => a.finished)
    Promise.race([Promise.allSettled(running), new Promise((r) => setTimeout(r, EXIT_WAIT_MS))]).then(() => {
      if (!live) return
      if (el.open) el.close()
      setClosing(false)
    })
    return () => {
      live = false
    }
  }, [open, el])

  if ((!open && !closing) || typeof document === "undefined") return null

  return createPortal(
    <DialogLayerContext.Provider value={el}>
      <dialog
        ref={setEl}
        data-ui-dialog={variant}
        aria-labelledby={titleId}
        aria-describedby={hasDesc ? descId : undefined}
        className={className}
        onCancel={(e) => {
          // Animate Esc / back-gesture closes too, and let an open Select or menu take the Esc first
          e.preventDefault()
          if (!el?.querySelector(OPEN_LAYER)) setOpen(false)
        }}
        onClose={() => {
          // Closed by the browser anyway (e.g. a repeated Esc it won't let us cancel)
          setClosing(false)
          if (open) setOpen(false)
        }}
        onPointerDown={(e) => {
          onPointerDown?.(e)
          pressedOutside.current = e.target === e.currentTarget && outsideBox(e)
        }}
        onPointerUp={(e) => {
          onPointerUp?.(e)
          // Press and release both on the backdrop, so a text-selection drag ending outside doesn't close it.
          // A click beside a form must not throw away what was typed: close with Cancel, X or Escape.
          const outside = pressedOutside.current && e.target === e.currentTarget && outsideBox(e)
          pressedOutside.current = false
          if (outside && dismissOnOutsideClick && !e.currentTarget.querySelector(FORM_FIELDS)) setOpen(false)
        }}
        {...props}
      >
        {children}
      </dialog>
    </DialogLayerContext.Provider>,
    container ?? document.body
  )
}

const CLOSE_X =
  "absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof ModalSurface> & { showCloseButton?: boolean }) {
  return (
    <ModalSurface
      data-slot="dialog-content"
      className={cn(
        // shortcut: `grid` is unconditional because the dialog is only mounted while open
        // Never taller than the screen: long forms scroll inside the dialog (phones, 400% zoom)
        "m-auto grid w-full max-w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto gap-4 rounded-lg border bg-background p-6 text-foreground shadow-lg outline-none sm:max-w-lg",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogClose className={CLOSE_X}>
          <XIcon />
          <span className="sr-only">Close</span>
        </DialogClose>
      )}
    </ModalSurface>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogClose asChild>
          <Button variant="outline">Close</Button>
        </DialogClose>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<"h2">) {
  const { titleId } = useDialog()
  return (
    <h2
      id={titleId}
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  )
}

function DialogDescription({ className, ...props }: React.ComponentProps<"p">) {
  const { descId, setHasDesc } = useDialog()
  React.useLayoutEffect(() => {
    setHasDesc(true)
    return () => setHasDesc(false)
  }, [setHasDesc])
  return (
    <p
      id={descId}
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  CLOSE_X,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  ModalSurface,
}
