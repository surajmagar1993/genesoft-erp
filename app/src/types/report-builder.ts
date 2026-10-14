export type DatasetType =
    | "INVOICES"
    | "INVENTORY"
    | "BILLS"
    | "EXPENSES"
    | "HR_WORKFORCE"
    | "PROJECTS"

export interface ReportFieldMeta {
    key: string
    label: string
    type: "string" | "number" | "date" | "boolean"
    aggregatable: boolean
}

export interface DatasetMeta {
    id: DatasetType
    name: string
    description: string
    category: string
    fields: ReportFieldMeta[]
}

export interface ReportFilterCondition {
    field: string
    operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "between"
    value: string
    secondValue?: string
}

export interface ReportConfig {
    dataset: DatasetType
    title?: string
    selectedFields: string[]
    filters: ReportFilterCondition[]
    groupBy?: string | null
    aggregateField?: string | null
    aggregateFn?: "SUM" | "AVG" | "COUNT" | "MIN" | "MAX" | null
    chartType?: "bar" | "line" | "area" | "pie" | "none"
    sortBy?: string | null
    sortOrder?: "asc" | "desc"
}

export interface SavedReportRecord {
    id: string
    name: string
    description: string | null
    dataset: DatasetType
    config: ReportConfig
    isPrebuilt: boolean
    createdAt: Date
    updatedAt: Date
}

export interface ReportQueryResult {
    columns: { key: string; label: string; type: string }[]
    rows: Record<string, any>[]
    totalCount: number
    summary: {
        aggregateResult: number | null
        aggregateLabel: string | null
        numericTotals: Record<string, number>
    }
    chartData: { name: string; value: number }[]
}

export const DATASET_DEFINITIONS: Record<DatasetType, DatasetMeta> = {
    INVOICES: {
        id: "INVOICES",
        name: "Sales & Tax Invoices",
        description: "Customer sales invoices, line totals, tax breakdown, due dates, and settlement balances.",
        category: "Sales",
        fields: [
            { key: "invoiceNumber", label: "Invoice #", type: "string", aggregatable: false },
            { key: "customerName", label: "Customer", type: "string", aggregatable: false },
            { key: "status", label: "Status", type: "string", aggregatable: false },
            { key: "issueDate", label: "Issue Date", type: "date", aggregatable: false },
            { key: "dueDate", label: "Due Date", type: "date", aggregatable: false },
            { key: "subtotal", label: "Subtotal", type: "number", aggregatable: true },
            { key: "taxTotal", label: "Tax Amount", type: "number", aggregatable: true },
            { key: "total", label: "Grand Total", type: "number", aggregatable: true },
            { key: "balanceDue", label: "Balance Due", type: "number", aggregatable: true },
            { key: "currencyCode", label: "Currency", type: "string", aggregatable: false }
        ]
    },
    INVENTORY: {
        id: "INVENTORY",
        name: "Inventory & Stock Valuations",
        description: "Product catalog, physical warehouse stocks, valuation rates, and reorder levels.",
        category: "Inventory",
        fields: [
            { key: "sku", label: "SKU Code", type: "string", aggregatable: false },
            { key: "name", label: "Product Name", type: "string", aggregatable: false },
            { key: "category", label: "Category", type: "string", aggregatable: false },
            { key: "stock", label: "Stock Quantity", type: "number", aggregatable: true },
            { key: "unitPrice", label: "Selling Price", type: "number", aggregatable: true },
            { key: "costPrice", label: "Cost Price (not tracked)", type: "number", aggregatable: true },
            { key: "stockValue", label: "Stock Value (selling price)", type: "number", aggregatable: true },
            { key: "reorderLevel", label: "Reorder Point", type: "number", aggregatable: false },
            { key: "status", label: "Stock Status", type: "string", aggregatable: false }
        ]
    },
    BILLS: {
        id: "BILLS",
        name: "Accounts Payable (Vendor Bills)",
        description: "Supplier invoices, procurement costs, payment deadlines, and balance obligations.",
        category: "Finance",
        fields: [
            { key: "billNumber", label: "Bill #", type: "string", aggregatable: false },
            { key: "vendorName", label: "Supplier / Vendor", type: "string", aggregatable: false },
            { key: "status", label: "Status", type: "string", aggregatable: false },
            { key: "issueDate", label: "Bill Date", type: "date", aggregatable: false },
            { key: "dueDate", label: "Due Date", type: "date", aggregatable: false },
            { key: "subtotal", label: "Subtotal", type: "number", aggregatable: true },
            { key: "taxTotal", label: "Tax Amount", type: "number", aggregatable: true },
            { key: "total", label: "Total Amount", type: "number", aggregatable: true },
            { key: "balanceDue", label: "Pending Payable", type: "number", aggregatable: true }
        ]
    },
    EXPENSES: {
        id: "EXPENSES",
        name: "Operating Expenses & Overheads",
        description: "Direct expenses, utility bills, employee reimbursements, and payment methods.",
        category: "Finance",
        fields: [
            { key: "expenseNumber", label: "Expense #", type: "string", aggregatable: false },
            { key: "category", label: "Category", type: "string", aggregatable: false },
            { key: "payee", label: "Payee / Merchant", type: "string", aggregatable: false },
            { key: "amount", label: "Amount", type: "number", aggregatable: true },
            { key: "paymentMethod", label: "Payment Method", type: "string", aggregatable: false },
            { key: "date", label: "Expense Date", type: "date", aggregatable: false },
            { key: "taxDeductible", label: "Tax Deductible", type: "boolean", aggregatable: false },
            { key: "status", label: "Status", type: "string", aggregatable: false }
        ]
    },
    HR_WORKFORCE: {
        id: "HR_WORKFORCE",
        name: "Workforce & Compensation",
        description: "Employee headcount, departments, job designations, and monthly salary outlays.",
        category: "HR",
        fields: [
            { key: "employeeNumber", label: "Employee ID", type: "string", aggregatable: false },
            { key: "displayName", label: "Full Name", type: "string", aggregatable: false },
            { key: "department", label: "Department", type: "string", aggregatable: false },
            { key: "designation", label: "Designation", type: "string", aggregatable: false },
            { key: "employmentType", label: "Type", type: "string", aggregatable: false },
            { key: "status", label: "Status", type: "string", aggregatable: false },
            { key: "basicSalary", label: "Monthly Salary", type: "number", aggregatable: true },
            { key: "joiningDate", label: "Joining Date", type: "date", aggregatable: false }
        ]
    },
    PROJECTS: {
        id: "PROJECTS",
        name: "Projects & Task Deliverables",
        description: "Project management deliverables, priorities, deadlines, and allocated work hours.",
        category: "Projects",
        fields: [
            { key: "taskCode", label: "Task Code", type: "string", aggregatable: false },
            { key: "title", label: "Task Title", type: "string", aggregatable: false },
            { key: "projectName", label: "Project", type: "string", aggregatable: false },
            { key: "assignee", label: "Assigned Staff", type: "string", aggregatable: false },
            { key: "status", label: "Status", type: "string", aggregatable: false },
            { key: "priority", label: "Priority", type: "string", aggregatable: false },
            { key: "dueDate", label: "Due Date", type: "date", aggregatable: false },
            { key: "estimatedHours", label: "Est. Hours", type: "number", aggregatable: true }
        ]
    }
}

export const PREBUILT_TEMPLATES: Omit<SavedReportRecord, "id" | "createdAt" | "updatedAt">[] = [
    {
        name: "Sales Invoices & Revenue Breakdown",
        description: "Comprehensive customer invoice registry with subtotal, tax amount, and balance due.",
        dataset: "INVOICES",
        isPrebuilt: true,
        config: {
            dataset: "INVOICES",
            title: "Sales Invoices & Revenue Breakdown",
            selectedFields: ["invoiceNumber", "customerName", "status", "issueDate", "total", "balanceDue"],
            filters: [],
            groupBy: "customerName",
            aggregateField: "total",
            aggregateFn: "SUM",
            chartType: "bar",
            sortBy: "total",
            sortOrder: "desc"
        }
    },
    {
        name: "Inventory Valuation & Stock Health",
        description: "Stock holdings, inventory asset valuation, and unit prices by product category.",
        dataset: "INVENTORY",
        isPrebuilt: true,
        config: {
            dataset: "INVENTORY",
            title: "Inventory Valuation & Stock Health",
            selectedFields: ["sku", "name", "category", "stock", "unitPrice", "stockValue", "status"],
            filters: [],
            groupBy: "category",
            aggregateField: "stockValue",
            aggregateFn: "SUM",
            chartType: "pie",
            sortBy: "stockValue",
            sortOrder: "desc"
        }
    },
    {
        name: "Accounts Payable & Vendor Obligations",
        description: "Outstanding supplier bills grouped by vendor with pending payable balances.",
        dataset: "BILLS",
        isPrebuilt: true,
        config: {
            dataset: "BILLS",
            title: "Accounts Payable & Vendor Obligations",
            selectedFields: ["billNumber", "vendorName", "status", "issueDate", "dueDate", "total", "balanceDue"],
            filters: [],
            groupBy: "vendorName",
            aggregateField: "balanceDue",
            aggregateFn: "SUM",
            chartType: "bar",
            sortBy: "balanceDue",
            sortOrder: "desc"
        }
    },
    {
        name: "Operating Expenses by Category",
        description: "Expense allocation across operational heads and cost centers.",
        dataset: "EXPENSES",
        isPrebuilt: true,
        config: {
            dataset: "EXPENSES",
            title: "Operating Expenses by Category",
            selectedFields: ["expenseNumber", "category", "payee", "amount", "paymentMethod", "date"],
            filters: [],
            groupBy: "category",
            aggregateField: "amount",
            aggregateFn: "SUM",
            chartType: "bar",
            sortBy: "amount",
            sortOrder: "desc"
        }
    },
    {
        name: "Workforce Compensation by Department",
        description: "Headcount and salary expenditure distributed across organizational teams.",
        dataset: "HR_WORKFORCE",
        isPrebuilt: true,
        config: {
            dataset: "HR_WORKFORCE",
            title: "Workforce Compensation by Department",
            selectedFields: ["employeeNumber", "displayName", "department", "designation", "basicSalary", "status"],
            filters: [],
            groupBy: "department",
            aggregateField: "basicSalary",
            aggregateFn: "SUM",
            chartType: "bar",
            sortBy: "basicSalary",
            sortOrder: "desc"
        }
    }
]
