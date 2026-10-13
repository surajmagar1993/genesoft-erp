"use client"

import { createContext, useContext, type ReactNode } from "react"

// Mirrors the role ladder enforced on the server in src/lib/get-tenant-id.ts.
// This only hides UI; the server actions are the real check.
const RANK: Record<string, number> = { VIEWER: 0, USER: 1, MANAGER: 2, ADMIN: 3, SUPER_ADMIN: 4 }

export type MinRole = "USER" | "MANAGER" | "ADMIN"

// null while loading: render as USER so day-to-day buttons don't flicker
const RoleContext = createContext<string | null>(null)

export function RoleProvider({ role, children }: { role: string | null; children: ReactNode }) {
    return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>
}

export function useRole() {
    const role = useContext(RoleContext)
    const rank = RANK[role ?? "USER"] ?? RANK.USER
    return {
        role,
        can: (min: MinRole) => rank >= RANK[min],
    }
}

/** Renders children only when the current user has at least `min` role. */
export function RequireRole({ min, children, fallback = null }: { min: MinRole; children: ReactNode; fallback?: ReactNode }) {
    const { can } = useRole()
    return <>{can(min) ? children : fallback}</>
}
