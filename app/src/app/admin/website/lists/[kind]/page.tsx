import Link from "next/link"
import { notFound } from "next/navigation"
import { listItemsAdmin } from "@/app/actions/website"
import { ITEM_KINDS, itemKindDef, type ItemKind } from "@/lib/site-cms-shared"
import { cn } from "@/lib/utils"
import { ItemsClient } from "./ItemsClient"

export const dynamic = "force-dynamic"

export default async function WebsiteListPage({ params }: { params: Promise<{ kind: string }> }) {
    const { kind } = await params
    const def = itemKindDef(kind)
    if (!def) notFound()
    const items = await listItemsAdmin(kind as ItemKind)
    return (
        <div className="mx-auto max-w-6xl space-y-5 px-4 pb-12">
            <div className="border-b pb-5">
                <h1 className="text-2xl font-bold tracking-tight">Lists</h1>
                <p className="text-sm text-muted-foreground">Shown on the website only when published{def.confirmLabel ? " and confirmed" : ""}.</p>
            </div>
            <nav aria-label="Lists" className="flex flex-wrap gap-1.5">
                {ITEM_KINDS.map((k) => (
                    <Link
                        key={k.kind}
                        href={`/admin/website/lists/${k.kind}`}
                        aria-current={k.kind === kind ? "page" : undefined}
                        className={cn("rounded-md px-3 py-1.5 text-sm", k.kind === kind ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-muted")}
                    >
                        {k.label}
                    </Link>
                ))}
            </nav>
            <ItemsClient kind={def.kind} items={items} />
        </div>
    )
}
