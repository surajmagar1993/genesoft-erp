"use server"

import { prisma } from "@/lib/prisma"
import { getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"
import { CommunicationType, LeadStatus } from "@prisma/client"
import type {
    WebFormType,
    WebFormStatus,
    FormSubmissionStatus,
    FormFieldConfig,
    WebFormRecord,
    FormSubmissionRecord,
    WebFormsOverviewKPIs,
    WebFormsOverview,
    CreateWebFormInput,
    UpdateWebFormInput,
    SubmitPublicFormPayload,
} from "./form-types"

// ============================================
// OVERVIEW & AUTO-SEEDER
// ============================================

export async function getWebFormsOverview(
    formId?: string,
    statusFilter?: string
): Promise<WebFormsOverview> {
    const tenantId = await getTenantId()
    if (!tenantId) throw new Error("Authentication required")

    // Auto-seed starter forms and sample submissions if empty
    await autoSeedWebFormsIfEmpty(tenantId)

    // 1. Fetch Forms
    const whereForm: any = { tenantId }
    if (formId) whereForm.id = formId
    if (statusFilter && statusFilter !== "ALL") whereForm.status = statusFilter

    const rawForms = await prisma.webForm.findMany({
        where: whereForm,
        orderBy: { createdAt: "desc" },
    })

    const forms: WebFormRecord[] = rawForms.map((f: any) => ({
        id: f.id,
        tenantId: f.tenantId,
        code: f.code,
        title: f.title,
        description: f.description,
        type: f.type as WebFormType,
        status: f.status as WebFormStatus,
        fields: (f.fields as FormFieldConfig[]) || [],
        submitButtonText: f.submitButtonText,
        successMessage: f.successMessage,
        redirectUrl: f.redirectUrl,
        defaultLeadStatus: f.defaultLeadStatus,
        defaultLeadSource: f.defaultLeadSource,
        assignedTo: f.assignedTo,
        notifyEmail: f.notifyEmail,
        primaryColor: f.primaryColor,
        submissionsCount: f.submissionsCount,
        convertedCount: f.convertedCount,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
    }))

    // 2. Fetch Submissions
    const whereSubmissions: any = { tenantId }
    if (formId) whereSubmissions.webFormId = formId

    const rawSubmissions = await prisma.formSubmission.findMany({
        where: whereSubmissions,
        include: {
            webForm: { select: { id: true, title: true, code: true } },
            lead: { select: { id: true, title: true, status: true } },
            contact: { select: { id: true, displayName: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
    })

    const submissions: FormSubmissionRecord[] = rawSubmissions.map((s: any) => ({
        id: s.id,
        tenantId: s.tenantId,
        webFormId: s.webFormId,
        webForm: s.webForm,
        leadId: s.leadId,
        lead: s.lead,
        contactId: s.contactId,
        contact: s.contact,
        data: (s.data as Record<string, any>) || {},
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        referer: s.referer,
        isSpam: s.isSpam,
        spamScore: s.spamScore,
        status: s.status as FormSubmissionStatus,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
    }))

    // 3. Fetch recent Leads & Contacts
    const leads = await prisma.lead.findMany({
        where: { tenantId },
        select: { id: true, title: true, status: true, contactId: true },
        orderBy: { createdAt: "desc" },
        take: 30,
    })

    const contacts = await prisma.contact.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, displayName: true, email: true },
        orderBy: { displayName: "asc" },
        take: 40,
    })

    // 4. Compute KPIs
    const totalForms = forms.length
    const activeForms = forms.filter((f) => f.status === "ACTIVE").length
    const totalSubmissions = forms.reduce((acc: number, f) => acc + f.submissionsCount, 0)
    const leadsCaptured = forms.reduce((acc: number, f) => acc + f.convertedCount, 0)
    const conversionRate = totalSubmissions > 0 ? Math.round((leadsCaptured / totalSubmissions) * 100) : 85

    return {
        forms,
        submissions,
        leads,
        contacts,
        kpis: {
            totalForms,
            activeForms,
            totalSubmissions,
            leadsCaptured,
            conversionRate,
        },
    }
}

// ============================================
// WEB FORM CRUD ACTIONS
// ============================================

export async function createWebForm(data: CreateWebFormInput): Promise<{
    success?: boolean
    form?: WebFormRecord
    error?: string
}> {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) return { error: "Authentication required" }

        if (!data.title?.trim()) return { error: "Form title is required" }
        if (!data.fields || data.fields.length === 0) {
            return { error: "Please configure at least one form field" }
        }

        const year = new Date().getFullYear()
        const count = await prisma.webForm.count({ where: { tenantId } })
        const code = `FORM-${year}-${String(count + 1).padStart(4, "0")}`

        const created = await prisma.webForm.create({
            data: {
                tenantId,
                code,
                title: data.title.trim(),
                description: data.description?.trim() || null,
                type: data.type || "CONTACT",
                status: "ACTIVE",
                fields: data.fields as any,
                submitButtonText: data.submitButtonText?.trim() || "Submit Request",
                successMessage:
                    data.successMessage?.trim() ||
                    "Thank you! Your inquiry has been received. Our team will contact you shortly.",
                redirectUrl: data.redirectUrl?.trim() || null,
                defaultLeadStatus: (data.defaultLeadStatus as LeadStatus) || LeadStatus.NEW,
                defaultLeadSource: data.defaultLeadSource?.trim() || "web_form",
                assignedTo: data.assignedTo?.trim() || null,
                notifyEmail: data.notifyEmail?.trim() || null,
                primaryColor: data.primaryColor || "#2563eb",
            },
        })

        revalidatePath("/crm/forms")
        return {
            success: true,
            form: {
                ...created,
                type: created.type as WebFormType,
                status: created.status as WebFormStatus,
                fields: (created.fields as FormFieldConfig[]) || [],
                createdAt: created.createdAt.toISOString(),
                updatedAt: created.updatedAt.toISOString(),
            },
        }
    } catch (err: any) {
        console.error("createWebForm error:", err)
        return { error: err.message || "Failed to create web form" }
    }
}

export async function updateWebForm(
    id: string,
    data: UpdateWebFormInput
): Promise<{ success?: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) return { error: "Authentication required" }

        const updateData: any = {}
        if (data.title !== undefined) updateData.title = data.title.trim()
        if (data.description !== undefined) updateData.description = data.description?.trim() || null
        if (data.type !== undefined) updateData.type = data.type
        if (data.status !== undefined) updateData.status = data.status
        if (data.fields !== undefined) updateData.fields = data.fields
        if (data.submitButtonText !== undefined) updateData.submitButtonText = data.submitButtonText.trim()
        if (data.successMessage !== undefined) updateData.successMessage = data.successMessage.trim()
        if (data.redirectUrl !== undefined) updateData.redirectUrl = data.redirectUrl?.trim() || null
        if (data.defaultLeadStatus !== undefined) updateData.defaultLeadStatus = data.defaultLeadStatus
        if (data.defaultLeadSource !== undefined) updateData.defaultLeadSource = data.defaultLeadSource.trim()
        if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo?.trim() || null
        if (data.notifyEmail !== undefined) updateData.notifyEmail = data.notifyEmail?.trim() || null
        if (data.primaryColor !== undefined) updateData.primaryColor = data.primaryColor

        await prisma.webForm.update({
            where: { id },
            data: updateData,
        })

        revalidatePath("/crm/forms")
        return { success: true }
    } catch (err: any) {
        console.error("updateWebForm error:", err)
        return { error: err.message || "Failed to update web form" }
    }
}

export async function deleteWebForm(id: string): Promise<{ success?: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) return { error: "Authentication required" }

        await prisma.webForm.delete({ where: { id } })
        revalidatePath("/crm/forms")
        return { success: true }
    } catch (err: any) {
        console.error("deleteWebForm error:", err)
        return { error: err.message || "Failed to delete web form" }
    }
}

export async function toggleWebFormStatus(
    id: string,
    newStatus: WebFormStatus
): Promise<{ success?: boolean; error?: string }> {
    try {
        await prisma.webForm.update({
            where: { id },
            data: { status: newStatus },
        })

        revalidatePath("/crm/forms")
        return { success: true }
    } catch (err: any) {
        console.error("toggleWebFormStatus error:", err)
        return { error: err.message || "Failed to update form status" }
    }
}

// ============================================
// PUBLIC FORM SUBMISSION HANDLER
// ============================================

export async function submitPublicForm(payload: SubmitPublicFormPayload): Promise<{
    success: boolean
    submissionId?: string
    leadId?: string
    message: string
    redirectUrl?: string | null
    error?: string
}> {
    try {
        // Honeypot spam protection: if hidden honeypot field is filled, silently discard
        if (payload.honeypot && payload.honeypot.trim().length > 0) {
            console.warn("Honeypot triggered on form submission:", payload.formIdOrCode)
            return {
                success: true,
                message: "Thank you! Your submission has been processed.",
            }
        }

        // Find Form by ID or Code
        const form = await prisma.webForm.findFirst({
            where: {
                OR: [{ id: payload.formIdOrCode }, { code: payload.formIdOrCode }],
            },
        })

        if (!form) {
            return { success: false, message: "Form not found", error: "Invalid form identifier" }
        }

        if (form.status !== "ACTIVE") {
            return {
                success: false,
                message: "This form is currently closed to new submissions.",
                error: "Form inactive",
            }
        }

        const data = payload.data || {}
        const tenantId = form.tenantId

        // Extract key contact information from form fields
        const email = (
            data.email ||
            data.work_email ||
            data.business_email ||
            data["Corporate Email"] ||
            data["Work Email"] ||
            ""
        ).toString().trim().toLowerCase()

        const fullName = (
            data.name ||
            data.full_name ||
            data.fullName ||
            data["Full Name"] ||
            data["Contact Name"] ||
            ""
        ).toString().trim()

        const firstName = (
            data.first_name ||
            data.firstName ||
            data["First Name"] ||
            (fullName ? fullName.split(" ")[0] : "")
        ).toString().trim()

        const lastName = (
            data.last_name ||
            data.lastName ||
            data["Last Name"] ||
            (fullName ? fullName.split(" ").slice(1).join(" ") : "")
        ).toString().trim()

        const phone = (
            data.phone ||
            data.phone_number ||
            data.tel ||
            data["Phone"] ||
            data["Phone Number"] ||
            ""
        ).toString().trim()

        const companyName = (
            data.company ||
            data.company_name ||
            data.organization ||
            data["Company"] ||
            data["Company Name"] ||
            ""
        ).toString().trim()

        const notes = (
            data.message ||
            data.inquiry ||
            data.description ||
            data.requirements ||
            data["Message"] ||
            ""
        ).toString().trim()

        // 1. Find or create Contact if email provided
        let resolvedContactId: string | null = null
        if (email) {
            const existingContact = await prisma.contact.findFirst({
                where: { tenantId, email },
            })
            if (existingContact) {
                resolvedContactId = existingContact.id
            } else {
                const newContact = await prisma.contact.create({
                    data: {
                        tenantId,
                        displayName: fullName || companyName || email.split("@")[0],
                        firstName: firstName || null,
                        lastName: lastName || null,
                        email,
                        phone: phone || null,
                        companyName: companyName || null,
                        type: companyName ? "COMPANY" : "INDIVIDUAL",
                    },
                })
                resolvedContactId = newContact.id
            }
        }

        // 2. Create Lead
        const leadTitle = fullName
            ? `${fullName} (${companyName || form.title})`
            : companyName || `Web Lead: ${form.title}`

        const createdLead = await prisma.lead.create({
            data: {
                tenantId,
                contactId: resolvedContactId,
                title: leadTitle,
                source: form.defaultLeadSource || "web_form",
                status: (form.defaultLeadStatus as LeadStatus) || LeadStatus.NEW,
                assignedTo: form.assignedTo || null,
                notes: notes ? `Submitted via [${form.title} (${form.code})]:\n${notes}` : `Submitted via [${form.title} (${form.code})]`,
                score: 25, // Initial engagement score
            },
        })

        // 3. Create FormSubmission
        const submission = await prisma.formSubmission.create({
            data: {
                tenantId,
                webFormId: form.id,
                leadId: createdLead.id,
                contactId: resolvedContactId,
                data,
                ipAddress: payload.ipAddress || null,
                userAgent: payload.userAgent || null,
                referer: payload.referer || null,
                status: "CONVERTED",
            },
        })

        // 4. Update Form Statistics
        await prisma.webForm.update({
            where: { id: form.id },
            data: {
                submissionsCount: { increment: 1 },
                convertedCount: { increment: 1 },
            },
        })

        // 5. Log to CommunicationLog for 360° CRM activity parity
        if (resolvedContactId || createdLead.id) {
            await prisma.communicationLog.create({
                data: {
                    tenantId,
                    type: CommunicationType.NOTE,
                    subject: `Captured via Web Form: ${form.title}`,
                    content: `Web form submission received on ${new Date().toLocaleString()}.\nPayload:\n${JSON.stringify(data, null, 2)}`,
                    loggedAt: new Date(),
                    loggedBy: "Web Form Engine",
                    contactId: resolvedContactId,
                    leadId: createdLead.id,
                },
            })
        }

        revalidatePath("/crm/forms")
        revalidatePath("/crm/leads")

        return {
            success: true,
            submissionId: submission.id,
            leadId: createdLead.id,
            message: form.successMessage,
            redirectUrl: form.redirectUrl,
        }
    } catch (err: any) {
        console.error("submitPublicForm error:", err)
        return {
            success: false,
            message: "An unexpected error occurred while processing your request.",
            error: err.message || "Submission failed",
        }
    }
}

// ============================================
// STARTER AUTO SEEDER (IF EMPTY)
// ============================================

export async function autoSeedWebFormsIfEmpty(tenantId: string): Promise<void> {
    const count = await prisma.webForm.count({ where: { tenantId } })
    if (count > 0) return

    const year = new Date().getFullYear()

    // Form 1: Enterprise Cloud ERP Demo Request
    const demoForm = await prisma.webForm.create({
        data: {
            tenantId,
            code: `FORM-${year}-0001`,
            title: "Enterprise Cloud ERP Demo Request",
            description: "Request a custom product walkthrough, architecture consultation, and SLA pricing review with our solutions team.",
            type: "DEMO_REQUEST",
            status: "ACTIVE",
            submitButtonText: "Schedule Live Product Demo",
            successMessage: "Thank you for scheduling a demo! Our solutions engineer will reach out within 2 hours to confirm your calendar slot.",
            defaultLeadStatus: LeadStatus.NEW,
            defaultLeadSource: "landing_page_demo",
            primaryColor: "#2563eb",
            submissionsCount: 14,
            convertedCount: 12,
            fields: [
                { id: "f1", name: "first_name", label: "First Name", type: "text", required: true, placeholder: "e.g. Rahul" },
                { id: "f2", name: "last_name", label: "Last Name", type: "text", required: true, placeholder: "e.g. Sharma" },
                { id: "f3", name: "work_email", label: "Corporate Email", type: "email", required: true, placeholder: "r.sharma@enterprise.com" },
                { id: "f4", name: "phone", label: "Direct Phone / WhatsApp", type: "tel", required: true, placeholder: "+91 98765 43210" },
                { id: "f5", name: "company", label: "Company / Organization", type: "text", required: true, placeholder: "Acme Logistics Ltd" },
                { id: "f6", name: "employees", label: "Company Size", type: "select", required: false, options: ["1-20 employees", "21-100 employees", "101-500 employees", "500+ enterprise"] },
                { id: "f7", name: "modules", label: "Key Requirements", type: "select", required: false, options: ["All-in-One ERP & GST Invoicing", "CRM & Sales Pipeline", "Multi-Warehouse & Inventory", "Agile Projects & Timesheets"] },
                { id: "f8", name: "message", label: "Specific Project Notes / Timeline", type: "textarea", required: false, placeholder: "Tell us about your current software stack and migration timeline..." },
            ],
        },
    })

    // Form 2: General Contact & Consultation
    const contactForm = await prisma.webForm.create({
        data: {
            tenantId,
            code: `FORM-${year}-0002`,
            title: "Website General Contact & Consultation",
            description: "Have questions about our cloud platform, billing, or enterprise integration? Get in touch with our team.",
            type: "CONTACT",
            status: "ACTIVE",
            submitButtonText: "Send Message",
            successMessage: "Thank you! We have received your inquiry and will reply shortly.",
            defaultLeadStatus: LeadStatus.NEW,
            defaultLeadSource: "website_contact",
            primaryColor: "#059669",
            submissionsCount: 9,
            convertedCount: 7,
            fields: [
                { id: "c1", name: "name", label: "Your Name", type: "text", required: true, placeholder: "e.g. Priya Patel" },
                { id: "c2", name: "email", label: "Email Address", type: "email", required: true, placeholder: "priya@domain.in" },
                { id: "c3", name: "phone", label: "Contact Phone", type: "tel", required: false, placeholder: "+91 98123 45678" },
                { id: "c4", name: "subject", label: "Inquiry Subject", type: "text", required: true, placeholder: "e.g. Multi-currency GST Invoicing question" },
                { id: "c5", name: "message", label: "Message Content", type: "textarea", required: true, placeholder: "How can we assist your business today?" },
            ],
        },
    })

    // Seed sample submissions
    const sampleContact = await prisma.contact.findFirst({ where: { tenantId } })
    const sampleLead = await prisma.lead.findFirst({ where: { tenantId } })

    await prisma.formSubmission.createMany({
        data: [
            {
                tenantId,
                webFormId: demoForm.id,
                leadId: sampleLead ? sampleLead.id : null,
                contactId: sampleContact ? sampleContact.id : null,
                data: {
                    first_name: "Vikram",
                    last_name: "Aditya",
                    work_email: "vikram@zenithtech.in",
                    phone: "+91 98234 56789",
                    company: "Zenith Tech Systems",
                    employees: "101-500 employees",
                    modules: "All-in-One ERP & GST Invoicing",
                    message: "Looking to replace our legacy Tally/SAP hybrid with a unified web ERP.",
                },
                ipAddress: "157.34.120.45",
                userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
                status: "CONVERTED",
                createdAt: new Date(Date.now() - 1000 * 3600 * 3), // 3 hours ago
            },
            {
                tenantId,
                webFormId: demoForm.id,
                leadId: sampleLead ? sampleLead.id : null,
                contactId: sampleContact ? sampleContact.id : null,
                data: {
                    first_name: "Ananya",
                    last_name: "Deshmukh",
                    work_email: "ananya@apexlogistics.com",
                    phone: "+91 97654 32109",
                    company: "Apex Global Logistics",
                    employees: "500+ enterprise",
                    modules: "Multi-Warehouse & Inventory",
                    message: "Need 5 warehouse locations with barcode and cross-docking tracking.",
                },
                ipAddress: "103.21.126.8",
                userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                status: "CONVERTED",
                createdAt: new Date(Date.now() - 1000 * 3600 * 18), // 18 hours ago
            },
            {
                tenantId,
                webFormId: contactForm.id,
                leadId: sampleLead ? sampleLead.id : null,
                contactId: sampleContact ? sampleContact.id : null,
                data: {
                    name: "Rajesh Kulkarni",
                    email: "rajesh@kulkarnigroup.org",
                    phone: "+91 98450 11223",
                    subject: "Custom API Integration & Webhooks",
                    message: "Does your subscription billing support auto-generating e-invoices with IRN?",
                },
                ipAddress: "49.36.192.12",
                userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
                status: "PROCESSED",
                createdAt: new Date(Date.now() - 1000 * 3600 * 36), // 36 hours ago
            },
        ],
    })
}
