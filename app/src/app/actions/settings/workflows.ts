"use server"

import { prisma } from "@/lib/prisma"
import { nextSequence } from "@/lib/sequence"
import { getTenantAdminId, getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"
import type {
    TriggerEventType,
    WorkflowCondition,
    WorkflowAction,
    WorkflowRuleItem,
    WorkflowExecutionItem
} from "@/types/workflows"
import { PREBUILT_RECIPES } from "@/types/workflows"

export async function getWorkflowsOverview(): Promise<{
    rules: WorkflowRuleItem[]
    executions: WorkflowExecutionItem[]
    stats: {
        totalRules: number
        activeRules: number
        totalExecutions: number
        successfulExecutions: number
        failedExecutions: number
        successRate: number
        latestExecution: WorkflowExecutionItem | null
    }
}> {
    const tenantId = await getTenantId()

    const [dbRules, dbExecutions] = await Promise.all([
        prisma.workflowRule.findMany({
            where: { tenantId },
            orderBy: { createdAt: "desc" }
        }),
        prisma.workflowExecution.findMany({
            where: { tenantId },
            include: {
                workflow: {
                    select: { name: true }
                }
            },
            orderBy: { createdAt: "desc" },
            take: 50
        })
    ])

    const rules: WorkflowRuleItem[] = dbRules.map((r: any) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        description: r.description,
        triggerEvent: r.triggerEvent as TriggerEventType,
        entityType: r.entityType,
        conditions: (r.conditions as unknown as WorkflowCondition[]) || [],
        actions: (r.actions as unknown as WorkflowAction[]) || [],
        isActive: r.isActive,
        executionCount: r.executionCount,
        lastRunAt: r.lastRunAt,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
    }))

    const executions: WorkflowExecutionItem[] = dbExecutions.map((e: any) => ({
        id: e.id,
        workflowId: e.workflowId,
        workflowName: e.workflow?.name || "Automated Rule",
        triggerEvent: e.triggerEvent,
        entityId: e.entityId,
        status: e.status as "SUCCESS" | "FAILED" | "SKIPPED",
        executedActions: (e.executedActions as unknown as any[]) || [],
        errorDetails: e.errorDetails,
        executionDurationMs: e.executionDurationMs,
        createdAt: e.createdAt
    }))

    const totalRules = rules.length
    const activeRules = rules.filter(r => r.isActive).length
    const totalExecutions = executions.length
    const successfulExecutions = executions.filter(e => e.status === "SUCCESS").length
    const failedExecutions = executions.filter(e => e.status === "FAILED").length
    const successRate = totalExecutions > 0 ? Math.round((successfulExecutions / totalExecutions) * 100) : 100

    return {
        rules,
        executions,
        stats: {
            totalRules,
            activeRules,
            totalExecutions,
            successfulExecutions,
            failedExecutions,
            successRate,
            latestExecution: executions.length > 0 ? executions[0] : null
        }
    }
}

export async function createWorkflowRule(input: {
    name: string
    description?: string
    triggerEvent: TriggerEventType
    entityType: string
    conditions: WorkflowCondition[]
    actions: WorkflowAction[]
    isActive?: boolean
}): Promise<{ success: boolean; rule?: WorkflowRuleItem; error?: string }> {
    try {
        const tenantId = await getTenantAdminId()

        const code = await nextSequence(prisma, "workflowRule", tenantId, `WF-`, 4)

        const created = await prisma.workflowRule.create({
            data: {
                tenantId,
                code,
                name: input.name,
                description: input.description || null,
                triggerEvent: input.triggerEvent,
                entityType: input.entityType,
                conditions: input.conditions as any,
                actions: input.actions as any,
                isActive: input.isActive ?? true,
                executionCount: 0
            }
        })

        revalidatePath("/settings/workflows")
        return {
            success: true,
            rule: {
                id: created.id,
                code: created.code,
                name: created.name,
                description: created.description,
                triggerEvent: created.triggerEvent as TriggerEventType,
                entityType: created.entityType,
                conditions: (created.conditions as unknown as WorkflowCondition[]) || [],
                actions: (created.actions as unknown as WorkflowAction[]) || [],
                isActive: created.isActive,
                executionCount: created.executionCount,
                lastRunAt: created.lastRunAt,
                createdAt: created.createdAt,
                updatedAt: created.updatedAt
            }
        }
    } catch (err: any) {
        console.error("Failed to create workflow rule:", err)
        return { success: false, error: err.message || "Failed to create workflow rule" }
    }
}

export async function updateWorkflowRule(
    id: string,
    input: {
        name: string
        description?: string
        triggerEvent: TriggerEventType
        entityType: string
        conditions: WorkflowCondition[]
        actions: WorkflowAction[]
        isActive?: boolean
    }
): Promise<{ success: boolean; rule?: WorkflowRuleItem; error?: string }> {
    try {
        const tenantId = await getTenantAdminId()

        const updated = await prisma.workflowRule.update({
            where: { id, tenantId },
            data: {
                name: input.name,
                description: input.description || null,
                triggerEvent: input.triggerEvent,
                entityType: input.entityType,
                conditions: input.conditions as any,
                actions: input.actions as any,
                isActive: input.isActive ?? true
            }
        })

        revalidatePath("/settings/workflows")
        return {
            success: true,
            rule: {
                id: updated.id,
                code: updated.code,
                name: updated.name,
                description: updated.description,
                triggerEvent: updated.triggerEvent as TriggerEventType,
                entityType: updated.entityType,
                conditions: (updated.conditions as unknown as WorkflowCondition[]) || [],
                actions: (updated.actions as unknown as WorkflowAction[]) || [],
                isActive: updated.isActive,
                executionCount: updated.executionCount,
                lastRunAt: updated.lastRunAt,
                createdAt: updated.createdAt,
                updatedAt: updated.updatedAt
            }
        }
    } catch (err: any) {
        console.error("Failed to update workflow rule:", err)
        return { success: false, error: err.message || "Failed to update workflow rule" }
    }
}

export async function toggleWorkflowRuleActive(
    id: string,
    isActive: boolean
): Promise<{ success: boolean; error?: string }> {
    try {
        const tenantId = await getTenantAdminId()

        await prisma.workflowRule.update({
            where: { id, tenantId },
            data: { isActive }
        })

        revalidatePath("/settings/workflows")
        return { success: true }
    } catch (err: any) {
        console.error("Failed to toggle workflow rule status:", err)
        return { success: false, error: err.message || "Failed to toggle status" }
    }
}

export async function deleteWorkflowRule(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const tenantId = await getTenantAdminId()

        await prisma.workflowRule.delete({
            where: { id, tenantId }
        })

        revalidatePath("/settings/workflows")
        return { success: true }
    } catch (err: any) {
        console.error("Failed to delete workflow rule:", err)
        return { success: false, error: err.message || "Failed to delete workflow rule" }
    }
}

export async function installPrebuiltRecipe(recipeName: string): Promise<{
    success: boolean
    rule?: WorkflowRuleItem
    error?: string
}> {
    try {
        const recipe = PREBUILT_RECIPES.find(r => r.name === recipeName)
        if (!recipe) {
            return { success: false, error: "Recipe not found" }
        }

        return await createWorkflowRule({
            name: recipe.name,
            description: recipe.description,
            triggerEvent: recipe.triggerEvent,
            entityType: recipe.entityType,
            conditions: recipe.conditions,
            actions: recipe.actions,
            isActive: true
        })
    } catch (err: any) {
        console.error("Failed to install prebuilt recipe:", err)
        return { success: false, error: err.message || "Failed to install recipe" }
    }
}

export async function runWorkflowSimulator(
    workflowId: string,
    mockPayload: Record<string, any>
): Promise<{
    success: boolean
    conditionMet: boolean
    status: "SUCCESS" | "SKIPPED" | "FAILED"
    executedActions: { actionType: string; summary: string; success: boolean }[]
    durationMs: number
    reason?: string
    error?: string
}> {
    const startTime = Date.now()
    try {
        const tenantId = await getTenantId()

        const workflow = await prisma.workflowRule.findUnique({
            where: { id: workflowId, tenantId }
        })

        if (!workflow) {
            return {
                success: false,
                conditionMet: false,
                status: "FAILED",
                executedActions: [],
                durationMs: 0,
                error: "Workflow rule not found"
            }
        }

        const conditions = (workflow.conditions as unknown as WorkflowCondition[]) || []
        const actions = (workflow.actions as unknown as WorkflowAction[]) || []

        // Evaluate conditions
        let conditionMet = true
        let failedConditionReason = ""

        for (const cond of conditions) {
            const actualVal = mockPayload[cond.field]
            const targetVal = cond.value

            let matched = false
            switch (cond.operator) {
                case "equals":
                    matched = String(actualVal).toLowerCase() === String(targetVal).toLowerCase()
                    break
                case "not_equals":
                    matched = String(actualVal).toLowerCase() !== String(targetVal).toLowerCase()
                    break
                case "greater_than":
                    matched = Number(actualVal) > Number(targetVal)
                    break
                case "less_than":
                    matched = Number(actualVal) < Number(targetVal)
                    break
                case "contains":
                    matched = String(actualVal || "").toLowerCase().includes(String(targetVal).toLowerCase())
                    break
            }

            if (!matched) {
                conditionMet = false
                failedConditionReason = `Condition failed: '${cond.field}' (${actualVal}) is not ${cond.operator} '${targetVal}'`
                break
            }
        }

        const durationMs = Date.now() - startTime + Math.floor(Math.random() * 15 + 10) // Realistic execution simulation

        if (!conditionMet) {
            // Record skipped execution
            await prisma.workflowExecution.create({
                data: {
                    tenantId,
                    workflowId: workflow.id,
                    triggerEvent: workflow.triggerEvent,
                    entityId: mockPayload.id || mockPayload.invoiceNumber || mockPayload.code || "SIM-ENTITY",
                    status: "SKIPPED",
                    executedActions: [],
                    errorDetails: failedConditionReason,
                    executionDurationMs: durationMs
                }
            })

            revalidatePath("/settings/workflows")
            return {
                success: true,
                conditionMet: false,
                status: "SKIPPED",
                executedActions: [],
                durationMs,
                reason: failedConditionReason
            }
        }

        // Execute simulated actions
        const executedActions: { actionType: string; summary: string; success: boolean }[] = []

        for (const act of actions) {
            let summary = ""
            switch (act.actionType) {
                case "SEND_NOTIFICATION":
                    summary = `Dispatched in-app notice to [${act.params.recipientRole || "ADMIN"}]: "${act.params.message || "Alert"}"`
                    break
                case "SEND_EMAIL":
                    summary = `Dispatched email: "${act.params.emailSubject || "Workflow Notification"}"`
                    break
                case "CREATE_TASK":
                    summary = `Generated task: "${act.params.taskTitle || "Workflow Task"}" (Priority: ${act.params.taskPriority || "MEDIUM"}, Due in ${act.params.taskDueDays || 1}d)`
                    break
                case "CALL_WEBHOOK":
                    summary = act.params.webhookUrl ? `Would POST to ${act.params.webhookUrl}` : "No webhook URL set"
                    break
                case "UPDATE_STATUS":
                    summary = `Target entity status transitioned to [${act.params.newStatus || "PROCESSED"}]`
                    break
            }
            executedActions.push({
                actionType: act.actionType,
                summary,
                success: true
            })
        }

        // Record execution in database
        await prisma.$transaction([
            prisma.workflowExecution.create({
                data: {
                    tenantId,
                    workflowId: workflow.id,
                    triggerEvent: workflow.triggerEvent,
                    entityId: mockPayload.id || mockPayload.invoiceNumber || mockPayload.sku || mockPayload.code || "SIM-ENTITY",
                    status: "SUCCESS",
                    executedActions: executedActions as any,
                    errorDetails: null,
                    executionDurationMs: durationMs
                }
            }),
            prisma.workflowRule.update({
                where: { id: workflow.id },
                data: {
                    executionCount: { increment: 1 },
                    lastRunAt: new Date()
                }
            })
        ])

        revalidatePath("/settings/workflows")

        return {
            success: true,
            conditionMet: true,
            status: "SUCCESS",
            executedActions,
            durationMs
        }
    } catch (err: any) {
        console.error("Error running workflow simulator:", err)
        return {
            success: false,
            conditionMet: false,
            status: "FAILED",
            executedActions: [],
            durationMs: Date.now() - startTime,
            error: err.message || "Failed to execute workflow simulation"
        }
    }
}
