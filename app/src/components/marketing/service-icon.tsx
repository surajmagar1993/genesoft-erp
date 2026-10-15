import { Code2, Headset, Laptop, Megaphone, type LucideProps } from "lucide-react"
import type { ServiceIcon as ServiceIconName } from "@/lib/site-content"

const ICONS = { code: Code2, megaphone: Megaphone, laptop: Laptop, headset: Headset }

export function ServiceIcon({ name, ...props }: { name: ServiceIconName } & LucideProps) {
    const Icon = ICONS[name]
    return <Icon aria-hidden="true" {...props} />
}
