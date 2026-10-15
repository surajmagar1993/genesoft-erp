import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { hasModuleAccess } from "@/lib/get-tenant-id"
import { fireWorkflowEvent } from "@/lib/workflow-engine"

/** Who may act for any employee (not only themselves): HR edit access or more. */
export async function canActForAnyEmployee(): Promise<boolean> {
    return hasModuleAccess("hr", "EDIT")
}

/**
 * The employee record linked to the signed-in user (by userId, then email).
 */
export async function findOwnEmployeeId(tenantId: string): Promise<string | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const own = await prisma.employee.findFirst({
        where: { tenantId, OR: [{ userId: user.id }, ...(user.email ? [{ email: user.email }] : [])] },
        select: { id: true },
    })
    return own?.id ?? null
}

/**
 * Self-service actions act on the caller's own employee record. People with
 * HR edit access (and admins) may act for any employee in the workspace.
 */
export async function assertCanActForEmployee(tenantId: string, employeeId: string): Promise<void> {
    if (await canActForAnyEmployee()) {
        const count = await prisma.employee.count({ where: { id: employeeId, tenantId } })
        if (!count) throw new Error("Employee not found")
        return
    }
    if ((await findOwnEmployeeId(tenantId)) !== employeeId) {
        throw new Error("You can only do this for your own employee record.")
    }
}

/** Fires the LEAVE_REQUESTED workflow event for a new leave request. */
export async function fireLeaveRequested(
    tenantId: string,
    leaveId: string,
    employeeId: string,
    leaveType: string,
    daysCount: number
): Promise<void> {
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, tenantId }, select: { displayName: true } })
    fireWorkflowEvent(tenantId, "LEAVE_REQUESTED", {
        employeeName: employee?.displayName ?? null,
        leaveType,
        daysCount,
    }, leaveId)
}
