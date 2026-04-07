"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

export function UserProfileEmail() {
    const [userEmail, setUserEmail] = useState<string>("Loading...")

    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(({ data: { user } }: { data: { user: any } }) => {
            if (user) setUserEmail(user.email || "Unknown User")
            else setUserEmail("Not Logged In")
        })
    }, [])

    return <>{userEmail}</>
}
