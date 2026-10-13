import { createHmac } from "node:crypto"
import { after } from "next/server"
import { Resend } from "resend"
import { prisma } from "@/lib/prisma"
import { checkWebhookTarget } from "@/lib/smtp-guard"
import type { TriggerEventType, WorkflowAction, WorkflowCondition } from "@/types/workflows"

export type WorkflowPayload = Record<string, string | number | boolean | null | undefined>

type ExecutedAction = { actionType: string; summary: string; success: boolean }

/**
 * Checks every condition against the payload. Returns null when all match,
 * otherwise the reason the first one failed.
 */
export function evaluateConditions(conditions: WorkflowCondition[], payload: Record<string, unknown>): string | null {
    for (const cond of conditions) {
        const actual = payload[cond.field]
        const target = cond.value
        let matched = false
        switch (cond.operator) {
            case "equals":
                matched = String(actual).toLowerCase() === String(target).toLowerCase()
                break
            case "not_equals":
                matched = String(actual).toLowerCase() !== String(target).toLowerCase()
                break
            case "greater_than":
                matched = Number(actual) > Number(target)
                break
            case "less_than":
                matched = Number(actual) < Number(target)
                break
            case "contains":
                matched = String(actual ?? "").toLowerCase().includes(String(target).toLowerCase())
                break
        }
        if (!matched) return `Condition failed: '${cond.field}' (${actual}) is not ${cond.operator} '${target}'`
    }
    return null
}

/** Replaces {{field}} placeholders with payload values. */
function fillTemplate(text: string, payload: WorkflowPayload): string {
    return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
        const value = payload[key]
        return value === null || value === undefined ? "" : String(value)
    })
}

function escapeHtml(text: string): string {
    return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
}

/** Active users of the tenant who should receive a notification for this role filter. */
async function recipients(tenantId: string, recipientRole: string | undefined): Promise<{ id: string; email: string }[]> {
    const roles =
        recipientRole === "ADMIN" ? ["ADMIN"] :
        recipientRole === "MANAGER" ? ["MANAGER", "ADMIN"] :
        null // SALES / SUPPORT / INVENTORY / ALL aren't workspace roles: everyone
    return prisma.user.findMany({
        where: { tenantId, isActive: true, ...(roles ? { role: { in: roles as never[] } } : {}) },
        select: { id: true, email: true },
    })
}

async function runAction(
    tenantId: string,
    ruleName: string,
    event: TriggerEventType,
    action: WorkflowAction,
    payload: WorkflowPayload
): Promise<ExecutedAction> {
    const params = action.params || {}
    switch (action.actionType) {
        case "SEND_NOTIFICATION": {
            const users = await recipients(tenantId, params.recipientRole)
            const description = fillTemplate(params.message || ruleName, payload)
            if (users.length > 0) {
                await prisma.notification.createMany({
                    data: users.map((u) => ({
                        type: "system",
                        title: ruleName,
                        description,
                        userId: u.id,
                        tenantId,
                    })),
                })
            }
            return { actionType: action.actionType, summary: `Notified ${users.length} user(s): "${description}"`, success: true }
        }
        case "SEND_EMAIL": {
            const apiKey = process.env.RESEND_API_KEY
            const domain = process.env.RESEND_DOMAIN
            if (!apiKey || !domain) {
                return { actionType: action.actionType, summary: "Email isn't configured (RESEND_API_KEY / RESEND_DOMAIN)", success: false }
            }
            const to = (await recipients(tenantId, params.recipientRole)).map((u) => u.email).filter(Boolean)
            if (to.length === 0) {
                return { actionType: action.actionType, summary: "No recipients with an email address", success: false }
            }
            const subject = fillTemplate(params.emailSubject || ruleName, payload)
            const body = fillTemplate(params.emailBody || params.message || "", payload)
            const { error } = await new Resend(apiKey).emails.send({
                from: `Genesoft Workflows <workflows@${domain}>`,
                to,
                subject,
                html: `<div style="font-family: sans-serif; white-space: pre-wrap;">${escapeHtml(body)}</div>`,
            })
            if (error) return { actionType: action.actionType, summary: `Email failed: ${error.message}`, success: false }
            return { actionType: action.actionType, summary: `Emailed ${to.length} recipient(s): "${subject}"`, success: true }
        }
        case "CREATE_TASK": {
            const title = fillTemplate(params.taskTitle || ruleName, payload)
            const dueDate = new Date()
            dueDate.setDate(dueDate.getDate() + (params.taskDueDays ?? 1))
            await prisma.task.create({
                data: {
                    tenantId,
                    title,
                    description: `Created by workflow "${ruleName}" (${event})`,
                    priority: params.taskPriority || "MEDIUM",
                    dueDate,
                },
            })
            return { actionType: action.actionType, summary: `Created task "${title}"`, success: true }
        }
        case "CALL_WEBHOOK": {
            const url = params.webhookUrl || ""
            const blocked = await checkWebhookTarget(url)
            if (blocked) return { actionType: action.actionType, summary: blocked, success: false }
            const body = JSON.stringify({ event, rule: ruleName, data: payload, sentAt: new Date().toISOString() })
            const headers: Record<string, string> = { "content-type": "application/json" }
            if (params.webhookSecret) {
                headers["x-genesoft-signature"] = createHmac("sha256", params.webhookSecret).update(body).digest("hex")
            }
            const res = await fetch(url, { method: "POST", headers, body, redirect: "manual", signal: AbortSignal.timeout(5000) })
            return { actionType: action.actionType, summary: `POST ${new URL(url).host} → ${res.status}`, success: res.ok }
        }
        case "UPDATE_STATUS":
            // Status names differ per record type, so this action only runs in the simulator for now.
            return { actionType: action.actionType, summary: "Status updates aren't run automatically yet", success: false }
        default:
            return { actionType: String(action.actionType), summary: "Unknown action", success: false }
    }
}

/**
 * Runs every active workflow rule of the tenant for this event and logs each
 * run. Never throws: a broken rule must not break the business action that
 * triggered it.
 */
export async function runWorkflowEvent(
    tenantId: string,
    event: TriggerEventType,
    payload: WorkflowPayload,
    entityId?: string | null,
    options: { oncePerEntity?: boolean } = {}
): Promise<void> {
    try {
        const rules = await prisma.workflowRule.findMany({ where: { tenantId, triggerEvent: event, isActive: true } })
        for (const rule of rules) {
            // Scheduled events (overdue invoices, due bills) see the same record
            // every day; run each rule for it once. A run that was skipped by
            // its conditions may still match later, so it doesn't count.
            if (options.oncePerEntity && entityId) {
                const alreadyRan = await prisma.workflowExecution.count({
                    where: { tenantId, workflowId: rule.id, entityId, status: { not: "SKIPPED" } },
                })
                if (alreadyRan) continue
            }
            const started = Date.now()
            const conditions = (rule.conditions as unknown as WorkflowCondition[]) || []
            const actions = (rule.actions as unknown as WorkflowAction[]) || []
            const failedReason = evaluateConditions(conditions, payload)

            const executedActions: ExecutedAction[] = []
            if (!failedReason) {
                for (const action of actions) {
                    try {
                        executedActions.push(await runAction(tenantId, rule.name, event, action, payload))
                    } catch (err) {
                        executedActions.push({
                            actionType: action.actionType,
                            summary: err instanceof Error ? err.message : "Action failed",
                            success: false,
                        })
                    }
                }
            }

            const failed = executedActions.filter((a) => !a.success)
            const status = failedReason ? "SKIPPED" : failed.length > 0 ? "FAILED" : "SUCCESS"
            await prisma.workflowExecution.create({
                data: {
                    tenantId,
                    workflowId: rule.id,
                    triggerEvent: event,
                    entityId: entityId ?? null,
                    status,
                    executedActions: executedActions as never,
                    errorDetails: failedReason ?? (failed.length ? failed.map((a) => a.summary).join("; ") : null),
                    executionDurationMs: Date.now() - started,
                },
            })
            if (!failedReason) {
                await prisma.workflowRule.updateMany({
                    where: { id: rule.id, tenantId },
                    data: { executionCount: { increment: 1 }, lastRunAt: new Date() },
                })
            }
        }
    } catch (err) {
        console.error(`Workflow event ${event} failed for tenant ${tenantId}:`, err)
    }
}

/**
 * Schedules runWorkflowEvent to run after the response is sent, so workflow
 * actions (emails, webhooks) never slow down or fail the triggering request.
 */
export function fireWorkflowEvent(
    tenantId: string,
    event: TriggerEventType,
    payload: WorkflowPayload,
    entityId?: string | null
): void {
    try {
        after(() => runWorkflowEvent(tenantId, event, payload, entityId))
    } catch {
        // Outside a request (scripts/cron helpers call runWorkflowEvent directly)
        void runWorkflowEvent(tenantId, event, payload, entityId)
    }
}

/**
 * Fires STOCK_OUT / STOCK_LOW when a warehouse's quantity crosses the
 * threshold (not on every movement while it stays low).
 */
export function fireStockAlert(
    tenantId: string,
    stock: { productId: string; sku: string | null; category: string | null; name: string; before: number; after: number; reorderPoint: number }
): void {
    const payload = { stock: stock.after, reorderLevel: stock.reorderPoint, sku: stock.sku, category: stock.category, productName: stock.name }
    if (stock.after <= 0 && stock.before > 0) {
        fireWorkflowEvent(tenantId, "STOCK_OUT", payload, stock.productId)
    } else if (stock.after > 0 && stock.after <= stock.reorderPoint && stock.before > stock.reorderPoint) {
        fireWorkflowEvent(tenantId, "STOCK_LOW", payload, stock.productId)
    }
}
