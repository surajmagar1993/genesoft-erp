"use client"

import { createContext, useContext, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { isAdminRole, moduleForPath, type AccessLevel, type ModuleAccess } from "@/lib/access"

// Mirrors the checks enforced on the server in src/lib/get-tenant-id.ts.
// This only hides UI; the server actions are the real check.
const RANK: Record<string, number> = { VIEWER: 0, USER: 1, MANAGER: 2, ADMIN: 3, SUPER_ADMIN: 4 }

/** A member's module level, expressed as the role ladder the buttons use. */
const LEVEL_ROLE: Record<AccessLevel, string> = { NONE: "VIEWER", VIEW: "VIEWER", EDIT: "USER", FULL: "MANAGER" }

export type MinRole = "USER" | "MANAGER" | "ADMIN"

interface RoleState {
    role: string | null
    access: ModuleAccess | null
}

// null while loading: render as USER so day-to-day buttons don't flicker
const RoleContext = createContext<RoleState>({ role: null, access: null })

export function RoleProvider({ role, access = null, children }: { role: string | null; access?: ModuleAccess | null; children: ReactNode }) {
    return <RoleContext.Provider value={{ role, access }}>{children}</RoleContext.Provider>
}

export function useRole() {
    const { role, access } = useContext(RoleContext)
    const pathname = usePathname()
    // On a module page, a member's buttons follow their access to that module
    const module = moduleForPath(pathname || "")
    const effective = role && !isAdminRole(role) && access && module ? LEVEL_ROLE[access[module]] : role
    const rank = RANK[effective ?? "USER"] ?? RANK.USER
    return {
        role,
        access,
        can: (min: MinRole) => rank >= RANK[min],
    }
}

/** Renders children only when the current user has at least `min` role. */
export function RequireRole({ min, children, fallback = null }: { min: MinRole; children: ReactNode; fallback?: ReactNode }) {
    const { can } = useRole()
    return <>{can(min) ? children : fallback}</>
}
