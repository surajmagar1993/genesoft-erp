import { describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { createProjectInvoice } from "@/app/actions/projects"
import { actAs, createCustomer, createTestTenant } from "./helpers"

const uid = () => Math.random().toString(36).slice(2, 8)

async function setup() {
    const { tenant, user } = await createTestTenant()
    actAs(user)
    const client = await createCustomer(tenant.id, "Client Co")
    const project = await prisma.project.create({ data: { tenantId: tenant.id, projectCode: `PRJ-${uid()}`, name: "Website", clientId: client.id, budget: 100000 } as never })
    const emp = (name: string) => prisma.employee.create({ data: { tenantId: tenant.id, employeeNumber: `E-${uid()}`, firstName: name, displayName: name, email: `${name}-${uid()}@example.test` } as never })
    const asha = await emp("Asha")
    const ravi = await emp("Ravi")
    await prisma.projectMember.create({ data: { tenantId: tenant.id, projectId: project.id, employeeId: asha.id, hourlyRate: 1000 } })
    await prisma.projectMember.create({ data: { tenantId: tenant.id, projectId: project.id, employeeId: ravi.id } })
    const log = (employeeId: string, hours: number, isBillable = true) =>
        prisma.projectTimeEntry.create({ data: { tenantId: tenant.id, projectId: project.id, employeeId, workDate: new Date(), hours, isBillable, description: "Work" } as never })
    return { tenant, project, asha, ravi, log }
}

describe("project billing", () => {
    it("bills billable hours at each person's rate, once", async () => {
        const { tenant, project, asha, ravi, log } = await setup()
        await log(asha.id, 5)
        await log(asha.id, 3)
        await log(ravi.id, 2)
        await log(ravi.id, 4, false) // not billable

        // Ravi has no project rate
        const missing = await createProjectInvoice({ projectId: project.id, mode: "TIME" })
        expect(missing.error).toMatch(/hourly rate for Ravi/)

        const res = await createProjectInvoice({ projectId: project.id, mode: "TIME", defaultRate: 500 })
        expect(res.success).toBe(true)
        const inv = await prisma.invoice.findUniqueOrThrow({ where: { id: res.invoiceId! }, include: { items: true } })
        expect(inv.status).toBe("DRAFT")
        expect(Number(inv.subtotal)).toBe(8 * 1000 + 2 * 500)
        expect(inv.items).toHaveLength(2)
        expect(await prisma.projectTimeEntry.count({ where: { tenantId: tenant.id, isBilled: true } })).toBe(3)

        const again = await createProjectInvoice({ projectId: project.id, mode: "TIME", defaultRate: 500 })
        expect(again.error).toMatch(/No billable hours/)
    })

    it("fixed fee defaults to the budget not yet invoiced", async () => {
        const { project } = await setup()
        const first = await createProjectInvoice({ projectId: project.id, mode: "FEE", amount: 40000, description: "Milestone 1" })
        expect(first.success).toBe(true)
        const rest = await createProjectInvoice({ projectId: project.id, mode: "FEE" })
        const inv = await prisma.invoice.findUniqueOrThrow({ where: { id: rest.invoiceId! } })
        expect(Number(inv.subtotal)).toBe(60000)
    })
})
