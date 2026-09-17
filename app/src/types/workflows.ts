export type TriggerCategory = "CRM" | "SALES" | "INVENTORY" | "FINANCE" | "HR" | "SUPPORT"

export type TriggerEventType =
    // CRM
    | "LEAD_CREATED"
    | "DEAL_WON"
    | "DEAL_LOST"
    // Sales
    | "INVOICE_CREATED"
    | "INVOICE_OVERDUE"
    | "PAYMENT_RECEIVED"
    // Inventory
    | "STOCK_LOW"
    | "STOCK_OUT"
    // Finance
    | "EXPENSE_SUBMITTED"
    | "BILL_DUE"
    // HR
    | "LEAVE_REQUESTED"
    | "EMPLOYEE_JOINED"
    // Support
    | "TICKET_CREATED"
    | "TICKET_ESCALATED"

export type ActionType =
    | "SEND_NOTIFICATION"
    | "SEND_EMAIL"
    | "CREATE_TASK"
    | "CALL_WEBHOOK"
    | "UPDATE_STATUS"

export interface WorkflowCondition {
    field: string
    operator: "equals" | "not_equals" | "greater_than" | "less_than" | "contains"
    value: string | number | boolean
}

export interface WorkflowAction {
    actionType: ActionType
    params: {
        recipientRole?: "ADMIN" | "MANAGER" | "SALES" | "SUPPORT" | "INVENTORY" | "ALL"
        message?: string
        emailSubject?: string
        emailBody?: string
        taskTitle?: string
        taskPriority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
        taskDueDays?: number
        webhookUrl?: string
        webhookSecret?: string
        newStatus?: string
    }
}

export interface WorkflowRuleItem {
    id: string
    code: string
    name: string
    description: string | null
    triggerEvent: TriggerEventType
    entityType: string
    conditions: WorkflowCondition[]
    actions: WorkflowAction[]
    isActive: boolean
    executionCount: number
    lastRunAt: Date | null
    createdAt: Date
    updatedAt: Date
}

export interface WorkflowExecutionItem {
    id: string
    workflowId: string
    workflowName?: string
    triggerEvent: string
    entityId: string | null
    status: "SUCCESS" | "FAILED" | "SKIPPED"
    executedActions: { actionType: string; summary: string; success: boolean }[]
    errorDetails: string | null
    executionDurationMs: number | null
    createdAt: Date
}

export interface TriggerMeta {
    event: TriggerEventType
    label: string
    category: TriggerCategory
    entityType: string
    description: string
    fields: { key: string; label: string; type: "string" | "number" | "boolean" }[]
}

export const TRIGGER_CATALOG: TriggerMeta[] = [
    {
        event: "INVOICE_OVERDUE",
        label: "Invoice Overdue",
        category: "SALES",
        entityType: "INVOICE",
        description: "Fires when a customer invoice passes its payment due date without full settlement.",
        fields: [
            { key: "total", label: "Invoice Amount", type: "number" },
            { key: "balanceDue", label: "Balance Due", type: "number" },
            { key: "daysOverdue", label: "Days Overdue", type: "number" },
            { key: "customerName", label: "Customer Name", type: "string" },
            { key: "status", label: "Status", type: "string" }
        ]
    },
    {
        event: "INVOICE_CREATED",
        label: "Invoice Generated",
        category: "SALES",
        entityType: "INVOICE",
        description: "Fires immediately when a new commercial sales or tax invoice is saved or issued.",
        fields: [
            { key: "total", label: "Total Amount", type: "number" },
            { key: "customerName", label: "Customer Name", type: "string" },
            { key: "status", label: "Status", type: "string" }
        ]
    },
    {
        event: "PAYMENT_RECEIVED",
        label: "Payment Settled",
        category: "SALES",
        entityType: "PAYMENT",
        description: "Fires when customer settles funds via bank, cash, Stripe, or Razorpay.",
        fields: [
            { key: "amount", label: "Amount Paid", type: "number" },
            { key: "paymentMethod", label: "Payment Gateway", type: "string" },
            { key: "customerName", label: "Customer Name", type: "string" }
        ]
    },
    {
        event: "DEAL_WON",
        label: "Deal Closed / Won",
        category: "CRM",
        entityType: "DEAL",
        description: "Fires when a pipeline deal or opportunity transitions to the WON stage.",
        fields: [
            { key: "amount", label: "Deal Value", type: "number" },
            { key: "dealName", label: "Opportunity Name", type: "string" },
            { key: "stage", label: "Pipeline Stage", type: "string" }
        ]
    },
    {
        event: "LEAD_CREATED",
        label: "New Lead Captured",
        category: "CRM",
        entityType: "LEAD",
        description: "Fires when an inbound prospect is submitted through web intake forms or manual entry.",
        fields: [
            { key: "source", label: "Lead Source", type: "string" },
            { key: "leadScore", label: "Lead Score", type: "number" },
            { key: "company", label: "Company", type: "string" }
        ]
    },
    {
        event: "STOCK_LOW",
        label: "Low Stock Alert",
        category: "INVENTORY",
        entityType: "INVENTORY",
        description: "Fires when warehouse quantity on hand drops below reorder point.",
        fields: [
            { key: "stock", label: "Current Stock", type: "number" },
            { key: "reorderLevel", label: "Reorder Point", type: "number" },
            { key: "category", label: "Product Category", type: "string" },
            { key: "sku", label: "Product SKU", type: "string" }
        ]
    },
    {
        event: "STOCK_OUT",
        label: "Stock Depleted (Out of Stock)",
        category: "INVENTORY",
        entityType: "INVENTORY",
        description: "Fires when physical inventory count reaches zero.",
        fields: [
            { key: "stock", label: "Current Stock", type: "number" },
            { key: "sku", label: "Product SKU", type: "string" }
        ]
    },
    {
        event: "EXPENSE_SUBMITTED",
        label: "Expense Filed for Approval",
        category: "FINANCE",
        entityType: "EXPENSE",
        description: "Fires when employee or contractor submits an operational expense claim.",
        fields: [
            { key: "amount", label: "Claim Amount", type: "number" },
            { key: "category", label: "Expense Category", type: "string" },
            { key: "payee", label: "Merchant / Payee", type: "string" }
        ]
    },
    {
        event: "BILL_DUE",
        label: "Vendor Bill Payment Due",
        category: "FINANCE",
        entityType: "BILL",
        description: "Fires when accounts payable supplier bill approaches settlement cutoff.",
        fields: [
            { key: "balanceDue", label: "Pending Payable", type: "number" },
            { key: "vendorName", label: "Supplier Name", type: "string" },
            { key: "daysUntilDue", label: "Days Until Due", type: "number" }
        ]
    },
    {
        event: "LEAVE_REQUESTED",
        label: "Leave Application Submitted",
        category: "HR",
        entityType: "HR",
        description: "Fires when an employee submits vacation, sick, or casual leave.",
        fields: [
            { key: "daysCount", label: "Duration (Days)", type: "number" },
            { key: "leaveType", label: "Leave Type", type: "string" },
            { key: "employeeName", label: "Applicant Name", type: "string" }
        ]
    },
    {
        event: "EMPLOYEE_JOINED",
        label: "New Employee Onboarded",
        category: "HR",
        entityType: "HR",
        description: "Fires when a new team member joins the organization workforce.",
        fields: [
            { key: "department", label: "Department", type: "string" },
            { key: "designation", label: "Designation", type: "string" },
            { key: "employeeName", label: "Employee Name", type: "string" }
        ]
    },
    {
        event: "TICKET_CREATED",
        label: "Support Ticket Logged",
        category: "SUPPORT",
        entityType: "TICKET",
        description: "Fires when a customer submits a service ticket or issue report.",
        fields: [
            { key: "priority", label: "Urgency / Priority", type: "string" },
            { key: "category", label: "Ticket Category", type: "string" },
            { key: "subject", label: "Ticket Subject", type: "string" }
        ]
    },
    {
        event: "TICKET_ESCALATED",
        label: "Support Ticket Escalated",
        category: "SUPPORT",
        entityType: "TICKET",
        description: "Fires when SLA resolution target is breached or customer escalates.",
        fields: [
            { key: "priority", label: "Priority", type: "string" },
            { key: "customerEmail", label: "Customer Email", type: "string" }
        ]
    }
]

export const PREBUILT_RECIPES: {
    name: string
    description: string
    triggerEvent: TriggerEventType
    entityType: string
    conditions: WorkflowCondition[]
    actions: WorkflowAction[]
}[] = [
    {
        name: "Overdue Invoice Dunning & Reminder",
        description: "Sends automated notification and email reminder when an invoice is 3+ days overdue.",
        triggerEvent: "INVOICE_OVERDUE",
        entityType: "INVOICE",
        conditions: [
            { field: "daysOverdue", operator: "greater_than", value: 3 },
            { field: "balanceDue", operator: "greater_than", value: 0 }
        ],
        actions: [
            {
                actionType: "SEND_NOTIFICATION",
                params: {
                    recipientRole: "ADMIN",
                    message: "Customer invoice is overdue. Payment reminder has been initiated."
                }
            },
            {
                actionType: "SEND_EMAIL",
                params: {
                    emailSubject: "Gentle Reminder: Overdue Invoice Payment",
                    emailBody: "Dear Customer, please be reminded that your invoice is pending settlement. Kindly review attached invoice slip."
                }
            }
        ]
    },
    {
        name: "Critical Low Stock Replenishment Alert",
        description: "Alerts the warehouse manager and auto-generates a procurement task when stock drops below reorder point.",
        triggerEvent: "STOCK_LOW",
        entityType: "INVENTORY",
        conditions: [
            { field: "stock", operator: "less_than", value: 10 }
        ],
        actions: [
            {
                actionType: "SEND_NOTIFICATION",
                params: {
                    recipientRole: "INVENTORY",
                    message: "Critical low stock detected for inventory items. Immediate replenishment required."
                }
            },
            {
                actionType: "CREATE_TASK",
                params: {
                    taskTitle: "Initiate Supplier RFQ for Depleted SKU",
                    taskPriority: "HIGH",
                    taskDueDays: 2
                }
            }
        ]
    },
    {
        name: "High-Value Deal Won Announcement",
        description: "Celebrates marquee deal closures exceeding ₹100,000 / $1,000 by notifying management and setting up onboarding.",
        triggerEvent: "DEAL_WON",
        entityType: "DEAL",
        conditions: [
            { field: "amount", operator: "greater_than", value: 100000 }
        ],
        actions: [
            {
                actionType: "SEND_NOTIFICATION",
                params: {
                    recipientRole: "ALL",
                    message: "🚀 High-value enterprise deal closed! Client account handover in progress."
                }
            },
            {
                actionType: "CREATE_TASK",
                params: {
                    taskTitle: "Kickoff Client Implementation & Project Board",
                    taskPriority: "HIGH",
                    taskDueDays: 3
                }
            }
        ]
    },
    {
        name: "Urgent Support SLA Escalation",
        description: "Dispatches instant alert to engineering leads when a critical or urgent ticket is filed.",
        triggerEvent: "TICKET_CREATED",
        entityType: "TICKET",
        conditions: [
            { field: "priority", operator: "equals", value: "URGENT" }
        ],
        actions: [
            {
                actionType: "SEND_NOTIFICATION",
                params: {
                    recipientRole: "SUPPORT",
                    message: "🚨 Critical severity support ticket received! SLA countdown active."
                }
            },
            {
                actionType: "CREATE_TASK",
                params: {
                    taskTitle: "Resolve Tier-1 Incident with Customer Engineer",
                    taskPriority: "URGENT",
                    taskDueDays: 1
                }
            }
        ]
    },
    {
        name: "Large Expense Audit Trigger",
        description: "Flags expense claims over ₹50,000 / $500 for secondary CFO review before ledger posting.",
        triggerEvent: "EXPENSE_SUBMITTED",
        entityType: "EXPENSE",
        conditions: [
            { field: "amount", operator: "greater_than", value: 50000 }
        ],
        actions: [
            {
                actionType: "SEND_NOTIFICATION",
                params: {
                    recipientRole: "ADMIN",
                    message: "Large expense claim submitted. Secondary executive sign-off required."
                }
            },
            {
                actionType: "CREATE_TASK",
                params: {
                    taskTitle: "Audit Supporting Invoices for High-Value Expense Claim",
                    taskPriority: "MEDIUM",
                    taskDueDays: 2
                }
            }
        ]
    },
    {
        name: "Inbound VIP Lead Auto-Handover",
        description: "Routes high-scoring incoming prospects (lead score >= 75) immediately to Senior Sales Leads.",
        triggerEvent: "LEAD_CREATED",
        entityType: "LEAD",
        conditions: [
            { field: "leadScore", operator: "greater_than", value: 75 }
        ],
        actions: [
            {
                actionType: "SEND_NOTIFICATION",
                params: {
                    recipientRole: "SALES",
                    message: "High-probability inbound lead captured. Follow-up SLA: 30 minutes."
                }
            },
            {
                actionType: "CREATE_TASK",
                params: {
                    taskTitle: "Schedule Discovery Call with Inbound Prospect",
                    taskPriority: "HIGH",
                    taskDueDays: 1
                }
            }
        ]
    }
]
