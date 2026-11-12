import { AdminShell } from "./admin-shell"

// Every Super Admin page reads live platform data for the signed-in admin
export const dynamic = "force-dynamic"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return <AdminShell>{children}</AdminShell>
}
