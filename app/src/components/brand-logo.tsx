import Image from "next/image"
import { cn } from "@/lib/utils"

/**
 * The Genesoft Infotech wordmark. header.png has dark lettering for white
 * backgrounds, logo.png white lettering for dark ones. "auto" follows the
 * app's light/dark theme. Both files are 3499 × 1425.
 */
export function BrandLogo({
    on = "auto",
    className,
    priority,
}: {
    /** The background the logo sits on */
    on?: "light" | "dark" | "auto"
    /** Set the height (e.g. "h-10"); the width follows */
    className?: string
    priority?: boolean
}) {
    const img = (src: string, extra?: string) => (
        <Image
            src={src}
            alt="Genesoft Infotech"
            width={3499}
            height={1425}
            // Shown at most ~56px tall (≈140px wide): without this the browser downloads the 3840px version
            sizes="140px"
            priority={priority}
            className={cn("h-10 w-auto select-none", className, extra)}
        />
    )
    if (on === "light") return img("/header.png")
    if (on === "dark") return img("/logo.png")
    return (
        <>
            {img("/header.png", "dark:hidden")}
            {img("/logo.png", "hidden dark:block")}
        </>
    )
}
