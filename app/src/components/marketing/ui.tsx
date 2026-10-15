import Link from "next/link"
import { cn } from "@/lib/utils"

/**
 * Small building blocks for the public website, all on the .site tokens
 * (globals.css) so they work in light and dark. Buttons: one orange primary
 * per group, with dark text (white on this orange is too faint).
 */
type Variant = "primary" | "secondary" | "dark" | "onOrange"

const VARIANTS: Record<Variant, string> = {
    primary: "bg-s-orange text-s-on-orange font-bold hover:brightness-95",
    secondary: "border border-s-border-strong text-s-ink font-semibold hover:bg-s-band",
    dark: "bg-s-on-orange text-white font-bold hover:brightness-110",
    onOrange: "border-2 border-s-on-orange text-s-on-orange font-bold hover:bg-black/10",
}

export function SiteButton({
    href,
    variant = "primary",
    className,
    children,
    external,
}: {
    href: string
    variant?: Variant
    className?: string
    children: React.ReactNode
    external?: boolean
}) {
    const cls = cn(
        "inline-flex h-[52px] items-center justify-center gap-2 rounded-[10px] px-6 text-base transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-s-orange focus-visible:ring-offset-2",
        VARIANTS[variant],
        className
    )
    return external ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
            {children}
        </a>
    ) : (
        <Link href={href} className={cls}>
            {children}
        </Link>
    )
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
    return <span className={cn("text-[13px] font-bold uppercase tracking-[0.08em] text-s-orange-text", className)}>{children}</span>
}

export function H1({ children, className }: { children: React.ReactNode; className?: string }) {
    return <h1 className={cn("text-balance font-display text-4xl font-bold leading-[1.08] tracking-tight text-s-ink md:text-5xl xl:text-6xl", className)}>{children}</h1>
}

export function H2({ children, className }: { children: React.ReactNode; className?: string }) {
    return <h2 className={cn("text-balance font-display text-3xl font-bold tracking-tight text-s-ink xl:text-4xl", className)}>{children}</h2>
}

export function Lead({ children, className }: { children: React.ReactNode; className?: string }) {
    return <p className={cn("text-lg leading-relaxed text-s-text xl:text-xl", className)}>{children}</p>
}

/** Form field classes */
export const fieldClass =
    "h-[46px] w-full rounded-[10px] border border-s-border-strong bg-s-card px-3.5 text-[15px] text-s-ink placeholder:text-s-muted focus:border-s-orange focus:outline-none focus:ring-2 focus:ring-s-orange/30"
export const textareaClass =
    "w-full rounded-[10px] border border-s-border-strong bg-s-card px-3.5 py-3 text-[15px] text-s-ink placeholder:text-s-muted focus:border-s-orange focus:outline-none focus:ring-2 focus:ring-s-orange/30"
export const labelClass = "flex flex-col gap-1.5 text-sm font-semibold text-s-ink"
