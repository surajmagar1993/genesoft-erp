/**
 * SYSTEM TRANSACTIONAL EMAIL TEMPLATE ENGINE
 * 
 * Provides standardized email templates, merge tag compilation,
 * responsive HTML layout generation, and mock data for all
 * system transactional communications.
 */

export type SystemTemplateKey =
    | "INVOICE_SENT"
    | "PAYMENT_RECEIPT"
    | "WELCOME_ONBOARDING"
    | "PAYMENT_OVERDUE_ALERT"
    | "SUPPORT_TICKET_UPDATE"
    | "CREDIT_NOTE_ISSUED"

export type EmailTemplateCategory = "BILLING" | "ONBOARDING" | "SUPPORT" | "DUNNING" | "SALES"

export interface MergeTagDefinition {
    tag: string
    label: string
    description: string
    sampleValue: string
}

export interface SystemTemplateDefinition {
    key: SystemTemplateKey
    name: string
    description: string
    category: EmailTemplateCategory
    subject: string
    bodyHtml: string
    bodyText: string
    mergeTags: MergeTagDefinition[]
    mockVariables: Record<string, string>
    isActive: boolean
}

export interface CompiledEmail {
    subject: string
    html: string
    text: string
    renderedVariables: Record<string, string>
}

// ---------------------------------------------------------------------------
// HTML Email Wrapper Boilerplate (Responsive & Cross-Client Compatible)
// ---------------------------------------------------------------------------

export function wrapEmailHtml(params: {
    title: string
    bodyContent: string
    previewText?: string
    companyName?: string
    actionButton?: { label: string; url: string }
}): string {
    const { title, bodyContent, previewText = "", companyName = "Genesoft ERP", actionButton } = params

    const buttonSnippet = actionButton
        ? `
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
            <tr>
                <td align="center" style="border-radius: 8px; background-color: #2563eb;">
                    <a href="${actionButton.url}" target="_blank" style="font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-weight: 600; color: #ffffff; text-decoration: none; display: inline-block; padding: 12px 24px; border-radius: 8px; background: linear-gradient(135deg, #2563eb, #1d4ed8); border: 1px solid #1d4ed8; letter-spacing: 0.02em;">
                        ${actionButton.label} &rarr;
                    </a>
                </td>
            </tr>
        </table>
        `
        : ""

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${title}</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style>
        body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
        table { border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; }
        td { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; vertical-align: top; }
        a { color: #2563eb; text-decoration: none; }
        .data-table { width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
        .data-table td { padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
        .data-table tr:last-child td { border-bottom: none; }
        .badge-pill { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    </style>
</head>
<body style="background-color: #f8fafc; margin: 0; padding: 24px 12px;">
    ${previewText ? `<div style="display: none; max-height: 0px; overflow: hidden;">${previewText}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ""}
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); overflow: hidden;">
        <!-- Header -->
        <tr>
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #0f172a, #1e293b); color: #ffffff;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                    <tr>
                        <td>
                            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 4px;">System Notification</div>
                            <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; line-height: 1.3;">${title}</h1>
                        </td>
                        <td align="right" style="vertical-align: middle;">
                            <span style="display: inline-block; padding: 6px 12px; border-radius: 6px; background-color: rgba(255, 255, 255, 0.1); color: #f8fafc; font-size: 12px; font-weight: 600; border: 1px solid rgba(255, 255, 255, 0.15);">
                                ${companyName}
                            </span>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>

        <!-- Main Body -->
        <tr>
            <td style="padding: 32px; color: #1e293b; line-height: 1.6;">
                ${bodyContent}
                ${buttonSnippet}
            </td>
        </tr>

        <!-- Footer -->
        <tr>
            <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; line-height: 1.5;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                    <tr>
                        <td>
                            <p style="margin: 0 0 8px 0; font-weight: 600; color: #334155;">${companyName} Platform Operations</p>
                            <p style="margin: 0; color: #94a3b8;">This is an automated system dispatch. Please do not reply directly unless specified. For assistance, contact your administrator or reply to the support desk.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// 6 Core System Email Templates Definitions
// ---------------------------------------------------------------------------

export const SYSTEM_EMAIL_TEMPLATES: Record<SystemTemplateKey, SystemTemplateDefinition> = {
    INVOICE_SENT: {
        key: "INVOICE_SENT",
        name: "Invoice Issued & Dispatch",
        description: "Sent to the client when a Tax Invoice or Proforma Invoice is issued, including grand total, due date, and digital payment link.",
        category: "BILLING",
        subject: "Invoice {{invoice_number}} from {{company_name}} [Amount: {{currency}} {{grand_total}}]",
        bodyHtml: `
<p>Dear <strong>{{customer_name}}</strong>,</p>

<p>Thank you for your business. Please find attached your <strong>{{document_label}}</strong> for recent services/goods rendered.</p>

<table class="data-table" role="presentation">
    <tr>
        <td style="color: #64748b; width: 40%; font-weight: 500;">Invoice Reference</td>
        <td style="font-weight: 700; color: #0f172a;">{{invoice_number}}</td>
    </tr>
    <tr>
        <td style="color: #64748b; font-weight: 500;">Invoice Date</td>
        <td>{{invoice_date}}</td>
    </tr>
    <tr>
        <td style="color: #64748b; font-weight: 500;">Due Date</td>
        <td style="font-weight: 600; color: #dc2626;">{{due_date}}</td>
    </tr>
    <tr>
        <td style="color: #64748b; font-weight: 500;">Grand Total</td>
        <td style="font-size: 16px; font-weight: 800; color: #1e40af;">{{currency}} {{grand_total}}</td>
    </tr>
    <tr>
        <td style="color: #64748b; font-weight: 500;">Payment Status</td>
        <td><span class="badge-pill" style="background-color: #fef3c7; color: #92400e;">{{payment_status}}</span></td>
    </tr>
</table>

<p>You can instantly view, verify, and complete payment online via our secure customer billing portal:</p>

<p style="margin-top: 24px; font-size: 13px; color: #64748b;">
    If you have any questions regarding line items or tax assessments, please contact us at <a href="mailto:{{support_email}}">{{support_email}}</a>.
</p>
`,
        bodyText: `Dear {{customer_name}},

Please find your {{document_label}} {{invoice_number}} from {{company_name}}.

Summary:
- Invoice Number: {{invoice_number}}
- Issue Date: {{invoice_date}}
- Due Date: {{due_date}}
- Total Due: {{currency}} {{grand_total}}
- Payment Status: {{payment_status}}

Pay securely online: {{payment_link}}

If you have questions, please email {{support_email}}.

Regards,
{{company_name}} Finance Team`,
        mergeTags: [
            { tag: "customer_name", label: "Customer Name", description: "Full name or company name of the recipient", sampleValue: "Acme Enterprises" },
            { tag: "company_name", label: "Issuer Company", description: "Name of the billing tenant or company", sampleValue: "Genesoft Technologies" },
            { tag: "document_label", label: "Document Type", description: "Tax Invoice or Proforma Invoice", sampleValue: "Tax Invoice" },
            { tag: "invoice_number", label: "Invoice Number", description: "Official sequential invoice code", sampleValue: "INV-2026-0842" },
            { tag: "invoice_date", label: "Issue Date", description: "Date invoice was generated", sampleValue: "12 Sep 2026" },
            { tag: "due_date", label: "Due Date", description: "Payment due date", sampleValue: "26 Sep 2026" },
            { tag: "currency", label: "Currency Code", description: "ISO Currency code or symbol", sampleValue: "INR" },
            { tag: "grand_total", label: "Grand Total", description: "Final payable amount including all taxes", sampleValue: "47,200.00" },
            { tag: "payment_status", label: "Payment Status", description: "Current invoice status (UNPAID, PARTIAL)", sampleValue: "UNPAID" },
            { tag: "payment_link", label: "Payment URL", description: "Direct payment or portal link", sampleValue: "https://erp.genesoft.ai/portal/pay/INV-2026-0842" },
            { tag: "support_email", label: "Support Email", description: "Invoicing support email", sampleValue: "billing@genesoft.ai" },
        ],
        mockVariables: {
            customer_name: "Acme Global Solutions",
            company_name: "Genesoft Cloud ERP",
            document_label: "Tax Invoice",
            invoice_number: "INV-2026-0842",
            invoice_date: "12 Sep 2026",
            due_date: "26 Sep 2026",
            currency: "INR",
            grand_total: "47,200.00",
            payment_status: "UNPAID",
            payment_link: "https://erp.genesoft.ai/portal/pay/INV-2026-0842",
            support_email: "billing@genesoft.ai",
        },
        isActive: true,
    },

    PAYMENT_RECEIPT: {
        key: "PAYMENT_RECEIPT",
        name: "Payment Confirmation & Receipt",
        description: "Sent to customers immediately upon successful settlement of an invoice or partial payment.",
        category: "BILLING",
        subject: "Payment Receipt {{receipt_number}} for Invoice {{invoice_number}} [{{currency}} {{amount_paid}}]",
        bodyHtml: `
<p>Dear <strong>{{customer_name}}</strong>,</p>

<p>We have successfully processed your payment. Thank you for your prompt settlement.</p>

<table class="data-table" role="presentation">
    <tr>
        <td style="color: #64748b; width: 40%; font-weight: 500;">Receipt Number</td>
        <td style="font-weight: 700; color: #0f172a;">{{receipt_number}}</td>
    </tr>
    <tr>
        <td style="color: #64748b; font-weight: 500;">Applied Invoice</td>
        <td style="font-weight: 600;">{{invoice_number}}</td>
    </tr>
    <tr>
        <td style="color: #64748b; font-weight: 500;">Payment Date</td>
        <td>{{payment_date}}</td>
    </tr>
    <tr>
        <td style="color: #64748b; font-weight: 500;">Payment Method</td>
        <td>{{payment_method}}</td>
    </tr>
    <tr>
        <td style="color: #64748b; font-weight: 500;">Reference / UTR</td>
        <td style="font-family: monospace; font-size: 12px;">{{transaction_ref}}</td>
    </tr>
    <tr>
        <td style="color: #64748b; font-weight: 500;">Amount Paid</td>
        <td style="font-size: 16px; font-weight: 800; color: #16a34a;">{{currency}} {{amount_paid}}</td>
    </tr>
    <tr>
        <td style="color: #64748b; font-weight: 500;">Remaining Balance</td>
        <td style="font-weight: 600; color: {{remaining_color}};">{{currency}} {{remaining_balance}}</td>
    </tr>
</table>

<p>Your ledger and customer statement have been updated in real-time. You can download an official PDF receipt or view your full statement anytime:</p>
`,
        bodyText: `Dear {{customer_name}},

Thank you for your payment! Here are your transaction details:

- Receipt Number: {{receipt_number}}
- Invoice: {{invoice_number}}
- Date: {{payment_date}}
- Method: {{payment_method}}
- Reference: {{transaction_ref}}
- Amount Paid: {{currency}} {{amount_paid}}
- Remaining Balance: {{currency}} {{remaining_balance}}

View Account Statement: {{statement_url}}

Regards,
{{company_name}} Accounts Team`,
        mergeTags: [
            { tag: "customer_name", label: "Customer Name", description: "Name of the customer", sampleValue: "Acme Enterprises" },
            { tag: "company_name", label: "Issuer Company", description: "Billing company name", sampleValue: "Genesoft Technologies" },
            { tag: "receipt_number", label: "Receipt Number", description: "Sequential receipt code", sampleValue: "RCPT-2026-0319" },
            { tag: "invoice_number", label: "Invoice Number", description: "Target invoice reference", sampleValue: "INV-2026-0842" },
            { tag: "payment_date", label: "Payment Date", description: "Date of transaction settlement", sampleValue: "12 Sep 2026" },
            { tag: "payment_method", label: "Method", description: "Bank Transfer, UPI, Credit Card, Cash", sampleValue: "UPI / IMPS" },
            { tag: "transaction_ref", label: "Txn / UTR Ref", description: "Bank reference or transaction ID", sampleValue: "UTR729183641029" },
            { tag: "currency", label: "Currency Code", description: "Currency code", sampleValue: "INR" },
            { tag: "amount_paid", label: "Amount Paid", description: "Settled payment amount", sampleValue: "47,200.00" },
            { tag: "remaining_balance", label: "Remaining Balance", description: "Remaining balance on invoice", sampleValue: "0.00" },
            { tag: "statement_url", label: "Statement URL", description: "Link to customer statement in portal", sampleValue: "https://erp.genesoft.ai/portal/statement" },
        ],
        mockVariables: {
            customer_name: "Acme Global Solutions",
            company_name: "Genesoft Cloud ERP",
            receipt_number: "RCPT-2026-0319",
            invoice_number: "INV-2026-0842",
            payment_date: "12 Sep 2026",
            payment_method: "Bank Transfer (NEFT/RTGS)",
            transaction_ref: "UTR729183641029",
            currency: "INR",
            amount_paid: "47,200.00",
            remaining_balance: "0.00",
            remaining_color: "#16a34a",
            statement_url: "https://erp.genesoft.ai/portal/statement",
        },
        isActive: true,
    },

    WELCOME_ONBOARDING: {
        key: "WELCOME_ONBOARDING",
        name: "Welcome & Onboarding Credentials",
        description: "Sent to new workspace members or SaaS tenant administrators upon workspace creation.",
        category: "ONBOARDING",
        subject: "Welcome to {{company_name}} — Let's Set Up Your Workspace",
        bodyHtml: `
<p>Hello <strong>{{user_name}}</strong>,</p>

<p>Welcome to <strong>{{company_name}}</strong>! Your workspace for <strong>{{tenant_name}}</strong> is ready for production.</p>

<div style="background-color: #f1f5f9; border-left: 4px solid #2563eb; padding: 16px 20px; border-radius: 4px; margin: 24px 0;">
    <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #1e293b;">Your Account Details</p>
    <p style="margin: 0; font-size: 13px; color: #475569;">
        <strong>Login Email:</strong> {{user_email}}<br>
        <strong>Workspace Subdomain:</strong> {{tenant_slug}}.genesoft.ai<br>
        <strong>Initial Role:</strong> {{user_role}}
    </p>
</div>

<p>To get your organization running smoothly, we recommend completing these 3 quick initial steps:</p>

<ol style="padding-left: 20px; color: #334155; line-height: 1.8;">
    <li><strong>Verify Company Settings:</strong> Add your GSTIN/TRN/ABN, company address, and bank account for automated billing.</li>
    <li><strong>Invite Team Members:</strong> Assign roles (Admin, Sales, Accountant, Inventory Manager) to your staff.</li>
    <li><strong>Import Data:</strong> Rapidly load your existing contacts, product catalogs, and opening ledger balances.</li>
</ol>

<p>Click below to log in and start configuring your workspace:</p>
`,
        bodyText: `Hello {{user_name}},

Welcome to {{company_name}}! Your workspace for {{tenant_name}} is ready.

Account Details:
- Login Email: {{user_email}}
- Workspace: {{tenant_slug}}.genesoft.ai
- Role: {{user_role}}

Get started by logging in: {{login_url}}

If you need any help, check our documentation at {{setup_guide_url}} or reply to {{support_email}}.

Best regards,
The {{company_name}} Team`,
        mergeTags: [
            { tag: "user_name", label: "User Name", description: "First name or full name of recipient", sampleValue: "Sarah Connor" },
            { tag: "user_email", label: "User Email", description: "Email address used for sign in", sampleValue: "sarah@acmecorp.com" },
            { tag: "company_name", label: "Platform Name", description: "Name of the ERP SaaS platform", sampleValue: "Genesoft ERP" },
            { tag: "tenant_name", label: "Tenant Organization", description: "Company or tenant account name", sampleValue: "Acme Manufacturing Ltd" },
            { tag: "tenant_slug", label: "Subdomain / Slug", description: "Tenant unique domain identifier", sampleValue: "acme" },
            { tag: "user_role", label: "Assigned Role", description: "User permission role (SUPER_ADMIN, TENANT_ADMIN)", sampleValue: "TENANT_ADMIN" },
            { tag: "login_url", label: "Login URL", description: "Direct authentication gateway", sampleValue: "https://erp.genesoft.ai/login" },
            { tag: "setup_guide_url", label: "Setup Guide URL", description: "Quickstart documentation link", sampleValue: "https://docs.genesoft.ai/quickstart" },
            { tag: "support_email", label: "Support Email", description: "Customer success contact email", sampleValue: "support@genesoft.ai" },
        ],
        mockVariables: {
            user_name: "Sarah Connor",
            user_email: "sarah@acme.com",
            company_name: "Genesoft ERP",
            tenant_name: "Acme Industrial Group",
            tenant_slug: "acme",
            user_role: "TENANT_ADMIN",
            login_url: "https://erp.genesoft.ai/login",
            setup_guide_url: "https://docs.genesoft.ai/quickstart",
            support_email: "support@genesoft.ai",
        },
        isActive: true,
    },

    PAYMENT_OVERDUE_ALERT: {
        key: "PAYMENT_OVERDUE_ALERT",
        name: "Payment Overdue & Dunning Notice",
        description: "Automated dunning notification dispatched when an invoice has passed its statutory due date without full settlement.",
        category: "DUNNING",
        subject: "ACTION REQUIRED: Invoice {{invoice_number}} is {{days_overdue}} days overdue [{{currency}} {{outstanding_amount}}]",
        bodyHtml: `
<p>Dear <strong>{{customer_name}}</strong>,</p>

<p>Our records indicate that the following invoice remains outstanding and is now past its designated payment due date.</p>

<div style="background-color: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #ef4444; padding: 16px 20px; border-radius: 6px; margin: 20px 0;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%;">
        <tr>
            <td style="color: #991b1b; font-weight: 700; font-size: 14px;">Urgent Notice: Payment Overdue</td>
            <td align="right" style="color: #b91c1c; font-weight: 800; font-size: 13px;">{{days_overdue}} DAYS OVERDUE</td>
        </tr>
    </table>
</div>

<table class="data-table" role="presentation">
    <tr>
        <td style="color: #64748b; width: 40%; font-weight: 500;">Invoice Number</td>
        <td style="font-weight: 700; color: #0f172a;">{{invoice_number}}</td>
    </tr>
    <tr>
        <td style="color: #64748b; font-weight: 500;">Original Due Date</td>
        <td style="font-weight: 600; color: #dc2626;">{{due_date}}</td>
    </tr>
    <tr>
        <td style="color: #64748b; font-weight: 500;">Outstanding Amount</td>
        <td style="font-size: 16px; font-weight: 800; color: #dc2626;">{{currency}} {{outstanding_amount}}</td>
    </tr>
</table>

<p>To prevent service interruption, credit limit suspension, or statutory interest accrual, please settle the balance today using the direct payment gateway below:</p>

<p style="margin-top: 24px; font-size: 13px; color: #64748b;">
    If you have already remitted payment in the last 24 hours, please disregard this notice or reply with the bank transaction UTR reference to <a href="mailto:{{finance_contact}}">{{finance_contact}}</a>.
</p>
`,
        bodyText: `Dear {{customer_name}},

URGENT: Invoice {{invoice_number}} is {{days_overdue}} days overdue.

Details:
- Invoice: {{invoice_number}}
- Due Date: {{due_date}}
- Outstanding: {{currency}} {{outstanding_amount}}

Please settle your account immediately via our secure link:
{{payment_link}}

If you have already sent payment, please email your transaction UTR to {{finance_contact}}.

Regards,
{{company_name}} Credit Control`,
        mergeTags: [
            { tag: "customer_name", label: "Customer Name", description: "Recipient contact or business name", sampleValue: "Zenith Retail Corp" },
            { tag: "company_name", label: "Creditor Company", description: "Billing company name", sampleValue: "Genesoft Technologies" },
            { tag: "invoice_number", label: "Invoice Number", description: "Overdue invoice number", sampleValue: "INV-2026-0710" },
            { tag: "due_date", label: "Due Date", description: "Original due date", sampleValue: "28 Aug 2026" },
            { tag: "days_overdue", label: "Days Overdue", description: "Number of elapsed calendar days overdue", sampleValue: "15" },
            { tag: "currency", label: "Currency Code", description: "Currency code", sampleValue: "INR" },
            { tag: "outstanding_amount", label: "Outstanding Balance", description: "Remaining unpaid amount", sampleValue: "28,500.00" },
            { tag: "payment_link", label: "Direct Payment Link", description: "Immediate settlement checkout URL", sampleValue: "https://erp.genesoft.ai/portal/pay/INV-2026-0710" },
            { tag: "finance_contact", label: "Finance Email", description: "Credit control or billing team email", sampleValue: "collections@genesoft.ai" },
        ],
        mockVariables: {
            customer_name: "Zenith Retail Corp",
            company_name: "Genesoft Cloud ERP",
            invoice_number: "INV-2026-0710",
            due_date: "28 Aug 2026",
            days_overdue: "15",
            currency: "INR",
            outstanding_amount: "28,500.00",
            payment_link: "https://erp.genesoft.ai/portal/pay/INV-2026-0710",
            finance_contact: "collections@genesoft.ai",
        },
        isActive: true,
    },

    SUPPORT_TICKET_UPDATE: {
        key: "SUPPORT_TICKET_UPDATE",
        name: "Support Ticket Response & Status",
        description: "Sent to customers when an engineer replies or when a support ticket status changes (In Progress, Resolved, Closed).",
        category: "SUPPORT",
        subject: "[Ticket #{{ticket_id}}] {{ticket_title}} — Status: {{ticket_status}}",
        bodyHtml: `
<p>Hello <strong>{{customer_name}}</strong>,</p>

<p>Your support ticket has been updated with a new response from our support engineering team.</p>

<table class="data-table" role="presentation">
    <tr>
        <td style="color: #64748b; width: 40%; font-weight: 500;">Ticket Reference</td>
        <td style="font-weight: 700; color: #0f172a;">#{{ticket_id}}</td>
    </tr>
    <tr>
        <td style="color: #64748b; font-weight: 500;">Subject</td>
        <td style="font-weight: 600;">{{ticket_title}}</td>
    </tr>
    <tr>
        <td style="color: #64748b; font-weight: 500;">Current Status</td>
        <td><span class="badge-pill" style="background-color: #dbeafe; color: #1e40af;">{{ticket_status}}</span></td>
    </tr>
    <tr>
        <td style="color: #64748b; font-weight: 500;">Staff Agent</td>
        <td>{{agent_name}}</td>
    </tr>
</table>

<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 20px; margin: 20px 0;">
    <p style="margin: 0 0 8px 0; font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.05em;">Latest Message:</p>
    <div style="font-size: 14px; color: #334155; line-height: 1.6; white-space: pre-line;">{{latest_message}}</div>
</div>

<p>You can track the entire conversation history, upload attachments, or add replies directly in the support portal:</p>
`,
        bodyText: `Hello {{customer_name}},

Your ticket #{{ticket_id}} ("{{ticket_title}}") has been updated by {{agent_name}}.
Status: {{ticket_status}}

Latest message:
----------------------------------------
{{latest_message}}
----------------------------------------

View ticket & reply: {{ticket_url}}

Regards,
{{company_name}} Support Team`,
        mergeTags: [
            { tag: "customer_name", label: "Customer Name", description: "Name of the ticket requester", sampleValue: "Alex Morgan" },
            { tag: "company_name", label: "Support Desk", description: "Platform or company name", sampleValue: "Genesoft Support" },
            { tag: "ticket_id", label: "Ticket ID", description: "Sequential or alphanumeric ticket code", sampleValue: "TKT-8902" },
            { tag: "ticket_title", label: "Ticket Title", description: "Summary subject of the issue", sampleValue: "API Webhook payload signature failure" },
            { tag: "ticket_status", label: "Status", description: "OPEN, IN_PROGRESS, RESOLVED, CLOSED", sampleValue: "IN_PROGRESS" },
            { tag: "agent_name", label: "Agent Name", description: "Support engineer who responded", sampleValue: "David Kim" },
            { tag: "latest_message", label: "Latest Response", description: "Snippet of the latest reply content", sampleValue: "We have reviewed your webhook verification endpoint. The HMAC header was mismatched due to leading whitespace. We have pushed a patch to resolve this." },
            { tag: "ticket_url", label: "Ticket Portal URL", description: "Direct link to customer support ticket", sampleValue: "https://erp.genesoft.ai/portal/tickets/TKT-8902" },
        ],
        mockVariables: {
            customer_name: "Alex Morgan",
            company_name: "Genesoft Helpdesk",
            ticket_id: "TKT-8902",
            ticket_title: "Webhook delivery failure on Order Created",
            ticket_status: "IN_PROGRESS",
            agent_name: "David Kim (Lead DevOps)",
            latest_message: "We analyzed your webhook payloads and identified a transient timeout with your internal endpoint. We have re-queued the pending 4 events with exponential backoff.",
            ticket_url: "https://erp.genesoft.ai/portal/tickets/TKT-8902",
        },
        isActive: true,
    },

    CREDIT_NOTE_ISSUED: {
        key: "CREDIT_NOTE_ISSUED",
        name: "Credit Note & Refund Allocation",
        description: "Sent when goods are returned, discounts applied, or a credit memo / refund voucher is created against a customer balance.",
        category: "BILLING",
        subject: "Credit Note {{credit_note_number}} Issued [{{currency}} {{refund_amount}}]",
        bodyHtml: `
<p>Dear <strong>{{customer_name}}</strong>,</p>

<p>A credit note has been credited to your account regarding invoice <strong>{{invoice_number}}</strong>.</p>

<table class="data-table" role="presentation">
    <tr>
        <td style="color: #64748b; width: 40%; font-weight: 500;">Credit Note Reference</td>
        <td style="font-weight: 700; color: #0f172a;">{{credit_note_number}}</td>
    </tr>
    <tr>
        <td style="color: #64748b; font-weight: 500;">Related Invoice</td>
        <td style="font-weight: 600;">{{invoice_number}}</td>
    </tr>
    <tr>
        <td style="color: #64748b; font-weight: 500;">Issue Date</td>
        <td>{{issue_date}}</td>
    </tr>
    <tr>
        <td style="color: #64748b; font-weight: 500;">Reason</td>
        <td>{{reason}}</td>
    </tr>
    <tr>
        <td style="color: #64748b; font-weight: 500;">Credited Amount</td>
        <td style="font-size: 16px; font-weight: 800; color: #0284c7;">{{currency}} {{refund_amount}}</td>
    </tr>
    <tr>
        <td style="color: #64748b; font-weight: 500;">Available Credit Balance</td>
        <td style="font-weight: 700; color: #0f172a;">{{currency}} {{remaining_credit}}</td>
    </tr>
</table>

<p>This credit balance can be applied towards upcoming invoices or refunded to your primary payment method upon request.</p>
`,
        bodyText: `Dear {{customer_name}},

A credit note {{credit_note_number}} has been issued for invoice {{invoice_number}}.

Details:
- Credit Note: {{credit_note_number}}
- Invoice Ref: {{invoice_number}}
- Date: {{issue_date}}
- Reason: {{reason}}
- Amount: {{currency}} {{refund_amount}}
- Available Credit Balance: {{currency}} {{remaining_credit}}

View in portal: {{portal_url}}

Regards,
{{company_name}} Finance Team`,
        mergeTags: [
            { tag: "customer_name", label: "Customer Name", description: "Customer or company recipient", sampleValue: "Pacific Retailers Ltd" },
            { tag: "company_name", label: "Issuer Company", description: "Issuing company name", sampleValue: "Genesoft Technologies" },
            { tag: "credit_note_number", label: "Credit Note #", description: "Unique credit note reference", sampleValue: "CN-2026-0045" },
            { tag: "invoice_number", label: "Invoice #", description: "Original invoice reference", sampleValue: "INV-2026-0599" },
            { tag: "issue_date", label: "Issue Date", description: "Date of credit note generation", sampleValue: "12 Sep 2026" },
            { tag: "reason", label: "Reason Code", description: "Goods return, overbilling, discount", sampleValue: "Goods Return & Restock" },
            { tag: "currency", label: "Currency Code", description: "Currency code", sampleValue: "INR" },
            { tag: "refund_amount", label: "Credited Amount", description: "Total credit amount", sampleValue: "6,400.00" },
            { tag: "remaining_credit", label: "Remaining Credit", description: "Unallocated balance remaining", sampleValue: "6,400.00" },
            { tag: "portal_url", label: "Portal URL", description: "Link to customer account", sampleValue: "https://erp.genesoft.ai/portal" },
            { tag: "support_email", label: "Support Email", description: "Billing contact email", sampleValue: "billing@genesoft.ai" },
        ],
        mockVariables: {
            customer_name: "Pacific Retailers Ltd",
            company_name: "Genesoft Cloud ERP",
            credit_note_number: "CN-2026-0045",
            invoice_number: "INV-2026-0599",
            issue_date: "12 Sep 2026",
            reason: "Defective Inventory Return",
            currency: "INR",
            refund_amount: "6,400.00",
            remaining_credit: "6,400.00",
            portal_url: "https://erp.genesoft.ai/portal",
            support_email: "billing@genesoft.ai",
        },
        isActive: true,
    },
}

// ---------------------------------------------------------------------------
// Template Interpolation & Compiler Utilities
// ---------------------------------------------------------------------------

/**
 * Interpolates all {{tag}} tokens within a string using the provided variable map.
 * Safely handles missing variables without crashing.
 */
export function interpolateMergeTags(
    templateText: string,
    variables: Record<string, string | number | undefined | null>
): string {
    if (!templateText) return ""

    return templateText.replace(/{{\s*([a-zA-Z0-9_-]+)\s*}}/g, (match, tagKey) => {
        const val = variables[tagKey]
        if (val !== undefined && val !== null) {
            return String(val)
        }
        return match // Preserve token if not supplied
    })
}

/**
 * Compiles a system transactional email with custom overrides and wraps in responsive HTML.
 */
export function compileSystemEmail(params: {
    templateKey: SystemTemplateKey
    customSubject?: string
    customBodyHtml?: string
    customBodyText?: string
    variables?: Record<string, string>
    actionButton?: { label: string; url: string }
}): CompiledEmail {
    const { templateKey, customSubject, customBodyHtml, customBodyText, variables = {}, actionButton } = params
    const definition = SYSTEM_EMAIL_TEMPLATES[templateKey]

    if (!definition) {
        throw new Error(`Unknown system template key: ${templateKey}`)
    }

    // Merge mock variables as fallback defaults
    const resolvedVars = {
        ...definition.mockVariables,
        ...variables,
    }

    const rawSubject = customSubject || definition.subject
    const rawHtml = customBodyHtml || definition.bodyHtml
    const rawText = customBodyText || definition.bodyText

    const compiledSubject = interpolateMergeTags(rawSubject, resolvedVars)
    const compiledInnerHtml = interpolateMergeTags(rawHtml, resolvedVars)
    const compiledText = interpolateMergeTags(rawText, resolvedVars)

    // Wrap in standard responsive layout
    const finalHtml = wrapEmailHtml({
        title: compiledSubject,
        bodyContent: compiledInnerHtml,
        companyName: resolvedVars["company_name"] || "Genesoft ERP",
        actionButton: actionButton || (resolvedVars["payment_link"] ? { label: "Pay Securely Online", url: resolvedVars["payment_link"] } : undefined),
    })

    return {
        subject: compiledSubject,
        html: finalHtml,
        text: compiledText,
        renderedVariables: resolvedVars,
    }
}
