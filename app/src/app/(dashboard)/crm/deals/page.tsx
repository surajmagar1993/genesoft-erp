import { createClient } from "@/lib/supabase/server"
import DealsClient from "./DealsClient"

export default async function DealsPage() {
    const supabase = await createClient()
    const { data: deals } = await supabase
        .from("deals")
        .select("*")
        .order("created_at", { ascending: false })

    return <DealsClient initialDeals={deals || []} />
}
