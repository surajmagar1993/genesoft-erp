import Link from "next/link"
import { MessageCircle } from "lucide-react"
import { whatsappHref } from "@/lib/constants/platform"
import { getSiteSettings } from "@/lib/site-cms"

const WA_TEXT = "Hello Genesoft Infotech, I'd like to know more."

/** Floating WhatsApp button (tablets and desktops). */
export async function WhatsAppButton() {
    const { whatsapp } = await getSiteSettings()
    return (
        <a
            href={whatsappHref(whatsapp, WA_TEXT)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat with us on WhatsApp"
            className="fixed bottom-6 right-6 z-40 hidden h-14 w-14 items-center justify-center rounded-full bg-s-whatsapp text-white shadow-lg shadow-black/20 transition-transform hover:scale-105 md:flex"
        >
            <MessageCircle className="h-7 w-7" />
        </a>
    )
}

/** Bar fixed to the bottom of phones: Get a quote + WhatsApp. */
export async function PhoneActionBar() {
    const { whatsapp } = await getSiteSettings()
    return (
        <>
            <div className="h-[72px] md:hidden" aria-hidden="true" />
            <div className="fixed inset-x-0 bottom-0 z-40 flex h-[72px] gap-2.5 border-t border-s-border bg-s-card px-4 py-3 md:hidden">
                <Link href="/contact" className="flex flex-1 items-center justify-center rounded-[10px] bg-s-orange font-bold text-s-on-orange">
                    Get a quote
                </Link>
                <a
                    href={whatsappHref(whatsapp, WA_TEXT)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-2 rounded-[10px] bg-s-whatsapp font-bold text-white"
                >
                    <MessageCircle className="h-5 w-5" aria-hidden="true" /> WhatsApp
                </a>
            </div>
        </>
    )
}
