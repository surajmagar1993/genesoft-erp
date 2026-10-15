import { prisma } from "@/lib/prisma"

/**
 * Models that can be referenced by id from client input. Each must have a
 * tenantId column.
 */
const REF_MODELS = {
    contact: "Contact",
    product: "Product",
    warehouse: "Warehouse",
    employee: "Employee",
    department: "Department",
    designation: "Designation",
    project: "Project",
    projectTask: "Task",
    projectMilestone: "Milestone",
    account: "Account",
    invoice: "Invoice",
    bill: "Bill",
    payment: "Payment",
    deal: "Deal",
    lead: "Lead",
    emailAccount: "Mailbox",
    purchaseOrder: "Purchase order",
    salesOrder: "Sales order",
    quote: "Quote",
    salaryStructure: "Salary structure",
    productBatch: "Batch",
    rentalAsset: "Rental asset",
    billOfMaterials: "Bill of materials",
} as const

type RefModel = keyof typeof REF_MODELS
type RefIds = string | null | undefined | (string | null | undefined)[]

/**
 * Throws "<Thing> not found" unless every given id belongs to the tenant.
 * Empty ids are ignored, so optional references can be passed as-is.
 * Prisma bypasses RLS, so call this before writing any client-supplied
 * reference id into a record.
 */
export async function assertTenantRefs(
    tenantId: string,
    refs: Partial<Record<RefModel, RefIds>>
): Promise<void> {
    const checks = (Object.entries(refs) as [RefModel, RefIds][]).map(async ([model, value]) => {
        const ids = [...new Set((Array.isArray(value) ? value : [value]).filter((id): id is string => !!id))]
        if (ids.length === 0) return
        const delegate = (prisma as unknown as Record<string, { count: (args: unknown) => Promise<number> }>)[model]
        const found = await delegate.count({ where: { tenantId, id: { in: ids } } })
        if (found !== ids.length) throw new Error(`${REF_MODELS[model]} not found`)
    })
    await Promise.all(checks)
}
