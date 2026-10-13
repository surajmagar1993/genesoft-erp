import { beforeEach, describe, expect, it, vi } from "vitest"

const db = vi.hoisted(() => ({
    workflowRule: { findMany: vi.fn(), updateMany: vi.fn() },
    workflowExecution: { create: vi.fn(), count: vi.fn() },
    task: { create: vi.fn() },
    notification: { createMany: vi.fn() },
    user: { findMany: vi.fn() },
}))
vi.mock("@/lib/prisma", () => ({ prisma: db }))
vi.mock("next/server", () => ({ after: (fn: () => unknown) => fn() }))

import { evaluateConditions, runWorkflowEvent } from "@/lib/workflow-engine"

const rule = (overrides: Record<string, unknown> = {}) => ({
    id: "rule-1",
    name: "Big invoice",
    conditions: [{ field: "total", operator: "greater_than", value: 1000 }],
    actions: [
        { actionType: "CREATE_TASK", params: { taskTitle: "Follow up {{customerName}}", taskPriority: "HIGH", taskDueDays: 2 } },
        { actionType: "SEND_NOTIFICATION", params: { recipientRole: "MANAGER", message: "Invoice for {{customerName}}" } },
    ],
    ...overrides,
})

describe("evaluateConditions", () => {
    it("matches every operator", () => {
        const payload = { total: 5000, status: "SENT", customerName: "Acme Ltd" }
        expect(evaluateConditions([{ field: "total", operator: "greater_than", value: 1000 }], payload)).toBeNull()
        expect(evaluateConditions([{ field: "total", operator: "less_than", value: 10000 }], payload)).toBeNull()
        expect(evaluateConditions([{ field: "status", operator: "equals", value: "sent" }], payload)).toBeNull()
        expect(evaluateConditions([{ field: "status", operator: "not_equals", value: "PAID" }], payload)).toBeNull()
        expect(evaluateConditions([{ field: "customerName", operator: "contains", value: "acme" }], payload)).toBeNull()
    })

    it("reports the first failing condition", () => {
        expect(evaluateConditions([{ field: "total", operator: "greater_than", value: 9000 }], { total: 5000 })).toMatch(/total/)
    })
})

describe("runWorkflowEvent", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        db.user.findMany.mockResolvedValue([{ id: "u1", email: "manager@example.com" }])
        db.workflowExecution.count.mockResolvedValue(0)
    })

    it("runs the actions of a matching rule and logs a successful run", async () => {
        db.workflowRule.findMany.mockResolvedValue([rule()])
        await runWorkflowEvent("t1", "INVOICE_CREATED", { total: 5000, customerName: "Acme" }, "inv-1")

        expect(db.task.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ tenantId: "t1", title: "Follow up Acme", priority: "HIGH" }),
        })
        expect(db.user.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: expect.objectContaining({ tenantId: "t1", role: { in: ["MANAGER", "ADMIN"] } }) })
        )
        expect(db.notification.createMany).toHaveBeenCalled()
        expect(db.workflowExecution.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ workflowId: "rule-1", status: "SUCCESS", entityId: "inv-1" }),
        })
        expect(db.workflowRule.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "rule-1", tenantId: "t1" } }))
    })

    it("skips the actions when conditions don't match", async () => {
        db.workflowRule.findMany.mockResolvedValue([rule()])
        await runWorkflowEvent("t1", "INVOICE_CREATED", { total: 10, customerName: "Acme" }, "inv-2")

        expect(db.task.create).not.toHaveBeenCalled()
        expect(db.workflowExecution.create).toHaveBeenCalledWith({ data: expect.objectContaining({ status: "SKIPPED" }) })
        expect(db.workflowRule.updateMany).not.toHaveBeenCalled()
    })

    it("marks the run FAILED when an action can't run, without throwing", async () => {
        db.workflowRule.findMany.mockResolvedValue([
            rule({ conditions: [], actions: [{ actionType: "CALL_WEBHOOK", params: { webhookUrl: "http://insecure.example.com" } }] }),
        ])
        await expect(runWorkflowEvent("t1", "LEAD_CREATED", {}, "lead-1")).resolves.toBeUndefined()
        expect(db.workflowExecution.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ status: "FAILED", errorDetails: expect.stringMatching(/https/) }),
        })
    })

    it("runs a scheduled rule only once per record", async () => {
        db.workflowRule.findMany.mockResolvedValue([rule({ conditions: [] })])
        db.workflowExecution.count.mockResolvedValue(1)
        await runWorkflowEvent("t1", "INVOICE_OVERDUE", { total: 5000 }, "inv-3", { oncePerEntity: true })
        expect(db.task.create).not.toHaveBeenCalled()
        expect(db.workflowExecution.create).not.toHaveBeenCalled()
    })

    it("never throws when the database fails", async () => {
        db.workflowRule.findMany.mockRejectedValue(new Error("db down"))
        vi.spyOn(console, "error").mockImplementation(() => {})
        await expect(runWorkflowEvent("t1", "LEAD_CREATED", {}, null)).resolves.toBeUndefined()
    })
})
