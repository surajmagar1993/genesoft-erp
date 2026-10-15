import type { SOCIAL_NETWORKS } from "@/lib/site-cms-shared"

/** Simple line icons for the social links (no brand artwork). */
export function SocialIcon({ network }: { network: (typeof SOCIAL_NETWORKS)[number] }) {
    const p = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true }
    switch (network) {
        case "LinkedIn":
            return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7" /></svg>
        case "Instagram":
            return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><path d="M17.5 6.5v.01" /></svg>
        case "Facebook":
            return <svg {...p}><path d="M15 3h-2a4 4 0 0 0-4 4v3H7v4h2v7h4v-7h3l1-4h-4V7a1 1 0 0 1 1-1h2z" /></svg>
        case "YouTube":
            return <svg {...p}><rect x="2" y="5" width="20" height="14" rx="4" /><path d="m10 9 5 3-5 3z" /></svg>
        default:
            return <svg {...p}><path d="M4 4l16 16M20 4 4 20" /></svg>
    }
}
