import { describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { createEmployee, updateEmployee } from "@/app/actions/hr"
import { unwrap } from "@/lib/action-result"
import { actAs, createTestTenant } from "./helpers"

describe("editing an employee", () => {
    it("checks email clashes and self-reporting, can clear assignments, saves joining date and emergency contact; no assumed country", async () => {
        const { tenant, user } = await createTestTenant({ country: "AE", currency: "AED" })
        actAs(user)
        const a = unwrap(await createEmployee({ firstName: "Amal", email: "amal@example.test" })).employee
        const b = unwrap(await createEmployee({ firstName: "Badr", email: "badr@example.test", managerId: a.id })).employee
        const stored = await prisma.employee.findUniqueOrThrow({ where: { id: a.id } })
        expect((stored.address as { country?: string }).country).toBe("")
        expect(stored.currencyCode).toBe("AED")

        await expect(updateEmployee(b.id, { email: "amal@example.test" }).then(unwrap)).rejects.toThrow(/already exists/)
        await expect(updateEmployee(a.id, { managerId: a.id }).then(unwrap)).rejects.toThrow(/themselves/)

        unwrap(await updateEmployee(b.id, { managerId: null, joiningDate: "2026-01-15", emergencyContactName: "Sara", emergencyContactPhone: "+971500000000" }))
        const after = await prisma.employee.findUniqueOrThrow({ where: { id: b.id } })
        expect(after.managerId).toBeNull()
        expect(after.joiningDate.toISOString().slice(0, 10)).toBe("2026-01-15")
        expect(after.emergencyContact).toEqual({ name: "Sara", phone: "+971500000000" })
        expect(tenant.id).toBeTruthy()
    })
})
