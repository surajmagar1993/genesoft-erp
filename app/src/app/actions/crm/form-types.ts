// ============================================
// WEB FORM ENUMS & VALUE CONSTANTS (Shared)
// ============================================

export type WebFormType =
    | "CONTACT"
    | "QUOTE_REQUEST"
    | "DEMO_REQUEST"
    | "FEEDBACK"
    | "SUPPORT"
    | "PARTNERSHIP"

export const WebFormType = {
    CONTACT: "CONTACT" as const,
    QUOTE_REQUEST: "QUOTE_REQUEST" as const,
    DEMO_REQUEST: "DEMO_REQUEST" as const,
    FEEDBACK: "FEEDBACK" as const,
    SUPPORT: "SUPPORT" as const,
    PARTNERSHIP: "PARTNERSHIP" as const,
}

export type WebFormStatus = "ACTIVE" | "DRAFT" | "PAUSED" | "ARCHIVED"

export const WebFormStatus = {
    ACTIVE: "ACTIVE" as const,
    DRAFT: "DRAFT" as const,
    PAUSED: "PAUSED" as const,
    ARCHIVED: "ARCHIVED" as const,
}

export type FormSubmissionStatus = "PROCESSED" | "SPAM" | "CONVERTED" | "FLAGGED"

export const FormSubmissionStatus = {
    PROCESSED: "PROCESSED" as const,
    SPAM: "SPAM" as const,
    CONVERTED: "CONVERTED" as const,
    FLAGGED: "FLAGGED" as const,
}

// ============================================
// FIELD & DATA INTERFACES
// ============================================

export interface FormFieldConfig {
    id: string
    name: string
    label: string
    type: "text" | "email" | "tel" | "textarea" | "select" | "checkbox" | "number"
    required: boolean
    placeholder?: string
    options?: string[]
    defaultValue?: string
}

export interface WebFormRecord {
    id: string
    tenantId: string
    code: string
    title: string
    description?: string | null
    type: WebFormType
    status: WebFormStatus
    fields: FormFieldConfig[]
    submitButtonText: string
    successMessage: string
    redirectUrl?: string | null
    defaultLeadStatus: string
    defaultLeadSource: string
    assignedTo?: string | null
    notifyEmail?: string | null
    primaryColor: string
    submissionsCount: number
    convertedCount: number
    createdAt: string
    updatedAt: string
}

export interface FormSubmissionRecord {
    id: string
    tenantId: string
    webFormId: string
    webForm?: {
        id: string
        title: string
        code: string
    } | null
    leadId?: string | null
    lead?: {
        id: string
        title: string
        status: string
    } | null
    contactId?: string | null
    contact?: {
        id: string
        displayName: string
        email?: string | null
    } | null
    data: Record<string, any>
    ipAddress?: string | null
    userAgent?: string | null
    referer?: string | null
    isSpam: boolean
    spamScore: number
    status: FormSubmissionStatus
    createdAt: string
    updatedAt: string
}

export interface WebFormsOverviewKPIs {
    totalForms: number
    activeForms: number
    totalSubmissions: number
    leadsCaptured: number
    conversionRate: number
}

export interface WebFormsOverview {
    forms: WebFormRecord[]
    submissions: FormSubmissionRecord[]
    leads: Array<{
        id: string
        title: string
        status: string
        contactId?: string | null
    }>
    contacts: Array<{
        id: string
        displayName: string
        email?: string | null
    }>
    kpis: WebFormsOverviewKPIs
}

export interface CreateWebFormInput {
    title: string
    description?: string
    type: WebFormType
    fields: FormFieldConfig[]
    submitButtonText?: string
    successMessage?: string
    redirectUrl?: string
    defaultLeadStatus?: string
    defaultLeadSource?: string
    assignedTo?: string
    notifyEmail?: string
    primaryColor?: string
}

export interface UpdateWebFormInput {
    title?: string
    description?: string
    type?: WebFormType
    status?: WebFormStatus
    fields?: FormFieldConfig[]
    submitButtonText?: string
    successMessage?: string
    redirectUrl?: string
    defaultLeadStatus?: string
    defaultLeadSource?: string
    assignedTo?: string
    notifyEmail?: string
    primaryColor?: string
}

export interface SubmitPublicFormPayload {
    formIdOrCode: string
    data: Record<string, any>
    honeypot?: string
    ipAddress?: string
    userAgent?: string
    referer?: string
}
