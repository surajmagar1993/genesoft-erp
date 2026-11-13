-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "public"."ApplicantStage" AS ENUM ('APPLIED', 'SCREENING', 'INTERVIEWING', 'OFFERED', 'HIRED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."AppraisalCycleStatus" AS ENUM ('PLANNING', 'ACTIVE', 'EVALUATION', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."AssetCondition" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED', 'UNDER_MAINTENANCE');

-- CreateEnum
CREATE TYPE "public"."AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'LATE', 'HOLIDAY');

-- CreateEnum
CREATE TYPE "public"."BOMStatus" AS ENUM ('DRAFT', 'ACTIVE', 'REVISED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."BankAccountType" AS ENUM ('CURRENT', 'SAVINGS', 'CHECKING', 'OVERDRAFT', 'CREDIT_CARD');

-- CreateEnum
CREATE TYPE "public"."BankMatchedType" AS ENUM ('PAYMENT', 'EXPENSE', 'JOURNAL_ENTRY', 'MANUAL_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "public"."BankReconcileStatus" AS ENUM ('UNMATCHED', 'MATCHED', 'RECONCILED', 'EXCLUDED');

-- CreateEnum
CREATE TYPE "public"."BankStatementStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'RECONCILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."BankTransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL');

-- CreateEnum
CREATE TYPE "public"."BillStatus" AS ENUM ('DRAFT', 'OPEN', 'PARTIALLY_PAID', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "public"."ChallanReason" AS ENUM ('JOB_WORK', 'SUPPLY_ON_APPROVAL', 'EXHIBITION_DEMO', 'WAREHOUSE_TRANSFER', 'LINE_SALE', 'OTHERS');

-- CreateEnum
CREATE TYPE "public"."ChallanStatus" AS ENUM ('DRAFT', 'ISSUED', 'IN_TRANSIT', 'DELIVERED', 'RETURNED', 'CANCELLED', 'CONVERTED_TO_INVOICE');

-- CreateEnum
CREATE TYPE "public"."CommunicationType" AS ENUM ('NOTE', 'EMAIL', 'CALL', 'MEETING', 'TASK');

-- CreateEnum
CREATE TYPE "public"."ContactType" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- CreateEnum
CREATE TYPE "public"."CreditNoteReason" AS ENUM ('GOODS_RETURN', 'OVERBILLING', 'ORDER_CANCELLATION', 'DEFECTIVE_PRODUCT', 'GOODWILL_DISCOUNT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."CreditNoteStatus" AS ENUM ('DRAFT', 'ISSUED', 'APPLIED', 'REFUNDED', 'VOID');

-- CreateEnum
CREATE TYPE "public"."DealStage" AS ENUM ('PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST');

-- CreateEnum
CREATE TYPE "public"."DepositStatus" AS ENUM ('HELD', 'PARTIALLY_REFUNDED', 'FULLY_REFUNDED', 'FORFEITED');

-- CreateEnum
CREATE TYPE "public"."DiscountType" AS ENUM ('PERCENT', 'FIXED');

-- CreateEnum
CREATE TYPE "public"."EmailDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "public"."EmailProvider" AS ENUM ('CUSTOM_SMTP_IMAP', 'GMAIL', 'OUTLOOK', 'RESEND', 'SENDGRID');

-- CreateEnum
CREATE TYPE "public"."EmailStatus" AS ENUM ('DRAFT', 'QUEUED', 'SENT', 'DELIVERED', 'OPENED', 'BOUNCED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."EmailTemplateCategory" AS ENUM ('SALES', 'FOLLOW_UP', 'ONBOARDING', 'SUPPORT', 'BILLING');

-- CreateEnum
CREATE TYPE "public"."EmployeeStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'PROBATION', 'RESIGNED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "public"."EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN');

-- CreateEnum
CREATE TYPE "public"."EnrollmentStatus" AS ENUM ('ENROLLED', 'IN_PROGRESS', 'COMPLETED', 'DROPPED');

-- CreateEnum
CREATE TYPE "public"."ExpenseStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PAID', 'REJECTED', 'VOID');

-- CreateEnum
CREATE TYPE "public"."FormSubmissionStatus" AS ENUM ('PROCESSED', 'SPAM', 'CONVERTED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "public"."GoalCategory" AS ENUM ('PERFORMANCE', 'DEVELOPMENT', 'LEADERSHIP', 'PROJECT');

-- CreateEnum
CREATE TYPE "public"."GoalStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'ACHIEVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."InterviewRecommendation" AS ENUM ('STRONG_HIRE', 'HIRE', 'NEUTRAL', 'NO_HIRE');

-- CreateEnum
CREATE TYPE "public"."InterviewStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "public"."InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."InvoiceType" AS ENUM ('TAX_INVOICE', 'PROFORMA', 'CREDIT_NOTE', 'DEBIT_NOTE');

-- CreateEnum
CREATE TYPE "public"."JobStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ON_HOLD', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."JournalSourceType" AS ENUM ('MANUAL', 'EXPENSE', 'INVOICE', 'BILL', 'PAYMENT', 'PAYROLL', 'OPENING_BALANCE');

-- CreateEnum
CREATE TYPE "public"."JournalStatus" AS ENUM ('DRAFT', 'POSTED', 'VOID');

-- CreateEnum
CREATE TYPE "public"."LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST');

-- CreateEnum
CREATE TYPE "public"."LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."LeaveType" AS ENUM ('CASUAL', 'SICK', 'ANNUAL', 'MATERNITY', 'PATERNITY', 'UNPAID');

-- CreateEnum
CREATE TYPE "public"."LedgerEntryType" AS ENUM ('INVOICE', 'PAYMENT', 'CREDIT_NOTE', 'REFUND', 'OPENING_BALANCE');

-- CreateEnum
CREATE TYPE "public"."LogLevel" AS ENUM ('INFO', 'WARN', 'ERROR', 'FATAL');

-- CreateEnum
CREATE TYPE "public"."MilestoneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELAYED');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'UPI', 'CHEQUE', 'STRIPE', 'PAYPAL', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."PaymentType" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "public"."PayrollRunStatus" AS ENUM ('DRAFT', 'APPROVED', 'PROCESSED', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "public"."PayslipStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'PAID');

-- CreateEnum
CREATE TYPE "public"."Plan" AS ENUM ('FREE', 'BASIC', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "public"."PortalTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."PriceListType" AS ENUM ('SALES', 'PURCHASE');

-- CreateEnum
CREATE TYPE "public"."PricingScheme" AS ENUM ('FIXED_OVERRIDE', 'PERCENTAGE_DISCOUNT', 'PERCENTAGE_MARKUP');

-- CreateEnum
CREATE TYPE "public"."ProductType" AS ENUM ('PRODUCT', 'SERVICE');

-- CreateEnum
CREATE TYPE "public"."ProjectBillingType" AS ENUM ('FIXED_FEE', 'TIME_AND_MATERIALS', 'NON_BILLABLE');

-- CreateEnum
CREATE TYPE "public"."ProjectPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."ProjectStatus" AS ENUM ('PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ProjectTaskStatus" AS ENUM ('BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE');

-- CreateEnum
CREATE TYPE "public"."PurchaseOrderStatus" AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."QCStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED', 'CONDITIONALLY_PASSED');

-- CreateEnum
CREATE TYPE "public"."QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."RecurringExecutionStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."RecurringFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'BIANNUALLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "public"."RecurringStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."RentalAssetStatus" AS ENUM ('AVAILABLE', 'RENTED', 'MAINTENANCE', 'RESERVED', 'RETIRED');

-- CreateEnum
CREATE TYPE "public"."RentalBillingCycle" AS ENUM ('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "public"."RentalStatus" AS ENUM ('DRAFT', 'ACTIVE', 'OVERDUE', 'RETURNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ReviewStatus" AS ENUM ('DRAFT', 'SELF_REVIEW', 'MANAGER_REVIEW', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER', 'VIEWER');

-- CreateEnum
CREATE TYPE "public"."SalesOrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."StockMovementType" AS ENUM ('IN', 'OUT', 'ADJUSTMENT', 'TRANSFER', 'DAMAGE', 'RETURN');

-- CreateEnum
CREATE TYPE "public"."TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."TrainingCategory" AS ENUM ('TECHNICAL', 'COMPLIANCE', 'LEADERSHIP', 'SOFT_SKILLS', 'PRODUCT');

-- CreateEnum
CREATE TYPE "public"."TrainingMode" AS ENUM ('ONLINE', 'CLASSROOM', 'HYBRID');

-- CreateEnum
CREATE TYPE "public"."TrainingProgramStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."TransportMode" AS ENUM ('ROAD', 'RAIL', 'AIR', 'SHIP');

-- CreateEnum
CREATE TYPE "public"."WebFormStatus" AS ENUM ('ACTIVE', 'DRAFT', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."WebFormType" AS ENUM ('CONTACT', 'QUOTE_REQUEST', 'DEMO_REQUEST', 'FEEDBACK', 'SUPPORT', 'PARTNERSHIP');

-- CreateEnum
CREATE TYPE "public"."WorkOrderPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."WorkOrderStatus" AS ENUM ('PLANNED', 'CONFIRMED', 'IN_PROGRESS', 'QUALITY_CHECK', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."batch_status" AS ENUM ('ACTIVE', 'EXPIRED', 'RECALLED', 'DEPLETED');

-- CreateEnum
CREATE TYPE "public"."budget_period_type" AS ENUM ('ANNUAL', 'QUARTERLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "public"."budget_status" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'ACTIVE', 'REVISED', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."rfq_status" AS ENUM ('DRAFT', 'SENT', 'BIDDING_CLOSED', 'CONVERTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."rfq_vendor_status" AS ENUM ('INVITED', 'SUBMITTED', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."serial_status" AS ENUM ('AVAILABLE', 'ALLOCATED', 'SOLD', 'DEFECTIVE', 'MAINTENANCE', 'RETURNED');

-- CreateTable
CREATE TABLE "public"."accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."AccountType" NOT NULL,
    "parent_id" UUID,
    "is_group" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency_code" TEXT NOT NULL DEFAULT 'INR',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."admin_audit_logs" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "admin_email" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_id" TEXT,
    "target_type" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."applicant_interviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "applicant_id" UUID NOT NULL,
    "round_name" TEXT NOT NULL,
    "interviewer_id" UUID,
    "interviewer_name" TEXT,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 45,
    "meeting_link" TEXT,
    "status" "public"."InterviewStatus" NOT NULL DEFAULT 'SCHEDULED',
    "rating" INTEGER DEFAULT 0,
    "feedback" TEXT,
    "recommendation" "public"."InterviewRecommendation",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applicant_interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."appraisal_cycles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "cycle_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" "public"."AppraisalCycleStatus" NOT NULL DEFAULT 'PLANNING',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appraisal_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."attendances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "check_in" TIMESTAMP(3),
    "check_out" TIMESTAMP(3),
    "status" "public"."AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "working_hours" DECIMAL(5,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bank_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "account_name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "branch_name" TEXT,
    "ifsc_routing_code" TEXT,
    "swift_code" TEXT,
    "currency_code" TEXT NOT NULL DEFAULT 'INR',
    "account_type" "public"."BankAccountType" NOT NULL DEFAULT 'CURRENT',
    "chart_of_account_id" UUID,
    "opening_balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "current_balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bank_statements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "bank_account_id" UUID NOT NULL,
    "statement_number" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "opening_balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "closing_balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "reconciled_balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" "public"."BankStatementStatus" NOT NULL DEFAULT 'DRAFT',
    "reconciled_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bank_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "bank_account_id" UUID NOT NULL,
    "statement_id" UUID,
    "transaction_date" TIMESTAMP(3) NOT NULL,
    "value_date" TIMESTAMP(3),
    "type" "public"."BankTransactionType" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "balance" DECIMAL(15,2),
    "payee" TEXT,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "status" "public"."BankReconcileStatus" NOT NULL DEFAULT 'UNMATCHED',
    "matched_type" "public"."BankMatchedType",
    "payment_id" TEXT,
    "expense_id" UUID,
    "journal_entry_id" UUID,
    "matched_at" TIMESTAMP(3),
    "reconciled_at" TIMESTAMP(3),
    "match_confidence" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bill_items" (
    "id" TEXT NOT NULL,
    "bill_id" UUID NOT NULL,
    "product_id" UUID,
    "description" TEXT NOT NULL,
    "hsn_sac_code" TEXT,
    "quantity" DECIMAL(15,2) NOT NULL,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "tax_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "bill_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bill_of_materials" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "bom_number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" DECIMAL(15,2) NOT NULL DEFAULT 1.0,
    "unit" TEXT NOT NULL DEFAULT 'Nos',
    "version" TEXT NOT NULL DEFAULT '1.0',
    "status" "public"."BOMStatus" NOT NULL DEFAULT 'ACTIVE',
    "labor_cost" DECIMAL(15,2) NOT NULL DEFAULT 0.0,
    "overhead_cost" DECIMAL(15,2) NOT NULL DEFAULT 0.0,
    "estimated_total_cost" DECIMAL(15,2) NOT NULL DEFAULT 0.0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bill_of_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bill_of_materials_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bom_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" DECIMAL(15,4) NOT NULL DEFAULT 1.0,
    "unit" TEXT NOT NULL DEFAULT 'Nos',
    "unit_cost" DECIMAL(15,2) NOT NULL DEFAULT 0.0,
    "total_cost" DECIMAL(15,2) NOT NULL DEFAULT 0.0,
    "scrap_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bill_of_materials_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bills" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "bill_number" TEXT NOT NULL,
    "status" "public"."BillStatus" NOT NULL DEFAULT 'DRAFT',
    "bill_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3),
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency_code" TEXT NOT NULL DEFAULT 'INR',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."budget_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "budget_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "category" VARCHAR(100),
    "budgeted_amount" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budget_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."budgets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "fiscal_year" VARCHAR(50) NOT NULL,
    "period_type" "public"."budget_period_type" NOT NULL DEFAULT 'ANNUAL',
    "start_date" TIMESTAMPTZ(6) NOT NULL,
    "end_date" TIMESTAMPTZ(6) NOT NULL,
    "status" "public"."budget_status" NOT NULL DEFAULT 'DRAFT',
    "department_id" UUID,
    "total_budgeted_amount" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "alert_threshold_percent" INTEGER NOT NULL DEFAULT 80,
    "critical_threshold_percent" INTEGER NOT NULL DEFAULT 100,
    "notes" TEXT,
    "approved_by" VARCHAR(255),
    "approved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."communication_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "type" "public"."CommunicationType" NOT NULL DEFAULT 'NOTE',
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "logged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logged_by" TEXT,
    "contact_id" UUID,
    "lead_id" UUID,
    "deal_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."companies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "industry" TEXT DEFAULT '',
    "website" TEXT DEFAULT '',
    "phone" TEXT DEFAULT '',
    "email" TEXT DEFAULT '',
    "address" TEXT DEFAULT '',
    "city" TEXT DEFAULT '',
    "country" TEXT DEFAULT '',
    "employee_count" INTEGER DEFAULT 0,
    "annual_revenue" DECIMAL(15,2) DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "tenant_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gstin" TEXT DEFAULT '',
    "country_code" TEXT DEFAULT 'IN',
    "state" TEXT DEFAULT '',

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "type" "public"."ContactType" NOT NULL DEFAULT 'INDIVIDUAL',
    "customer_group" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "company_name" TEXT,
    "display_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "website" TEXT,
    "billing_address" JSONB,
    "shipping_address" JSONB,
    "gstin" TEXT,
    "pan" TEXT,
    "cin" TEXT,
    "tan" TEXT,
    "msme_udyam" TEXT,
    "trn" TEXT,
    "trade_license" TEXT,
    "vat_number_ksa" TEXT,
    "cr_number" TEXT,
    "ein" TEXT,
    "tax_number" TEXT,
    "country_code" TEXT,
    "currency_code" TEXT NOT NULL DEFAULT 'INR',
    "credit_limit" DECIMAL(15,2),
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_tax_exempt" BOOLEAN NOT NULL DEFAULT false,
    "tax_exemption_reason" TEXT,
    "tax_exemption_certificate" TEXT,
    "portal_enabled" BOOLEAN NOT NULL DEFAULT false,
    "portal_last_access" TIMESTAMP(3),
    "portal_token" TEXT,
    "price_list_id" UUID,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."credit_note_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "credit_note_id" UUID NOT NULL,
    "product_id" UUID,
    "description" TEXT NOT NULL,
    "hsn_sac_code" TEXT,
    "quantity" DECIMAL(15,2) NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL,
    "restock_inventory" BOOLEAN NOT NULL DEFAULT false,
    "warehouse_id" UUID,

    CONSTRAINT "credit_note_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."credit_note_refunds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "credit_note_id" UUID NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "refund_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payment_method" TEXT NOT NULL DEFAULT 'BANK_TRANSFER',
    "reference" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_note_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."credit_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "credit_note_number" TEXT NOT NULL,
    "contact_id" UUID NOT NULL,
    "invoice_id" TEXT,
    "issue_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "public"."CreditNoteStatus" NOT NULL DEFAULT 'ISSUED',
    "reason" "public"."CreditNoteReason" NOT NULL DEFAULT 'GOODS_RETURN',
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "allocated_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "remaining_balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency_code" TEXT NOT NULL DEFAULT 'INR',
    "notes" TEXT,
    "terms" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."custom_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dataset" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "is_prebuilt" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."deals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "value" DECIMAL(15,2),
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "stage" "public"."DealStage" NOT NULL DEFAULT 'PROSPECTING',
    "probability" INTEGER NOT NULL DEFAULT 0,
    "expected_close_date" TIMESTAMP(3),
    "assigned_to" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."delivery_challan_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "challan_id" UUID NOT NULL,
    "product_id" UUID,
    "product_name" TEXT NOT NULL,
    "description" TEXT,
    "hsn_code" TEXT,
    "quantity" DECIMAL(15,2) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'PCS',
    "unit_price" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "taxable_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,

    CONSTRAINT "delivery_challan_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."delivery_challans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "challan_number" TEXT NOT NULL,
    "challan_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contact_id" UUID,
    "recipient_name" TEXT NOT NULL,
    "recipient_email" TEXT,
    "recipient_phone" TEXT,
    "recipient_gstin" TEXT,
    "dispatch_address" JSONB NOT NULL,
    "delivery_address" JSONB NOT NULL,
    "place_of_supply" TEXT,
    "reason" "public"."ChallanReason" NOT NULL DEFAULT 'SUPPLY_ON_APPROVAL',
    "status" "public"."ChallanStatus" NOT NULL DEFAULT 'DRAFT',
    "transport_mode" "public"."TransportMode" NOT NULL DEFAULT 'ROAD',
    "transporter_name" TEXT,
    "transporter_id" TEXT,
    "vehicle_number" TEXT,
    "lr_number" TEXT,
    "lr_date" TIMESTAMP(3),
    "source_warehouse_id" UUID,
    "sales_order_id" UUID,
    "converted_invoice_id" TEXT,
    "total_quantity" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "taxable_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_value" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "terms" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_challans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."departments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "manager_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."designations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "department_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "designations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."email_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "provider" "public"."EmailProvider" NOT NULL DEFAULT 'CUSTOM_SMTP_IMAP',
    "smtp_host" TEXT,
    "smtp_port" INTEGER DEFAULT 587,
    "smtp_user" TEXT,
    "smtp_secure" BOOLEAN NOT NULL DEFAULT true,
    "imap_host" TEXT,
    "imap_port" INTEGER DEFAULT 993,
    "imap_user" TEXT,
    "imap_secure" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_synced_at" TIMESTAMP(3),
    "sync_frequency_minutes" INTEGER NOT NULL DEFAULT 15,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "smtp_password" TEXT DEFAULT '',
    "imap_password" TEXT DEFAULT '',

    CONSTRAINT "email_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."email_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "email_account_id" UUID,
    "direction" "public"."EmailDirection" NOT NULL DEFAULT 'OUTBOUND',
    "status" "public"."EmailStatus" NOT NULL DEFAULT 'SENT',
    "from_email" TEXT NOT NULL,
    "from_name" TEXT,
    "to_email" TEXT NOT NULL,
    "to_name" TEXT,
    "cc" TEXT,
    "bcc" TEXT,
    "subject" TEXT NOT NULL,
    "body_html" TEXT NOT NULL,
    "body_text" TEXT,
    "thread_id" TEXT,
    "message_id" TEXT,
    "in_reply_to" TEXT,
    "is_starred" BOOLEAN NOT NULL DEFAULT false,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "is_read" BOOLEAN NOT NULL DEFAULT true,
    "sent_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "delivered_at" TIMESTAMP(3),
    "opened_at" TIMESTAMP(3),
    "open_count" INTEGER NOT NULL DEFAULT 0,
    "click_count" INTEGER NOT NULL DEFAULT 0,
    "contact_id" UUID,
    "lead_id" UUID,
    "deal_id" UUID,
    "attachments" JSONB DEFAULT '[]',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."email_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body_html" TEXT NOT NULL,
    "body_text" TEXT,
    "merge_tags" JSONB DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "category" "public"."EmailTemplateCategory" NOT NULL DEFAULT 'SALES',

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employee_goals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "goal_code" TEXT NOT NULL,
    "employee_id" UUID NOT NULL,
    "cycle_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "public"."GoalCategory" NOT NULL DEFAULT 'PERFORMANCE',
    "target_metric" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "weightage" INTEGER NOT NULL DEFAULT 25,
    "status" "public"."GoalStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "due_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employees" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "employee_number" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "display_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "gender" TEXT,
    "joining_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "public"."EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "employment_type" "public"."EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "department_id" UUID,
    "designation_id" UUID,
    "manager_id" UUID,
    "basic_salary" DECIMAL(15,2),
    "currency_code" TEXT NOT NULL DEFAULT 'INR',
    "bank_details" JSONB,
    "address" JSONB,
    "emergency_contact" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "salary_structure_id" UUID,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."exchange_rate_cache" (
    "id" TEXT NOT NULL,
    "from_currency" TEXT NOT NULL,
    "to_currency" TEXT NOT NULL,
    "rate" DECIMAL(15,6) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exchange_rate_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."expenses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "expense_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "account_id" UUID NOT NULL,
    "payment_account_id" UUID,
    "vendor_id" UUID,
    "vendor_name" TEXT,
    "employee_id" UUID,
    "amount" DECIMAL(15,2) NOT NULL,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "currency_code" TEXT NOT NULL DEFAULT 'INR',
    "expense_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payment_method" "public"."PaymentMethod" DEFAULT 'BANK_TRANSFER',
    "payment_reference" TEXT,
    "status" "public"."ExpenseStatus" NOT NULL DEFAULT 'PAID',
    "is_reimbursable" BOOLEAN NOT NULL DEFAULT false,
    "is_claim_settled" BOOLEAN NOT NULL DEFAULT false,
    "receipt_url" TEXT,
    "notes" TEXT,
    "journal_entry_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."form_submissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "web_form_id" UUID NOT NULL,
    "lead_id" UUID,
    "contact_id" UUID,
    "data" JSONB NOT NULL DEFAULT '{}',
    "ip_address" TEXT,
    "user_agent" TEXT,
    "referer" TEXT,
    "is_spam" BOOLEAN NOT NULL DEFAULT false,
    "spam_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "public"."FormSubmissionStatus" NOT NULL DEFAULT 'PROCESSED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."global_settings" (
    "id" TEXT NOT NULL DEFAULT 'system_config',
    "maintenance_mode" BOOLEAN NOT NULL DEFAULT false,
    "allow_signups" BOOLEAN NOT NULL DEFAULT true,
    "banner_message" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoice_line_items" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "product_id" UUID,
    "description" TEXT NOT NULL,
    "hsn_sac_code" TEXT,
    "quantity" DECIMAL(15,2) NOT NULL,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "cgst_rate" DECIMAL(5,2),
    "cgst_amount" DECIMAL(15,2),
    "sgst_rate" DECIMAL(5,2),
    "sgst_amount" DECIMAL(15,2),
    "igst_rate" DECIMAL(5,2),
    "igst_amount" DECIMAL(15,2),
    "vat_rate" DECIMAL(5,2),
    "vat_amount" DECIMAL(15,2),
    "discount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(15,2) NOT NULL,
    "is_exempt" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoices" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "type" "public"."InvoiceType" NOT NULL DEFAULT 'TAX_INVOICE',
    "status" "public"."InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "invoice_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3),
    "bill_to" JSONB NOT NULL,
    "ship_to" JSONB,
    "place_of_supply" TEXT,
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_in_words" TEXT,
    "currency_code" TEXT NOT NULL DEFAULT 'INR',
    "tax_summary" JSONB,
    "payment_terms" TEXT,
    "bank_details" JSONB,
    "notes" TEXT,
    "terms" TEXT,
    "signature_url" TEXT,
    "pdf_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_tax_exempt" BOOLEAN NOT NULL DEFAULT false,
    "tax_exemption_reason" TEXT,
    "tax_exemption_certificate" TEXT,
    "recurring_profile_id" UUID,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."job_applicants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "job_opening_id" UUID NOT NULL,
    "applicant_number" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "current_company" TEXT,
    "current_role" TEXT,
    "experience_years" DECIMAL(4,1),
    "current_salary" DECIMAL(15,2),
    "expected_salary" DECIMAL(15,2),
    "notice_period_days" INTEGER DEFAULT 30,
    "resume_url" TEXT,
    "portfolio_url" TEXT,
    "stage" "public"."ApplicantStage" NOT NULL DEFAULT 'APPLIED',
    "rating" INTEGER DEFAULT 0,
    "notes" TEXT,
    "rejection_reason" TEXT,
    "hired_date" TIMESTAMP(3),
    "converted_employee_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_applicants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."job_openings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "job_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department_id" UUID,
    "designation_id" UUID,
    "employment_type" "public"."EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "location" TEXT NOT NULL DEFAULT 'On-site',
    "positions_count" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "requirements" TEXT,
    "salary_min" DECIMAL(15,2),
    "salary_max" DECIMAL(15,2),
    "currency_code" TEXT NOT NULL DEFAULT 'INR',
    "status" "public"."JobStatus" NOT NULL DEFAULT 'PUBLISHED',
    "target_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_openings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."journal_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "entry_number" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" TEXT,
    "source_type" "public"."JournalSourceType" NOT NULL DEFAULT 'MANUAL',
    "source_id" TEXT,
    "narration" TEXT NOT NULL,
    "status" "public"."JournalStatus" NOT NULL DEFAULT 'POSTED',
    "total_debit" DECIMAL(15,2) NOT NULL,
    "total_credit" DECIMAL(15,2) NOT NULL,
    "currency_code" TEXT NOT NULL DEFAULT 'INR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."journal_entry_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "journal_entry_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "debit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "description" TEXT,
    "contact_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_entry_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."leads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "contact_id" UUID,
    "title" TEXT NOT NULL,
    "source" TEXT,
    "status" "public"."LeadStatus" NOT NULL DEFAULT 'NEW',
    "score" INTEGER NOT NULL DEFAULT 0,
    "assigned_to" TEXT,
    "notes" TEXT,
    "converted_to" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "contact_name" TEXT DEFAULT '',

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."leaves" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "type" "public"."LeaveType" NOT NULL DEFAULT 'CASUAL',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "days" DECIMAL(4,1) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "public"."LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leaves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ledger_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "type" "public"."LedgerEntryType" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "balance" DECIMAL(15,2) NOT NULL,
    "currency_code" TEXT NOT NULL DEFAULT 'INR',
    "reference_id" TEXT,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "link" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "user_id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payments" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "invoice_id" TEXT,
    "bill_id" UUID,
    "contact_id" UUID NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payment_method" "public"."PaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
    "type" "public"."PaymentType" NOT NULL DEFAULT 'INBOUND',
    "reference" TEXT,
    "notes" TEXT,
    "currency_code" TEXT NOT NULL DEFAULT 'INR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payroll_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "run_number" TEXT NOT NULL,
    "period_month" INTEGER NOT NULL,
    "period_year" INTEGER NOT NULL,
    "pay_date" TIMESTAMP(3) NOT NULL,
    "status" "public"."PayrollRunStatus" NOT NULL DEFAULT 'DRAFT',
    "employee_count" INTEGER NOT NULL DEFAULT 0,
    "total_gross" DECIMAL(15,2) NOT NULL DEFAULT 0.0,
    "total_deductions" DECIMAL(15,2) NOT NULL DEFAULT 0.0,
    "total_net_pay" DECIMAL(15,2) NOT NULL DEFAULT 0.0,
    "payment_method" TEXT,
    "payment_reference" TEXT,
    "notes" TEXT,
    "approved_at" TIMESTAMP(3),
    "approved_by_id" UUID,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payslips" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "payroll_run_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "slip_number" TEXT NOT NULL,
    "period_month" INTEGER NOT NULL,
    "period_year" INTEGER NOT NULL,
    "status" "public"."PayslipStatus" NOT NULL DEFAULT 'DRAFT',
    "working_days" INTEGER NOT NULL DEFAULT 30,
    "present_days" DECIMAL(5,1) NOT NULL DEFAULT 30,
    "paid_leave_days" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "unpaid_leave_days" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "basic_salary" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "hra" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "conveyance" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "medical" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "special_allowance" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "bonus" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "total_gross" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "pf_employee" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "esi_employee" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "professional_tax" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "tds_deduction" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "unpaid_leave_deduction" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "other_deductions" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "total_deductions" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "net_salary" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "bank_name" TEXT,
    "bank_account_number" TEXT,
    "bank_ifsc" TEXT,
    "payment_date" TIMESTAMP(3),
    "payment_method" TEXT,
    "transaction_ref" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payslips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."performance_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "review_code" TEXT NOT NULL,
    "cycle_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "reviewer_id" UUID,
    "status" "public"."ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "self_rating" DECIMAL(3,1),
    "manager_rating" DECIMAL(3,1),
    "final_rating" DECIMAL(3,1),
    "self_feedback" TEXT,
    "manager_feedback" TEXT,
    "strengths" TEXT,
    "areas_of_improvement" TEXT,
    "promotion_recommended" BOOLEAN NOT NULL DEFAULT false,
    "competencies" JSONB,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."portal_ticket_messages" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "sender_name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_from_customer" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portal_ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."portal_tickets" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "status" "public"."PortalTicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portal_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pos_sessions" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "opened_by" TEXT NOT NULL,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "opening_cash" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "closing_cash" DECIMAL(15,2),
    "total_sales" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_tx" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pos_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."price_list_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "price_list_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "min_quantity" DECIMAL(15,2) NOT NULL DEFAULT 1,
    "custom_price" DECIMAL(15,2),
    "discount_percent" DECIMAL(5,2),
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."price_lists" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "public"."PriceListType" NOT NULL DEFAULT 'SALES',
    "currency_code" TEXT NOT NULL DEFAULT 'INR',
    "pricing_scheme" "public"."PricingScheme" NOT NULL DEFAULT 'FIXED_OVERRIDE',
    "default_discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "target_group" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pricing_plans" (
    "id" TEXT NOT NULL,
    "region_code" TEXT NOT NULL,
    "tier" "public"."Plan" NOT NULL,
    "price" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "gateway" TEXT NOT NULL DEFAULT 'RAZORPAY',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."processed_stripe_events" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_stripe_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_batches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "batch_number" TEXT NOT NULL,
    "initial_qty" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "current_qty" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "manufacturing_date" TIMESTAMPTZ(6),
    "expiry_date" TIMESTAMPTZ(6),
    "status" "public"."batch_status" NOT NULL DEFAULT 'ACTIVE',
    "cost_price" DECIMAL(15,2),
    "supplier_batch_no" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_serials" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "warehouse_id" UUID,
    "batch_id" UUID,
    "serial_number" TEXT NOT NULL,
    "status" "public"."serial_status" NOT NULL DEFAULT 'AVAILABLE',
    "purchase_order_id" UUID,
    "warranty_months" INTEGER,
    "warranty_expiry" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_serials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "type" "public"."ProductType" NOT NULL DEFAULT 'PRODUCT',
    "name" TEXT NOT NULL,
    "category" TEXT,
    "brand" TEXT,
    "model_no" TEXT,
    "serial_no" TEXT,
    "sku" TEXT,
    "hsn_sac_code" TEXT,
    "description" TEXT,
    "custom_attributes" JSONB DEFAULT '{}',
    "unitPrice" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "unit" TEXT NOT NULL DEFAULT 'Nos',
    "tax_group_id" UUID,
    "stock_qty" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "image_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."profiles" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "role" "public"."Role" NOT NULL DEFAULT 'USER',
    "full_name" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "avatar_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."project_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Team Member',
    "hourly_rate" DECIMAL(10,2),
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."project_milestones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "due_date" TIMESTAMP(3),
    "completed_date" TIMESTAMP(3),
    "status" "public"."MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "deliverable" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."project_tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "milestone_id" UUID,
    "task_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "public"."ProjectTaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "public"."ProjectPriority" NOT NULL DEFAULT 'MEDIUM',
    "assigned_employee_id" UUID,
    "estimated_hours" DECIMAL(6,2),
    "actual_hours" DECIMAL(6,2) DEFAULT 0,
    "start_date" TIMESTAMP(3),
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."project_time_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "task_id" UUID,
    "employee_id" UUID NOT NULL,
    "work_date" TIMESTAMP(3) NOT NULL,
    "hours" DECIMAL(5,2) NOT NULL,
    "description" TEXT NOT NULL,
    "is_billable" BOOLEAN NOT NULL DEFAULT true,
    "is_billed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "public"."ProjectStatus" NOT NULL DEFAULT 'PLANNING',
    "priority" "public"."ProjectPriority" NOT NULL DEFAULT 'MEDIUM',
    "start_date" TIMESTAMP(3),
    "target_end_date" TIMESTAMP(3),
    "actual_end_date" TIMESTAMP(3),
    "budget" DECIMAL(15,2),
    "currency_code" TEXT NOT NULL DEFAULT 'INR',
    "client_id" UUID,
    "manager_id" UUID,
    "billing_type" "public"."ProjectBillingType" NOT NULL DEFAULT 'FIXED_FEE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase_order_items" (
    "id" TEXT NOT NULL,
    "purchase_order_id" UUID NOT NULL,
    "product_id" UUID,
    "description" TEXT NOT NULL,
    "hsn_sac_code" TEXT,
    "quantity" DECIMAL(15,2) NOT NULL,
    "received_qty" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "tax_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "warehouse_id" UUID,
    "bill_id" UUID,
    "order_number" TEXT NOT NULL,
    "status" "public"."PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "order_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expected_delivery_date" TIMESTAMP(3),
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency_code" TEXT NOT NULL DEFAULT 'INR',
    "notes" TEXT,
    "terms" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quality_inspections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "work_order_id" UUID NOT NULL,
    "inspection_number" TEXT NOT NULL,
    "inspected_quantity" DECIMAL(15,2) NOT NULL,
    "passed_quantity" DECIMAL(15,2) NOT NULL DEFAULT 0.0,
    "failed_quantity" DECIMAL(15,2) NOT NULL DEFAULT 0.0,
    "status" "public"."QCStatus" NOT NULL DEFAULT 'PENDING',
    "defect_reason" TEXT,
    "inspector_name" TEXT,
    "notes" TEXT,
    "inspected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quality_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quote_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quote_id" UUID NOT NULL,
    "product_name" TEXT NOT NULL,
    "description" TEXT,
    "qty" DECIMAL(15,2) NOT NULL,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "tax_percent" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "line_total" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quotes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "contact_id" UUID,
    "quote_number" TEXT NOT NULL,
    "status" "public"."QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "customer_name" TEXT NOT NULL,
    "customer_email" TEXT NOT NULL,
    "quote_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" TIMESTAMP(3),
    "reference" TEXT,
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "discount_type" "public"."DiscountType" NOT NULL DEFAULT 'PERCENT',
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency_code" TEXT NOT NULL DEFAULT 'INR',
    "notes" TEXT,
    "terms_and_conditions" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."recurring_executions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "recurring_profile_id" UUID NOT NULL,
    "invoice_id" TEXT,
    "execution_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "public"."RecurringExecutionStatus" NOT NULL DEFAULT 'SUCCESS',
    "amount" DECIMAL(15,2) NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recurring_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."recurring_profile_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "recurring_profile_id" UUID NOT NULL,
    "product_id" UUID,
    "description" TEXT NOT NULL,
    "hsn_sac_code" TEXT,
    "quantity" DECIMAL(15,2) NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "cgst_rate" DECIMAL(5,2) DEFAULT 0,
    "cgst_amount" DECIMAL(15,2) DEFAULT 0,
    "sgst_rate" DECIMAL(5,2) DEFAULT 0,
    "sgst_amount" DECIMAL(15,2) DEFAULT 0,
    "igst_rate" DECIMAL(5,2) DEFAULT 0,
    "igst_amount" DECIMAL(15,2) DEFAULT 0,
    "discount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(15,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recurring_profile_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."recurring_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "profile_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "contact_id" UUID NOT NULL,
    "frequency" "public"."RecurringFrequency" NOT NULL DEFAULT 'MONTHLY',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "next_run_date" TIMESTAMP(3) NOT NULL,
    "last_run_date" TIMESTAMP(3),
    "max_cycles" INTEGER,
    "cycles_completed" INTEGER NOT NULL DEFAULT 0,
    "status" "public"."RecurringStatus" NOT NULL DEFAULT 'ACTIVE',
    "auto_send_email" BOOLEAN NOT NULL DEFAULT false,
    "auto_approve" BOOLEAN NOT NULL DEFAULT true,
    "payment_terms" TEXT DEFAULT 'NET_30',
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency_code" TEXT NOT NULL DEFAULT 'INR',
    "notes" TEXT,
    "terms" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rental_agreement_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "agreement_id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "rate" DECIMAL(12,2) NOT NULL,
    "rental_days" INTEGER NOT NULL DEFAULT 1,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "condition_out" "public"."AssetCondition" NOT NULL DEFAULT 'EXCELLENT',
    "condition_in" "public"."AssetCondition",

    CONSTRAINT "rental_agreement_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rental_agreements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "agreement_number" TEXT NOT NULL,
    "contact_id" UUID NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "actual_return_date" TIMESTAMP(3),
    "billing_cycle" "public"."RentalBillingCycle" NOT NULL DEFAULT 'DAILY',
    "rental_rate" DECIMAL(12,2) NOT NULL,
    "total_rental_amount" DECIMAL(12,2) NOT NULL,
    "security_deposit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deposit_status" "public"."DepositStatus" NOT NULL DEFAULT 'HELD',
    "status" "public"."RentalStatus" NOT NULL DEFAULT 'ACTIVE',
    "invoice_id" TEXT,
    "terms" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_agreements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rental_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "asset_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "serial_number" TEXT,
    "daily_rate" DECIMAL(12,2) NOT NULL,
    "weekly_rate" DECIMAL(12,2),
    "monthly_rate" DECIMAL(12,2),
    "security_deposit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "condition" "public"."AssetCondition" NOT NULL DEFAULT 'EXCELLENT',
    "status" "public"."RentalAssetStatus" NOT NULL DEFAULT 'AVAILABLE',
    "warehouse_id" UUID,
    "description" TEXT,
    "specifications" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rental_returns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "agreement_id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "return_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "condition" "public"."AssetCondition" NOT NULL,
    "damage_notes" TEXT,
    "damage_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "late_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deposit_refunded" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "inspected_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rental_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."request_for_quotations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "rfq_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "public"."rfq_status" NOT NULL DEFAULT 'DRAFT',
    "issue_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMPTZ(6) NOT NULL,
    "notes" TEXT,
    "terms" TEXT,
    "converted_po_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_for_quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rfq_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rfq_id" UUID NOT NULL,
    "product_id" UUID,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(15,2) NOT NULL,
    "target_unit_price" DECIMAL(15,2),
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "hsn_sac_code" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rfq_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rfq_vendor_quote_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quote_id" UUID NOT NULL,
    "rfq_item_id" UUID NOT NULL,
    "unit_price" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "available_qty" DECIMAL(15,2),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rfq_vendor_quote_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rfq_vendor_quotes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "rfq_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "status" "public"."rfq_vendor_status" NOT NULL DEFAULT 'INVITED',
    "quote_reference" TEXT,
    "quote_date" TIMESTAMPTZ(6),
    "valid_until" TIMESTAMPTZ(6),
    "currency_code" TEXT NOT NULL DEFAULT 'INR',
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "lead_time_days" INTEGER,
    "notes" TEXT,
    "is_winner" BOOLEAN NOT NULL DEFAULT false,
    "awarded_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rfq_vendor_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."salary_structures" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "basic_percentage" DECIMAL(5,2) NOT NULL DEFAULT 50.0,
    "hra_percentage" DECIMAL(5,2) NOT NULL DEFAULT 20.0,
    "conveyance_monthly" DECIMAL(10,2) NOT NULL DEFAULT 1600.0,
    "medical_monthly" DECIMAL(10,2) NOT NULL DEFAULT 1250.0,
    "special_allowance_pct" DECIMAL(5,2) NOT NULL DEFAULT 15.0,
    "pf_employee_rate" DECIMAL(5,2) NOT NULL DEFAULT 12.0,
    "pf_employer_rate" DECIMAL(5,2) NOT NULL DEFAULT 12.0,
    "esi_employee_rate" DECIMAL(5,2) NOT NULL DEFAULT 0.75,
    "esi_employer_rate" DECIMAL(5,2) NOT NULL DEFAULT 3.25,
    "professional_tax" DECIMAL(10,2) NOT NULL DEFAULT 200.0,
    "tds_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sales_order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "product_name" TEXT NOT NULL,
    "description" TEXT,
    "qty" DECIMAL(15,2) NOT NULL,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "tax_percent" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "line_total" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "sales_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sales_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "contact_id" UUID,
    "order_number" TEXT NOT NULL,
    "status" "public"."SalesOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "customer_name" TEXT NOT NULL,
    "customer_email" TEXT NOT NULL,
    "order_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expected_date" TIMESTAMP(3),
    "reference" TEXT,
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "discount_type" "public"."DiscountType" NOT NULL DEFAULT 'PERCENT',
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency_code" TEXT NOT NULL DEFAULT 'INR',
    "notes" TEXT,
    "terms_and_conditions" TEXT,
    "quote_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."site_content" (
    "key" TEXT NOT NULL,
    "draft" JSONB NOT NULL DEFAULT '{}',
    "published" JSONB,
    "published_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,

    CONSTRAINT "site_content_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."site_content_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "published_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_by" UUID,

    CONSTRAINT "site_content_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."site_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" TEXT NOT NULL,
    "slug" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,

    CONSTRAINT "site_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."site_leads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" TEXT NOT NULL,
    "topic" TEXT NOT NULL DEFAULT 'General',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'new',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,

    CONSTRAINT "site_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."site_media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bucket" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "url" TEXT,
    "alt" TEXT NOT NULL DEFAULT '',
    "mime" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "uploaded_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."site_settings" (
    "id" TEXT NOT NULL DEFAULT 'site',
    "data" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stock_movements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "to_warehouse_id" UUID,
    "type" "public"."StockMovementType" NOT NULL,
    "quantity" DECIMAL(15,2) NOT NULL,
    "previous_qty" DECIMAL(15,2) NOT NULL,
    "new_qty" DECIMAL(15,2) NOT NULL,
    "reason" TEXT,
    "reference_no" TEXT,
    "performed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."support_messages" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_from_admin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."support_tickets" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "public"."TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "public"."TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."system_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID,
    "level" "public"."LogLevel" NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,
    "path" TEXT,
    "stack" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "public"."TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "public"."TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "due_date" TIMESTAMP(3),
    "assigned_to" UUID,
    "contact_id" UUID,
    "lead_id" UUID,
    "deal_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tax_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "country_code" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tax_rates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tax_group_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DECIMAL(5,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tenant_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "actor_id" UUID,
    "actor_email" TEXT,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tenants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "country_code" TEXT NOT NULL DEFAULT 'IN',
    "currency_code" TEXT NOT NULL DEFAULT 'INR',
    "plan" "public"."Plan" NOT NULL DEFAULT 'FREE',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "logo_url" TEXT,
    "address" JSONB,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "fiscal_year_start" INTEGER NOT NULL DEFAULT 4,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_trial" BOOLEAN NOT NULL DEFAULT true,
    "trial_ends_at" TIMESTAMP(3),
    "billing_region" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "gstin" TEXT DEFAULT '',

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."training_enrollments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "status" "public"."EnrollmentStatus" NOT NULL DEFAULT 'ENROLLED',
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "score" DECIMAL(5,2),
    "feedback" TEXT,
    "certificate_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."training_programs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "program_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "public"."TrainingCategory" NOT NULL DEFAULT 'TECHNICAL',
    "trainer" TEXT,
    "duration_hours" DECIMAL(5,1),
    "mode" "public"."TrainingMode" NOT NULL DEFAULT 'ONLINE',
    "description" TEXT,
    "syllabus_url" TEXT,
    "status" "public"."TrainingProgramStatus" NOT NULL DEFAULT 'UPCOMING',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "max_participants" INTEGER NOT NULL DEFAULT 20,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."warehouse_stocks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "reorder_point" DECIMAL(15,2) NOT NULL DEFAULT 10,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."warehouses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT DEFAULT 'India',
    "contact_name" TEXT,
    "contact_phone" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."web_forms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "public"."WebFormType" NOT NULL DEFAULT 'CONTACT',
    "status" "public"."WebFormStatus" NOT NULL DEFAULT 'ACTIVE',
    "fields" JSONB NOT NULL DEFAULT '[]',
    "submit_button_text" TEXT NOT NULL DEFAULT 'Submit Request',
    "success_message" TEXT NOT NULL DEFAULT 'Thank you! Your inquiry has been received. Our team will contact you shortly.',
    "redirect_url" TEXT,
    "default_lead_status" "public"."LeadStatus" NOT NULL DEFAULT 'NEW',
    "default_lead_source" TEXT NOT NULL DEFAULT 'web_form',
    "assigned_to" TEXT,
    "notify_email" TEXT,
    "primary_color" TEXT NOT NULL DEFAULT '#2563eb',
    "submissions_count" INTEGER NOT NULL DEFAULT 0,
    "converted_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "web_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."work_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "order_number" TEXT NOT NULL,
    "bom_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "plannedQuantity" DECIMAL(15,2) NOT NULL,
    "produced_quantity" DECIMAL(15,2) NOT NULL DEFAULT 0.0,
    "scrap_quantity" DECIMAL(15,2) NOT NULL DEFAULT 0.0,
    "source_warehouse_id" UUID NOT NULL,
    "target_warehouse_id" UUID NOT NULL,
    "start_date" TIMESTAMP(3),
    "due_date" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "status" "public"."WorkOrderStatus" NOT NULL DEFAULT 'PLANNED',
    "priority" "public"."WorkOrderPriority" NOT NULL DEFAULT 'MEDIUM',
    "assigned_to" TEXT,
    "estimated_total_cost" DECIMAL(15,2) NOT NULL DEFAULT 0.0,
    "actual_total_cost" DECIMAL(15,2) NOT NULL DEFAULT 0.0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."workflow_executions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "workflow_id" UUID NOT NULL,
    "trigger_event" TEXT NOT NULL,
    "entity_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "executed_actions" JSONB NOT NULL DEFAULT '[]',
    "error_details" TEXT,
    "execution_duration_ms" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."workflow_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger_event" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "actions" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "execution_count" INTEGER NOT NULL DEFAULT 0,
    "last_run_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accounts_parent_id_idx" ON "public"."accounts"("parent_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_tenant_id_code_key" ON "public"."accounts"("tenant_id" ASC, "code" ASC);

-- CreateIndex
CREATE INDEX "accounts_tenant_id_idx" ON "public"."accounts"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "accounts_type_idx" ON "public"."accounts"("type" ASC);

-- CreateIndex
CREATE INDEX "admin_audit_logs_action_idx" ON "public"."admin_audit_logs"("action" ASC);

-- CreateIndex
CREATE INDEX "admin_audit_logs_admin_id_idx" ON "public"."admin_audit_logs"("admin_id" ASC);

-- CreateIndex
CREATE INDEX "applicant_interviews_applicant_id_idx" ON "public"."applicant_interviews"("applicant_id" ASC);

-- CreateIndex
CREATE INDEX "applicant_interviews_interviewer_id_idx" ON "public"."applicant_interviews"("interviewer_id" ASC);

-- CreateIndex
CREATE INDEX "applicant_interviews_scheduled_at_idx" ON "public"."applicant_interviews"("scheduled_at" ASC);

-- CreateIndex
CREATE INDEX "applicant_interviews_tenant_id_idx" ON "public"."applicant_interviews"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "appraisal_cycles_status_idx" ON "public"."appraisal_cycles"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "appraisal_cycles_tenant_id_cycle_code_key" ON "public"."appraisal_cycles"("tenant_id" ASC, "cycle_code" ASC);

-- CreateIndex
CREATE INDEX "appraisal_cycles_tenant_id_idx" ON "public"."appraisal_cycles"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "attendances_date_idx" ON "public"."attendances"("date" ASC);

-- CreateIndex
CREATE INDEX "attendances_employee_id_idx" ON "public"."attendances"("employee_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "attendances_tenant_id_employee_id_date_key" ON "public"."attendances"("tenant_id" ASC, "employee_id" ASC, "date" ASC);

-- CreateIndex
CREATE INDEX "attendances_tenant_id_idx" ON "public"."attendances"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "bank_accounts_chart_of_account_id_idx" ON "public"."bank_accounts"("chart_of_account_id" ASC);

-- CreateIndex
CREATE INDEX "bank_accounts_is_active_idx" ON "public"."bank_accounts"("is_active" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_tenant_id_account_number_key" ON "public"."bank_accounts"("tenant_id" ASC, "account_number" ASC);

-- CreateIndex
CREATE INDEX "bank_accounts_tenant_id_idx" ON "public"."bank_accounts"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "bank_statements_bank_account_id_idx" ON "public"."bank_statements"("bank_account_id" ASC);

-- CreateIndex
CREATE INDEX "bank_statements_status_idx" ON "public"."bank_statements"("status" ASC);

-- CreateIndex
CREATE INDEX "bank_statements_tenant_id_idx" ON "public"."bank_statements"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "bank_statements_tenant_id_statement_number_key" ON "public"."bank_statements"("tenant_id" ASC, "statement_number" ASC);

-- CreateIndex
CREATE INDEX "bank_transactions_bank_account_id_idx" ON "public"."bank_transactions"("bank_account_id" ASC);

-- CreateIndex
CREATE INDEX "bank_transactions_expense_id_idx" ON "public"."bank_transactions"("expense_id" ASC);

-- CreateIndex
CREATE INDEX "bank_transactions_journal_entry_id_idx" ON "public"."bank_transactions"("journal_entry_id" ASC);

-- CreateIndex
CREATE INDEX "bank_transactions_payment_id_idx" ON "public"."bank_transactions"("payment_id" ASC);

-- CreateIndex
CREATE INDEX "bank_transactions_statement_id_idx" ON "public"."bank_transactions"("statement_id" ASC);

-- CreateIndex
CREATE INDEX "bank_transactions_status_idx" ON "public"."bank_transactions"("status" ASC);

-- CreateIndex
CREATE INDEX "bank_transactions_tenant_id_idx" ON "public"."bank_transactions"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "idx_bill_items_bill_id" ON "public"."bill_items"("bill_id" ASC);

-- CreateIndex
CREATE INDEX "idx_bill_items_product_id" ON "public"."bill_items"("product_id" ASC);

-- CreateIndex
CREATE INDEX "bill_of_materials_product_id_idx" ON "public"."bill_of_materials"("product_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "bill_of_materials_tenant_id_bom_number_key" ON "public"."bill_of_materials"("tenant_id" ASC, "bom_number" ASC);

-- CreateIndex
CREATE INDEX "bill_of_materials_tenant_id_idx" ON "public"."bill_of_materials"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "bill_of_materials_items_bom_id_idx" ON "public"."bill_of_materials_items"("bom_id" ASC);

-- CreateIndex
CREATE INDEX "bill_of_materials_items_product_id_idx" ON "public"."bill_of_materials_items"("product_id" ASC);

-- CreateIndex
CREATE INDEX "bills_tenant_id_bill_date_idx" ON "public"."bills"("tenant_id" ASC, "bill_date" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "bills_tenant_id_bill_number_key" ON "public"."bills"("tenant_id" ASC, "bill_number" ASC);

-- CreateIndex
CREATE INDEX "bills_tenant_id_idx" ON "public"."bills"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "bills_tenant_id_status_idx" ON "public"."bills"("tenant_id" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "idx_bills_contact_id" ON "public"."bills"("contact_id" ASC);

-- CreateIndex
CREATE INDEX "budget_items_account_id_idx" ON "public"."budget_items"("account_id" ASC);

-- CreateIndex
CREATE INDEX "budget_items_budget_id_idx" ON "public"."budget_items"("budget_id" ASC);

-- CreateIndex
CREATE INDEX "budget_items_tenant_id_idx" ON "public"."budget_items"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "budgets_dates_idx" ON "public"."budgets"("start_date" ASC, "end_date" ASC);

-- CreateIndex
CREATE INDEX "budgets_department_id_idx" ON "public"."budgets"("department_id" ASC);

-- CreateIndex
CREATE INDEX "budgets_fiscal_year_idx" ON "public"."budgets"("fiscal_year" ASC);

-- CreateIndex
CREATE INDEX "budgets_status_idx" ON "public"."budgets"("status" ASC);

-- CreateIndex
CREATE INDEX "budgets_tenant_id_idx" ON "public"."budgets"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "communication_logs_contact_id_idx" ON "public"."communication_logs"("contact_id" ASC);

-- CreateIndex
CREATE INDEX "communication_logs_deal_id_idx" ON "public"."communication_logs"("deal_id" ASC);

-- CreateIndex
CREATE INDEX "communication_logs_lead_id_idx" ON "public"."communication_logs"("lead_id" ASC);

-- CreateIndex
CREATE INDEX "communication_logs_tenant_id_idx" ON "public"."communication_logs"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "idx_companies_tenant_id" ON "public"."companies"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "contacts_portal_token_idx" ON "public"."contacts"("portal_token" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "contacts_portal_token_key" ON "public"."contacts"("portal_token" ASC);

-- CreateIndex
CREATE INDEX "contacts_tenant_id_email_idx" ON "public"."contacts"("tenant_id" ASC, "email" ASC);

-- CreateIndex
CREATE INDEX "contacts_tenant_id_gstin_idx" ON "public"."contacts"("tenant_id" ASC, "gstin" ASC);

-- CreateIndex
CREATE INDEX "contacts_tenant_id_idx" ON "public"."contacts"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "contacts_tenant_id_price_list_id_idx" ON "public"."contacts"("tenant_id" ASC, "price_list_id" ASC);

-- CreateIndex
CREATE INDEX "idx_contacts_price_list_id" ON "public"."contacts"("price_list_id" ASC);

-- CreateIndex
CREATE INDEX "credit_note_items_credit_note_id_idx" ON "public"."credit_note_items"("credit_note_id" ASC);

-- CreateIndex
CREATE INDEX "credit_note_items_product_id_idx" ON "public"."credit_note_items"("product_id" ASC);

-- CreateIndex
CREATE INDEX "credit_note_items_tenant_id_idx" ON "public"."credit_note_items"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "credit_note_items_warehouse_id_idx" ON "public"."credit_note_items"("warehouse_id" ASC);

-- CreateIndex
CREATE INDEX "credit_note_refunds_credit_note_id_idx" ON "public"."credit_note_refunds"("credit_note_id" ASC);

-- CreateIndex
CREATE INDEX "credit_note_refunds_tenant_id_idx" ON "public"."credit_note_refunds"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "credit_notes_contact_id_idx" ON "public"."credit_notes"("contact_id" ASC);

-- CreateIndex
CREATE INDEX "credit_notes_invoice_id_idx" ON "public"."credit_notes"("invoice_id" ASC);

-- CreateIndex
CREATE INDEX "credit_notes_status_idx" ON "public"."credit_notes"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "credit_notes_tenant_id_credit_note_number_key" ON "public"."credit_notes"("tenant_id" ASC, "credit_note_number" ASC);

-- CreateIndex
CREATE INDEX "credit_notes_tenant_id_idx" ON "public"."credit_notes"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "custom_reports_dataset_idx" ON "public"."custom_reports"("dataset" ASC);

-- CreateIndex
CREATE INDEX "custom_reports_tenant_id_idx" ON "public"."custom_reports"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "deals_tenant_id_idx" ON "public"."deals"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "idx_deals_contact_id" ON "public"."deals"("contact_id" ASC);

-- CreateIndex
CREATE INDEX "delivery_challan_items_challan_id_idx" ON "public"."delivery_challan_items"("challan_id" ASC);

-- CreateIndex
CREATE INDEX "delivery_challan_items_product_id_idx" ON "public"."delivery_challan_items"("product_id" ASC);

-- CreateIndex
CREATE INDEX "delivery_challans_contact_id_idx" ON "public"."delivery_challans"("contact_id" ASC);

-- CreateIndex
CREATE INDEX "delivery_challans_converted_invoice_id_idx" ON "public"."delivery_challans"("converted_invoice_id" ASC);

-- CreateIndex
CREATE INDEX "delivery_challans_sales_order_id_idx" ON "public"."delivery_challans"("sales_order_id" ASC);

-- CreateIndex
CREATE INDEX "delivery_challans_source_warehouse_id_idx" ON "public"."delivery_challans"("source_warehouse_id" ASC);

-- CreateIndex
CREATE INDEX "delivery_challans_status_idx" ON "public"."delivery_challans"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "delivery_challans_tenant_id_challan_number_key" ON "public"."delivery_challans"("tenant_id" ASC, "challan_number" ASC);

-- CreateIndex
CREATE INDEX "delivery_challans_tenant_id_idx" ON "public"."delivery_challans"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "departments_tenant_id_idx" ON "public"."departments"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "departments_tenant_id_name_key" ON "public"."departments"("tenant_id" ASC, "name" ASC);

-- CreateIndex
CREATE INDEX "idx_departments_manager_id" ON "public"."departments"("manager_id" ASC);

-- CreateIndex
CREATE INDEX "designations_department_id_idx" ON "public"."designations"("department_id" ASC);

-- CreateIndex
CREATE INDEX "designations_tenant_id_idx" ON "public"."designations"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "designations_tenant_id_title_key" ON "public"."designations"("tenant_id" ASC, "title" ASC);

-- CreateIndex
CREATE INDEX "email_accounts_is_active_idx" ON "public"."email_accounts"("is_active" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "email_accounts_tenant_id_email_key" ON "public"."email_accounts"("tenant_id" ASC, "email" ASC);

-- CreateIndex
CREATE INDEX "email_accounts_tenant_id_idx" ON "public"."email_accounts"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "email_messages_contact_id_idx" ON "public"."email_messages"("contact_id" ASC);

-- CreateIndex
CREATE INDEX "email_messages_deal_id_idx" ON "public"."email_messages"("deal_id" ASC);

-- CreateIndex
CREATE INDEX "email_messages_direction_idx" ON "public"."email_messages"("direction" ASC);

-- CreateIndex
CREATE INDEX "email_messages_email_account_id_idx" ON "public"."email_messages"("email_account_id" ASC);

-- CreateIndex
CREATE INDEX "email_messages_lead_id_idx" ON "public"."email_messages"("lead_id" ASC);

-- CreateIndex
CREATE INDEX "email_messages_status_idx" ON "public"."email_messages"("status" ASC);

-- CreateIndex
CREATE INDEX "email_messages_tenant_id_idx" ON "public"."email_messages"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "email_messages_thread_id_idx" ON "public"."email_messages"("thread_id" ASC);

-- CreateIndex
CREATE INDEX "email_templates_category_idx" ON "public"."email_templates"("category" ASC);

-- CreateIndex
CREATE INDEX "email_templates_tenant_id_idx" ON "public"."email_templates"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_tenant_id_name_key" ON "public"."email_templates"("tenant_id" ASC, "name" ASC);

-- CreateIndex
CREATE INDEX "employee_goals_cycle_id_idx" ON "public"."employee_goals"("cycle_id" ASC);

-- CreateIndex
CREATE INDEX "employee_goals_employee_id_idx" ON "public"."employee_goals"("employee_id" ASC);

-- CreateIndex
CREATE INDEX "employee_goals_status_idx" ON "public"."employee_goals"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "employee_goals_tenant_id_goal_code_key" ON "public"."employee_goals"("tenant_id" ASC, "goal_code" ASC);

-- CreateIndex
CREATE INDEX "employee_goals_tenant_id_idx" ON "public"."employee_goals"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "employees_department_id_idx" ON "public"."employees"("department_id" ASC);

-- CreateIndex
CREATE INDEX "employees_designation_id_idx" ON "public"."employees"("designation_id" ASC);

-- CreateIndex
CREATE INDEX "employees_manager_id_idx" ON "public"."employees"("manager_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "employees_tenant_id_email_key" ON "public"."employees"("tenant_id" ASC, "email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "employees_tenant_id_employee_number_key" ON "public"."employees"("tenant_id" ASC, "employee_number" ASC);

-- CreateIndex
CREATE INDEX "employees_tenant_id_idx" ON "public"."employees"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "employees_user_id_key" ON "public"."employees"("user_id" ASC);

-- CreateIndex
CREATE INDEX "idx_employees_salary_structure_id" ON "public"."employees"("salary_structure_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rate_cache_from_currency_to_currency_key" ON "public"."exchange_rate_cache"("from_currency" ASC, "to_currency" ASC);

-- CreateIndex
CREATE INDEX "expenses_account_id_idx" ON "public"."expenses"("account_id" ASC);

-- CreateIndex
CREATE INDEX "expenses_employee_id_idx" ON "public"."expenses"("employee_id" ASC);

-- CreateIndex
CREATE INDEX "expenses_payment_account_id_idx" ON "public"."expenses"("payment_account_id" ASC);

-- CreateIndex
CREATE INDEX "expenses_status_idx" ON "public"."expenses"("status" ASC);

-- CreateIndex
CREATE INDEX "expenses_tenant_id_expense_date_idx" ON "public"."expenses"("tenant_id" ASC, "expense_date" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "expenses_tenant_id_expense_number_key" ON "public"."expenses"("tenant_id" ASC, "expense_number" ASC);

-- CreateIndex
CREATE INDEX "expenses_tenant_id_idx" ON "public"."expenses"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "expenses_vendor_id_idx" ON "public"."expenses"("vendor_id" ASC);

-- CreateIndex
CREATE INDEX "idx_expenses_journal_entry_id" ON "public"."expenses"("journal_entry_id" ASC);

-- CreateIndex
CREATE INDEX "form_submissions_tenant_id_created_at_idx" ON "public"."form_submissions"("tenant_id" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "form_submissions_tenant_id_idx" ON "public"."form_submissions"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "form_submissions_web_form_id_idx" ON "public"."form_submissions"("web_form_id" ASC);

-- CreateIndex
CREATE INDEX "idx_form_submissions_contact_id" ON "public"."form_submissions"("contact_id" ASC);

-- CreateIndex
CREATE INDEX "idx_form_submissions_lead_id" ON "public"."form_submissions"("lead_id" ASC);

-- CreateIndex
CREATE INDEX "idx_invoice_line_items_invoice_id" ON "public"."invoice_line_items"("invoice_id" ASC);

-- CreateIndex
CREATE INDEX "idx_invoice_line_items_product_id" ON "public"."invoice_line_items"("product_id" ASC);

-- CreateIndex
CREATE INDEX "idx_invoices_contact_id" ON "public"."invoices"("contact_id" ASC);

-- CreateIndex
CREATE INDEX "invoices_recurring_profile_id_idx" ON "public"."invoices"("recurring_profile_id" ASC);

-- CreateIndex
CREATE INDEX "invoices_tenant_id_created_at_idx" ON "public"."invoices"("tenant_id" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "invoices_tenant_id_idx" ON "public"."invoices"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "invoices_tenant_id_invoice_date_idx" ON "public"."invoices"("tenant_id" ASC, "invoice_date" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_tenant_id_invoice_number_key" ON "public"."invoices"("tenant_id" ASC, "invoice_number" ASC);

-- CreateIndex
CREATE INDEX "invoices_tenant_id_status_idx" ON "public"."invoices"("tenant_id" ASC, "status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "job_applicants_converted_employee_id_key" ON "public"."job_applicants"("converted_employee_id" ASC);

-- CreateIndex
CREATE INDEX "job_applicants_email_idx" ON "public"."job_applicants"("email" ASC);

-- CreateIndex
CREATE INDEX "job_applicants_job_opening_id_idx" ON "public"."job_applicants"("job_opening_id" ASC);

-- CreateIndex
CREATE INDEX "job_applicants_stage_idx" ON "public"."job_applicants"("stage" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "job_applicants_tenant_id_applicant_number_key" ON "public"."job_applicants"("tenant_id" ASC, "applicant_number" ASC);

-- CreateIndex
CREATE INDEX "job_applicants_tenant_id_idx" ON "public"."job_applicants"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "job_openings_department_id_idx" ON "public"."job_openings"("department_id" ASC);

-- CreateIndex
CREATE INDEX "job_openings_designation_id_idx" ON "public"."job_openings"("designation_id" ASC);

-- CreateIndex
CREATE INDEX "job_openings_status_idx" ON "public"."job_openings"("status" ASC);

-- CreateIndex
CREATE INDEX "job_openings_tenant_id_idx" ON "public"."job_openings"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "job_openings_tenant_id_job_code_key" ON "public"."job_openings"("tenant_id" ASC, "job_code" ASC);

-- CreateIndex
CREATE INDEX "journal_entries_date_idx" ON "public"."journal_entries"("date" ASC);

-- CreateIndex
CREATE INDEX "journal_entries_status_idx" ON "public"."journal_entries"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_tenant_id_entry_number_key" ON "public"."journal_entries"("tenant_id" ASC, "entry_number" ASC);

-- CreateIndex
CREATE INDEX "journal_entries_tenant_id_idx" ON "public"."journal_entries"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "journal_entries_tenant_id_source_type_source_id_status_idx" ON "public"."journal_entries"("tenant_id" ASC, "source_type" ASC, "source_id" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "journal_entries_tenant_id_status_date_idx" ON "public"."journal_entries"("tenant_id" ASC, "status" ASC, "date" ASC);

-- CreateIndex
CREATE INDEX "journal_entry_lines_account_id_idx" ON "public"."journal_entry_lines"("account_id" ASC);

-- CreateIndex
CREATE INDEX "journal_entry_lines_contact_id_idx" ON "public"."journal_entry_lines"("contact_id" ASC);

-- CreateIndex
CREATE INDEX "journal_entry_lines_journal_entry_id_idx" ON "public"."journal_entry_lines"("journal_entry_id" ASC);

-- CreateIndex
CREATE INDEX "journal_entry_lines_tenant_id_account_id_idx" ON "public"."journal_entry_lines"("tenant_id" ASC, "account_id" ASC);

-- CreateIndex
CREATE INDEX "journal_entry_lines_tenant_id_idx" ON "public"."journal_entry_lines"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "idx_leads_contact_id" ON "public"."leads"("contact_id" ASC);

-- CreateIndex
CREATE INDEX "leads_tenant_id_idx" ON "public"."leads"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "leaves_employee_id_idx" ON "public"."leaves"("employee_id" ASC);

-- CreateIndex
CREATE INDEX "leaves_status_idx" ON "public"."leaves"("status" ASC);

-- CreateIndex
CREATE INDEX "leaves_tenant_id_idx" ON "public"."leaves"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "idx_ledger_entries_contact_id" ON "public"."ledger_entries"("contact_id" ASC);

-- CreateIndex
CREATE INDEX "ledger_entries_tenant_id_contact_id_idx" ON "public"."ledger_entries"("tenant_id" ASC, "contact_id" ASC);

-- CreateIndex
CREATE INDEX "ledger_entries_tenant_id_reference_id_idx" ON "public"."ledger_entries"("tenant_id" ASC, "reference_id" ASC);

-- CreateIndex
CREATE INDEX "idx_notifications_tenant_id" ON "public"."notifications"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "notifications_tenant_id_user_id_created_at_idx" ON "public"."notifications"("tenant_id" ASC, "user_id" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "notifications_user_id_tenant_id_idx" ON "public"."notifications"("user_id" ASC, "tenant_id" ASC);

-- CreateIndex
CREATE INDEX "payments_bill_id_idx" ON "public"."payments"("bill_id" ASC);

-- CreateIndex
CREATE INDEX "payments_contact_id_idx" ON "public"."payments"("contact_id" ASC);

-- CreateIndex
CREATE INDEX "payments_invoice_id_idx" ON "public"."payments"("invoice_id" ASC);

-- CreateIndex
CREATE INDEX "payments_tenant_id_idx" ON "public"."payments"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "payments_tenant_id_invoice_id_idx" ON "public"."payments"("tenant_id" ASC, "invoice_id" ASC);

-- CreateIndex
CREATE INDEX "payments_tenant_id_type_payment_date_idx" ON "public"."payments"("tenant_id" ASC, "type" ASC, "payment_date" ASC);

-- CreateIndex
CREATE INDEX "payroll_runs_status_idx" ON "public"."payroll_runs"("status" ASC);

-- CreateIndex
CREATE INDEX "payroll_runs_tenant_id_idx" ON "public"."payroll_runs"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "payroll_runs_tenant_id_period_year_period_month_key" ON "public"."payroll_runs"("tenant_id" ASC, "period_year" ASC, "period_month" ASC);

-- CreateIndex
CREATE INDEX "payslips_employee_id_idx" ON "public"."payslips"("employee_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "payslips_payroll_run_id_employee_id_key" ON "public"."payslips"("payroll_run_id" ASC, "employee_id" ASC);

-- CreateIndex
CREATE INDEX "payslips_payroll_run_id_idx" ON "public"."payslips"("payroll_run_id" ASC);

-- CreateIndex
CREATE INDEX "payslips_tenant_id_idx" ON "public"."payslips"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "payslips_tenant_id_slip_number_key" ON "public"."payslips"("tenant_id" ASC, "slip_number" ASC);

-- CreateIndex
CREATE INDEX "performance_reviews_cycle_id_idx" ON "public"."performance_reviews"("cycle_id" ASC);

-- CreateIndex
CREATE INDEX "performance_reviews_employee_id_idx" ON "public"."performance_reviews"("employee_id" ASC);

-- CreateIndex
CREATE INDEX "performance_reviews_reviewer_id_idx" ON "public"."performance_reviews"("reviewer_id" ASC);

-- CreateIndex
CREATE INDEX "performance_reviews_status_idx" ON "public"."performance_reviews"("status" ASC);

-- CreateIndex
CREATE INDEX "performance_reviews_tenant_id_idx" ON "public"."performance_reviews"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "performance_reviews_tenant_id_review_code_key" ON "public"."performance_reviews"("tenant_id" ASC, "review_code" ASC);

-- CreateIndex
CREATE INDEX "portal_ticket_messages_ticket_id_idx" ON "public"."portal_ticket_messages"("ticket_id" ASC);

-- CreateIndex
CREATE INDEX "portal_tickets_contact_id_idx" ON "public"."portal_tickets"("contact_id" ASC);

-- CreateIndex
CREATE INDEX "portal_tickets_tenant_id_idx" ON "public"."portal_tickets"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "pos_sessions_tenant_id_idx" ON "public"."pos_sessions"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "price_list_items_price_list_id_idx" ON "public"."price_list_items"("price_list_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "price_list_items_price_list_id_product_id_min_quantity_key" ON "public"."price_list_items"("price_list_id" ASC, "product_id" ASC, "min_quantity" ASC);

-- CreateIndex
CREATE INDEX "price_list_items_product_id_idx" ON "public"."price_list_items"("product_id" ASC);

-- CreateIndex
CREATE INDEX "price_list_items_tenant_id_idx" ON "public"."price_list_items"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "price_lists_is_active_idx" ON "public"."price_lists"("is_active" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "price_lists_tenant_id_code_key" ON "public"."price_lists"("tenant_id" ASC, "code" ASC);

-- CreateIndex
CREATE INDEX "price_lists_tenant_id_idx" ON "public"."price_lists"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "pricing_plans_region_code_tier_key" ON "public"."pricing_plans"("region_code" ASC, "tier" ASC);

-- CreateIndex
CREATE INDEX "processed_stripe_events_event_id_idx" ON "public"."processed_stripe_events"("event_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "processed_stripe_events_event_id_key" ON "public"."processed_stripe_events"("event_id" ASC);

-- CreateIndex
CREATE INDEX "product_batches_expiry_date_idx" ON "public"."product_batches"("expiry_date" ASC);

-- CreateIndex
CREATE INDEX "product_batches_product_id_idx" ON "public"."product_batches"("product_id" ASC);

-- CreateIndex
CREATE INDEX "product_batches_status_idx" ON "public"."product_batches"("status" ASC);

-- CreateIndex
CREATE INDEX "product_batches_tenant_id_idx" ON "public"."product_batches"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "product_batches_tenant_product_batch_key" ON "public"."product_batches"("tenant_id" ASC, "product_id" ASC, "batch_number" ASC);

-- CreateIndex
CREATE INDEX "product_batches_warehouse_id_idx" ON "public"."product_batches"("warehouse_id" ASC);

-- CreateIndex
CREATE INDEX "product_serials_batch_id_idx" ON "public"."product_serials"("batch_id" ASC);

-- CreateIndex
CREATE INDEX "product_serials_product_id_idx" ON "public"."product_serials"("product_id" ASC);

-- CreateIndex
CREATE INDEX "product_serials_purchase_order_id_idx" ON "public"."product_serials"("purchase_order_id" ASC);

-- CreateIndex
CREATE INDEX "product_serials_status_idx" ON "public"."product_serials"("status" ASC);

-- CreateIndex
CREATE INDEX "product_serials_tenant_id_idx" ON "public"."product_serials"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "product_serials_tenant_product_serial_key" ON "public"."product_serials"("tenant_id" ASC, "product_id" ASC, "serial_number" ASC);

-- CreateIndex
CREATE INDEX "product_serials_warehouse_id_idx" ON "public"."product_serials"("warehouse_id" ASC);

-- CreateIndex
CREATE INDEX "idx_products_tax_group_id" ON "public"."products"("tax_group_id" ASC);

-- CreateIndex
CREATE INDEX "products_tenant_id_idx" ON "public"."products"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "products_tenant_id_sku_idx" ON "public"."products"("tenant_id" ASC, "sku" ASC);

-- CreateIndex
CREATE INDEX "idx_profiles_tenant_id" ON "public"."profiles"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "public"."profiles"("email" ASC);

-- CreateIndex
CREATE INDEX "project_members_employee_id_idx" ON "public"."project_members"("employee_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "project_members_project_id_employee_id_key" ON "public"."project_members"("project_id" ASC, "employee_id" ASC);

-- CreateIndex
CREATE INDEX "project_members_project_id_idx" ON "public"."project_members"("project_id" ASC);

-- CreateIndex
CREATE INDEX "project_members_tenant_id_idx" ON "public"."project_members"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "project_milestones_project_id_idx" ON "public"."project_milestones"("project_id" ASC);

-- CreateIndex
CREATE INDEX "project_milestones_status_idx" ON "public"."project_milestones"("status" ASC);

-- CreateIndex
CREATE INDEX "project_milestones_tenant_id_idx" ON "public"."project_milestones"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "project_tasks_assigned_employee_id_idx" ON "public"."project_tasks"("assigned_employee_id" ASC);

-- CreateIndex
CREATE INDEX "project_tasks_milestone_id_idx" ON "public"."project_tasks"("milestone_id" ASC);

-- CreateIndex
CREATE INDEX "project_tasks_project_id_idx" ON "public"."project_tasks"("project_id" ASC);

-- CreateIndex
CREATE INDEX "project_tasks_status_idx" ON "public"."project_tasks"("status" ASC);

-- CreateIndex
CREATE INDEX "project_tasks_tenant_id_idx" ON "public"."project_tasks"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "project_tasks_tenant_id_task_code_key" ON "public"."project_tasks"("tenant_id" ASC, "task_code" ASC);

-- CreateIndex
CREATE INDEX "project_time_entries_employee_id_idx" ON "public"."project_time_entries"("employee_id" ASC);

-- CreateIndex
CREATE INDEX "project_time_entries_project_id_idx" ON "public"."project_time_entries"("project_id" ASC);

-- CreateIndex
CREATE INDEX "project_time_entries_task_id_idx" ON "public"."project_time_entries"("task_id" ASC);

-- CreateIndex
CREATE INDEX "project_time_entries_tenant_id_idx" ON "public"."project_time_entries"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "projects_client_id_idx" ON "public"."projects"("client_id" ASC);

-- CreateIndex
CREATE INDEX "projects_manager_id_idx" ON "public"."projects"("manager_id" ASC);

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "public"."projects"("status" ASC);

-- CreateIndex
CREATE INDEX "projects_tenant_id_idx" ON "public"."projects"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "projects_tenant_id_project_code_key" ON "public"."projects"("tenant_id" ASC, "project_code" ASC);

-- CreateIndex
CREATE INDEX "idx_purchase_order_items_po_id" ON "public"."purchase_order_items"("purchase_order_id" ASC);

-- CreateIndex
CREATE INDEX "idx_purchase_order_items_product_id" ON "public"."purchase_order_items"("product_id" ASC);

-- CreateIndex
CREATE INDEX "idx_purchase_orders_bill_id" ON "public"."purchase_orders"("bill_id" ASC);

-- CreateIndex
CREATE INDEX "idx_purchase_orders_vendor_id" ON "public"."purchase_orders"("vendor_id" ASC);

-- CreateIndex
CREATE INDEX "idx_purchase_orders_warehouse_id" ON "public"."purchase_orders"("warehouse_id" ASC);

-- CreateIndex
CREATE INDEX "purchase_orders_tenant_id_idx" ON "public"."purchase_orders"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_tenant_id_order_number_key" ON "public"."purchase_orders"("tenant_id" ASC, "order_number" ASC);

-- CreateIndex
CREATE INDEX "purchase_orders_tenant_id_status_idx" ON "public"."purchase_orders"("tenant_id" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "quality_inspections_tenant_id_idx" ON "public"."quality_inspections"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "quality_inspections_tenant_id_inspection_number_key" ON "public"."quality_inspections"("tenant_id" ASC, "inspection_number" ASC);

-- CreateIndex
CREATE INDEX "quality_inspections_work_order_id_idx" ON "public"."quality_inspections"("work_order_id" ASC);

-- CreateIndex
CREATE INDEX "idx_quote_items_quote_id" ON "public"."quote_items"("quote_id" ASC);

-- CreateIndex
CREATE INDEX "idx_quotes_contact_id" ON "public"."quotes"("contact_id" ASC);

-- CreateIndex
CREATE INDEX "quotes_tenant_id_idx" ON "public"."quotes"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "quotes_tenant_id_quote_number_key" ON "public"."quotes"("tenant_id" ASC, "quote_number" ASC);

-- CreateIndex
CREATE INDEX "quotes_tenant_id_status_idx" ON "public"."quotes"("tenant_id" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "recurring_executions_invoice_id_idx" ON "public"."recurring_executions"("invoice_id" ASC);

-- CreateIndex
CREATE INDEX "recurring_executions_recurring_profile_id_idx" ON "public"."recurring_executions"("recurring_profile_id" ASC);

-- CreateIndex
CREATE INDEX "recurring_executions_tenant_id_idx" ON "public"."recurring_executions"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "recurring_profile_items_product_id_idx" ON "public"."recurring_profile_items"("product_id" ASC);

-- CreateIndex
CREATE INDEX "recurring_profile_items_recurring_profile_id_idx" ON "public"."recurring_profile_items"("recurring_profile_id" ASC);

-- CreateIndex
CREATE INDEX "recurring_profile_items_tenant_id_idx" ON "public"."recurring_profile_items"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "recurring_profiles_contact_id_idx" ON "public"."recurring_profiles"("contact_id" ASC);

-- CreateIndex
CREATE INDEX "recurring_profiles_next_run_date_idx" ON "public"."recurring_profiles"("next_run_date" ASC);

-- CreateIndex
CREATE INDEX "recurring_profiles_status_idx" ON "public"."recurring_profiles"("status" ASC);

-- CreateIndex
CREATE INDEX "recurring_profiles_tenant_id_idx" ON "public"."recurring_profiles"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "recurring_profiles_tenant_id_profile_number_key" ON "public"."recurring_profiles"("tenant_id" ASC, "profile_number" ASC);

-- CreateIndex
CREATE INDEX "rental_agreement_items_agreement_id_idx" ON "public"."rental_agreement_items"("agreement_id" ASC);

-- CreateIndex
CREATE INDEX "rental_agreement_items_asset_id_idx" ON "public"."rental_agreement_items"("asset_id" ASC);

-- CreateIndex
CREATE INDEX "rental_agreement_items_tenant_id_idx" ON "public"."rental_agreement_items"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "rental_agreements_contact_id_idx" ON "public"."rental_agreements"("contact_id" ASC);

-- CreateIndex
CREATE INDEX "rental_agreements_status_idx" ON "public"."rental_agreements"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rental_agreements_tenant_id_agreement_number_key" ON "public"."rental_agreements"("tenant_id" ASC, "agreement_number" ASC);

-- CreateIndex
CREATE INDEX "rental_agreements_tenant_id_idx" ON "public"."rental_agreements"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "rental_assets_category_idx" ON "public"."rental_assets"("category" ASC);

-- CreateIndex
CREATE INDEX "rental_assets_status_idx" ON "public"."rental_assets"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rental_assets_tenant_id_asset_code_key" ON "public"."rental_assets"("tenant_id" ASC, "asset_code" ASC);

-- CreateIndex
CREATE INDEX "rental_assets_tenant_id_idx" ON "public"."rental_assets"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "rental_assets_warehouse_id_idx" ON "public"."rental_assets"("warehouse_id" ASC);

-- CreateIndex
CREATE INDEX "rental_returns_agreement_id_idx" ON "public"."rental_returns"("agreement_id" ASC);

-- CreateIndex
CREATE INDEX "rental_returns_asset_id_idx" ON "public"."rental_returns"("asset_id" ASC);

-- CreateIndex
CREATE INDEX "rental_returns_tenant_id_idx" ON "public"."rental_returns"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "request_for_quotations_converted_po_id_idx" ON "public"."request_for_quotations"("converted_po_id" ASC);

-- CreateIndex
CREATE INDEX "request_for_quotations_status_idx" ON "public"."request_for_quotations"("status" ASC);

-- CreateIndex
CREATE INDEX "request_for_quotations_tenant_id_idx" ON "public"."request_for_quotations"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "request_for_quotations_tenant_id_rfq_number_key" ON "public"."request_for_quotations"("tenant_id" ASC, "rfq_number" ASC);

-- CreateIndex
CREATE INDEX "rfq_items_product_id_idx" ON "public"."rfq_items"("product_id" ASC);

-- CreateIndex
CREATE INDEX "rfq_items_rfq_id_idx" ON "public"."rfq_items"("rfq_id" ASC);

-- CreateIndex
CREATE INDEX "rfq_vendor_quote_items_quote_id_idx" ON "public"."rfq_vendor_quote_items"("quote_id" ASC);

-- CreateIndex
CREATE INDEX "rfq_vendor_quote_items_rfq_item_id_idx" ON "public"."rfq_vendor_quote_items"("rfq_item_id" ASC);

-- CreateIndex
CREATE INDEX "rfq_vendor_quotes_rfq_id_idx" ON "public"."rfq_vendor_quotes"("rfq_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rfq_vendor_quotes_rfq_id_vendor_id_key" ON "public"."rfq_vendor_quotes"("rfq_id" ASC, "vendor_id" ASC);

-- CreateIndex
CREATE INDEX "rfq_vendor_quotes_tenant_id_idx" ON "public"."rfq_vendor_quotes"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "rfq_vendor_quotes_vendor_id_idx" ON "public"."rfq_vendor_quotes"("vendor_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "salary_structures_tenant_id_code_key" ON "public"."salary_structures"("tenant_id" ASC, "code" ASC);

-- CreateIndex
CREATE INDEX "salary_structures_tenant_id_idx" ON "public"."salary_structures"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "idx_sales_order_items_order_id" ON "public"."sales_order_items"("order_id" ASC);

-- CreateIndex
CREATE INDEX "idx_sales_orders_contact_id" ON "public"."sales_orders"("contact_id" ASC);

-- CreateIndex
CREATE INDEX "idx_sales_orders_quote_id" ON "public"."sales_orders"("quote_id" ASC);

-- CreateIndex
CREATE INDEX "sales_orders_tenant_id_idx" ON "public"."sales_orders"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sales_orders_tenant_id_order_number_key" ON "public"."sales_orders"("tenant_id" ASC, "order_number" ASC);

-- CreateIndex
CREATE INDEX "sales_orders_tenant_id_status_idx" ON "public"."sales_orders"("tenant_id" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "idx_site_content_versions_key" ON "public"."site_content_versions"("key" ASC, "published_at" DESC);

-- CreateIndex
CREATE INDEX "idx_site_items_kind_status" ON "public"."site_items"("kind" ASC, "status" ASC, "sort" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "uq_site_items_kind_slug" ON "public"."site_items"("kind" ASC, "slug" ASC);

-- CreateIndex
CREATE INDEX "idx_site_leads_status" ON "public"."site_leads"("status" ASC, "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "site_media_path_key" ON "public"."site_media"("path" ASC);

-- CreateIndex
CREATE INDEX "idx_stock_movements_to_warehouse_id" ON "public"."stock_movements"("to_warehouse_id" ASC);

-- CreateIndex
CREATE INDEX "stock_movements_product_id_idx" ON "public"."stock_movements"("product_id" ASC);

-- CreateIndex
CREATE INDEX "stock_movements_tenant_id_created_at_idx" ON "public"."stock_movements"("tenant_id" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "stock_movements_tenant_id_idx" ON "public"."stock_movements"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "stock_movements_tenant_id_reference_no_idx" ON "public"."stock_movements"("tenant_id" ASC, "reference_no" ASC);

-- CreateIndex
CREATE INDEX "stock_movements_warehouse_id_idx" ON "public"."stock_movements"("warehouse_id" ASC);

-- CreateIndex
CREATE INDEX "support_messages_ticket_id_idx" ON "public"."support_messages"("ticket_id" ASC);

-- CreateIndex
CREATE INDEX "support_tickets_tenant_id_idx" ON "public"."support_tickets"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "system_logs_level_idx" ON "public"."system_logs"("level" ASC);

-- CreateIndex
CREATE INDEX "system_logs_tenant_id_idx" ON "public"."system_logs"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "system_logs_timestamp_idx" ON "public"."system_logs"("timestamp" ASC);

-- CreateIndex
CREATE INDEX "tasks_contact_id_idx" ON "public"."tasks"("contact_id" ASC);

-- CreateIndex
CREATE INDEX "tasks_deal_id_idx" ON "public"."tasks"("deal_id" ASC);

-- CreateIndex
CREATE INDEX "tasks_lead_id_idx" ON "public"."tasks"("lead_id" ASC);

-- CreateIndex
CREATE INDEX "tasks_tenant_id_idx" ON "public"."tasks"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "tax_groups_tenant_id_idx" ON "public"."tax_groups"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "idx_tax_rates_tax_group_id" ON "public"."tax_rates"("tax_group_id" ASC);

-- CreateIndex
CREATE INDEX "idx_tenant_audit_logs_action" ON "public"."tenant_audit_logs"("action" ASC);

-- CreateIndex
CREATE INDEX "idx_tenant_audit_logs_tenant_time" ON "public"."tenant_audit_logs"("tenant_id" ASC, "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_domain_key" ON "public"."tenants"("domain" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_stripe_customer_id_key" ON "public"."tenants"("stripe_customer_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_stripe_subscription_id_key" ON "public"."tenants"("stripe_subscription_id" ASC);

-- CreateIndex
CREATE INDEX "training_enrollments_employee_id_idx" ON "public"."training_enrollments"("employee_id" ASC);

-- CreateIndex
CREATE INDEX "training_enrollments_program_id_idx" ON "public"."training_enrollments"("program_id" ASC);

-- CreateIndex
CREATE INDEX "training_enrollments_status_idx" ON "public"."training_enrollments"("status" ASC);

-- CreateIndex
CREATE INDEX "training_enrollments_tenant_id_idx" ON "public"."training_enrollments"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "training_enrollments_tenant_id_program_id_employee_id_key" ON "public"."training_enrollments"("tenant_id" ASC, "program_id" ASC, "employee_id" ASC);

-- CreateIndex
CREATE INDEX "training_programs_category_idx" ON "public"."training_programs"("category" ASC);

-- CreateIndex
CREATE INDEX "training_programs_status_idx" ON "public"."training_programs"("status" ASC);

-- CreateIndex
CREATE INDEX "training_programs_tenant_id_idx" ON "public"."training_programs"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "training_programs_tenant_id_program_code_key" ON "public"."training_programs"("tenant_id" ASC, "program_code" ASC);

-- CreateIndex
CREATE INDEX "warehouse_stocks_product_id_idx" ON "public"."warehouse_stocks"("product_id" ASC);

-- CreateIndex
CREATE INDEX "warehouse_stocks_tenant_id_idx" ON "public"."warehouse_stocks"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_stocks_warehouse_id_product_id_key" ON "public"."warehouse_stocks"("warehouse_id" ASC, "product_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_tenant_id_code_key" ON "public"."warehouses"("tenant_id" ASC, "code" ASC);

-- CreateIndex
CREATE INDEX "warehouses_tenant_id_idx" ON "public"."warehouses"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "web_forms_code_key" ON "public"."web_forms"("code" ASC);

-- CreateIndex
CREATE INDEX "web_forms_tenant_id_idx" ON "public"."web_forms"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "web_forms_tenant_id_status_idx" ON "public"."web_forms"("tenant_id" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "idx_work_orders_source_warehouse_id" ON "public"."work_orders"("source_warehouse_id" ASC);

-- CreateIndex
CREATE INDEX "idx_work_orders_target_warehouse_id" ON "public"."work_orders"("target_warehouse_id" ASC);

-- CreateIndex
CREATE INDEX "work_orders_bom_id_idx" ON "public"."work_orders"("bom_id" ASC);

-- CreateIndex
CREATE INDEX "work_orders_product_id_idx" ON "public"."work_orders"("product_id" ASC);

-- CreateIndex
CREATE INDEX "work_orders_status_idx" ON "public"."work_orders"("status" ASC);

-- CreateIndex
CREATE INDEX "work_orders_tenant_id_idx" ON "public"."work_orders"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "work_orders_tenant_id_order_number_key" ON "public"."work_orders"("tenant_id" ASC, "order_number" ASC);

-- CreateIndex
CREATE INDEX "idx_workflow_executions_tenant_status" ON "public"."workflow_executions"("tenant_id" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "idx_workflow_executions_workflow_created" ON "public"."workflow_executions"("workflow_id" ASC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_workflow_rules_tenant_active" ON "public"."workflow_rules"("tenant_id" ASC, "is_active" ASC);

-- CreateIndex
CREATE INDEX "idx_workflow_rules_tenant_trigger" ON "public"."workflow_rules"("tenant_id" ASC, "trigger_event" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "uq_workflow_rules_tenant_code" ON "public"."workflow_rules"("tenant_id" ASC, "code" ASC);

-- AddForeignKey
ALTER TABLE "public"."accounts" ADD CONSTRAINT "accounts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."accounts" ADD CONSTRAINT "accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."applicant_interviews" ADD CONSTRAINT "applicant_interviews_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "public"."job_applicants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."applicant_interviews" ADD CONSTRAINT "applicant_interviews_interviewer_id_fkey" FOREIGN KEY ("interviewer_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."applicant_interviews" ADD CONSTRAINT "applicant_interviews_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."appraisal_cycles" ADD CONSTRAINT "appraisal_cycles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attendances" ADD CONSTRAINT "attendances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attendances" ADD CONSTRAINT "attendances_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bank_accounts" ADD CONSTRAINT "bank_accounts_chart_of_account_id_fkey" FOREIGN KEY ("chart_of_account_id") REFERENCES "public"."accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bank_accounts" ADD CONSTRAINT "bank_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bank_statements" ADD CONSTRAINT "bank_statements_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bank_statements" ADD CONSTRAINT "bank_statements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bank_transactions" ADD CONSTRAINT "bank_transactions_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bank_transactions" ADD CONSTRAINT "bank_transactions_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bank_transactions" ADD CONSTRAINT "bank_transactions_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bank_transactions" ADD CONSTRAINT "bank_transactions_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bank_transactions" ADD CONSTRAINT "bank_transactions_statement_id_fkey" FOREIGN KEY ("statement_id") REFERENCES "public"."bank_statements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bank_transactions" ADD CONSTRAINT "bank_transactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bill_items" ADD CONSTRAINT "bill_items_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bill_items" ADD CONSTRAINT "bill_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bill_of_materials" ADD CONSTRAINT "bill_of_materials_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bill_of_materials" ADD CONSTRAINT "bill_of_materials_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bill_of_materials_items" ADD CONSTRAINT "bill_of_materials_items_bom_id_fkey" FOREIGN KEY ("bom_id") REFERENCES "public"."bill_of_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bill_of_materials_items" ADD CONSTRAINT "bill_of_materials_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bills" ADD CONSTRAINT "bills_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bills" ADD CONSTRAINT "bills_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."budget_items" ADD CONSTRAINT "budget_items_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."budget_items" ADD CONSTRAINT "budget_items_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."budget_items" ADD CONSTRAINT "budget_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."budgets" ADD CONSTRAINT "budgets_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."budgets" ADD CONSTRAINT "budgets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."communication_logs" ADD CONSTRAINT "communication_logs_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."communication_logs" ADD CONSTRAINT "communication_logs_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."communication_logs" ADD CONSTRAINT "communication_logs_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."communication_logs" ADD CONSTRAINT "communication_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."companies" ADD CONSTRAINT "companies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."contacts" ADD CONSTRAINT "contacts_price_list_id_fkey" FOREIGN KEY ("price_list_id") REFERENCES "public"."price_lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."contacts" ADD CONSTRAINT "contacts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."credit_note_items" ADD CONSTRAINT "credit_note_items_credit_note_id_fkey" FOREIGN KEY ("credit_note_id") REFERENCES "public"."credit_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."credit_note_items" ADD CONSTRAINT "credit_note_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."credit_note_items" ADD CONSTRAINT "credit_note_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."credit_note_items" ADD CONSTRAINT "credit_note_items_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."credit_note_refunds" ADD CONSTRAINT "credit_note_refunds_credit_note_id_fkey" FOREIGN KEY ("credit_note_id") REFERENCES "public"."credit_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."credit_note_refunds" ADD CONSTRAINT "credit_note_refunds_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."credit_notes" ADD CONSTRAINT "credit_notes_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."credit_notes" ADD CONSTRAINT "credit_notes_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."credit_notes" ADD CONSTRAINT "credit_notes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."custom_reports" ADD CONSTRAINT "custom_reports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."deals" ADD CONSTRAINT "deals_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."delivery_challan_items" ADD CONSTRAINT "delivery_challan_items_challan_id_fkey" FOREIGN KEY ("challan_id") REFERENCES "public"."delivery_challans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."delivery_challan_items" ADD CONSTRAINT "delivery_challan_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."delivery_challans" ADD CONSTRAINT "delivery_challans_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."delivery_challans" ADD CONSTRAINT "delivery_challans_converted_invoice_id_fkey" FOREIGN KEY ("converted_invoice_id") REFERENCES "public"."invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."delivery_challans" ADD CONSTRAINT "delivery_challans_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."delivery_challans" ADD CONSTRAINT "delivery_challans_source_warehouse_id_fkey" FOREIGN KEY ("source_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."delivery_challans" ADD CONSTRAINT "delivery_challans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."departments" ADD CONSTRAINT "departments_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."departments" ADD CONSTRAINT "departments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."designations" ADD CONSTRAINT "designations_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."designations" ADD CONSTRAINT "designations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."email_accounts" ADD CONSTRAINT "email_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."email_messages" ADD CONSTRAINT "email_messages_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."email_messages" ADD CONSTRAINT "email_messages_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."email_messages" ADD CONSTRAINT "email_messages_email_account_id_fkey" FOREIGN KEY ("email_account_id") REFERENCES "public"."email_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."email_messages" ADD CONSTRAINT "email_messages_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."email_messages" ADD CONSTRAINT "email_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."email_templates" ADD CONSTRAINT "email_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_goals" ADD CONSTRAINT "employee_goals_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."appraisal_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_goals" ADD CONSTRAINT "employee_goals_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_goals" ADD CONSTRAINT "employee_goals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "public"."designations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_salary_structure_id_fkey" FOREIGN KEY ("salary_structure_id") REFERENCES "public"."salary_structures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_payment_account_id_fkey" FOREIGN KEY ("payment_account_id") REFERENCES "public"."accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."form_submissions" ADD CONSTRAINT "form_submissions_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."form_submissions" ADD CONSTRAINT "form_submissions_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."form_submissions" ADD CONSTRAINT "form_submissions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."form_submissions" ADD CONSTRAINT "form_submissions_web_form_id_fkey" FOREIGN KEY ("web_form_id") REFERENCES "public"."web_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_line_items" ADD CONSTRAINT "invoice_line_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_recurring_profile_id_fkey" FOREIGN KEY ("recurring_profile_id") REFERENCES "public"."recurring_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."job_applicants" ADD CONSTRAINT "job_applicants_converted_employee_id_fkey" FOREIGN KEY ("converted_employee_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."job_applicants" ADD CONSTRAINT "job_applicants_job_opening_id_fkey" FOREIGN KEY ("job_opening_id") REFERENCES "public"."job_openings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."job_applicants" ADD CONSTRAINT "job_applicants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."job_openings" ADD CONSTRAINT "job_openings_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."job_openings" ADD CONSTRAINT "job_openings_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "public"."designations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."job_openings" ADD CONSTRAINT "job_openings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."journal_entries" ADD CONSTRAINT "journal_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."leads" ADD CONSTRAINT "leads_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."leaves" ADD CONSTRAINT "leaves_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."leaves" ADD CONSTRAINT "leaves_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ledger_entries" ADD CONSTRAINT "ledger_entries_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ledger_entries" ADD CONSTRAINT "ledger_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payroll_runs" ADD CONSTRAINT "payroll_runs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payslips" ADD CONSTRAINT "payslips_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payslips" ADD CONSTRAINT "payslips_payroll_run_id_fkey" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payslips" ADD CONSTRAINT "payslips_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."performance_reviews" ADD CONSTRAINT "performance_reviews_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."appraisal_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."performance_reviews" ADD CONSTRAINT "performance_reviews_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."performance_reviews" ADD CONSTRAINT "performance_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."performance_reviews" ADD CONSTRAINT "performance_reviews_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."portal_ticket_messages" ADD CONSTRAINT "portal_ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."portal_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."portal_tickets" ADD CONSTRAINT "portal_tickets_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."portal_tickets" ADD CONSTRAINT "portal_tickets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pos_sessions" ADD CONSTRAINT "pos_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."price_list_items" ADD CONSTRAINT "price_list_items_price_list_id_fkey" FOREIGN KEY ("price_list_id") REFERENCES "public"."price_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."price_list_items" ADD CONSTRAINT "price_list_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."price_list_items" ADD CONSTRAINT "price_list_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."price_lists" ADD CONSTRAINT "price_lists_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_batches" ADD CONSTRAINT "product_batches_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."product_batches" ADD CONSTRAINT "product_batches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."product_batches" ADD CONSTRAINT "product_batches_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."product_serials" ADD CONSTRAINT "product_serials_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."product_batches"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."product_serials" ADD CONSTRAINT "product_serials_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."product_serials" ADD CONSTRAINT "product_serials_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."product_serials" ADD CONSTRAINT "product_serials_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."product_serials" ADD CONSTRAINT "product_serials_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."products" ADD CONSTRAINT "products_tax_group_id_fkey" FOREIGN KEY ("tax_group_id") REFERENCES "public"."tax_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."products" ADD CONSTRAINT "products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_members" ADD CONSTRAINT "project_members_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_members" ADD CONSTRAINT "project_members_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_milestones" ADD CONSTRAINT "project_milestones_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_milestones" ADD CONSTRAINT "project_milestones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_tasks" ADD CONSTRAINT "project_tasks_assigned_employee_id_fkey" FOREIGN KEY ("assigned_employee_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_tasks" ADD CONSTRAINT "project_tasks_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "public"."project_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_tasks" ADD CONSTRAINT "project_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_tasks" ADD CONSTRAINT "project_tasks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_time_entries" ADD CONSTRAINT "project_time_entries_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_time_entries" ADD CONSTRAINT "project_time_entries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_time_entries" ADD CONSTRAINT "project_time_entries_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."project_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_time_entries" ADD CONSTRAINT "project_time_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_order_items" ADD CONSTRAINT "purchase_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_orders" ADD CONSTRAINT "purchase_orders_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_orders" ADD CONSTRAINT "purchase_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_orders" ADD CONSTRAINT "purchase_orders_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_orders" ADD CONSTRAINT "purchase_orders_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quality_inspections" ADD CONSTRAINT "quality_inspections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quality_inspections" ADD CONSTRAINT "quality_inspections_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quote_items" ADD CONSTRAINT "quote_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quotes" ADD CONSTRAINT "quotes_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quotes" ADD CONSTRAINT "quotes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recurring_executions" ADD CONSTRAINT "recurring_executions_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recurring_executions" ADD CONSTRAINT "recurring_executions_recurring_profile_id_fkey" FOREIGN KEY ("recurring_profile_id") REFERENCES "public"."recurring_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recurring_executions" ADD CONSTRAINT "recurring_executions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recurring_profile_items" ADD CONSTRAINT "recurring_profile_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recurring_profile_items" ADD CONSTRAINT "recurring_profile_items_recurring_profile_id_fkey" FOREIGN KEY ("recurring_profile_id") REFERENCES "public"."recurring_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recurring_profile_items" ADD CONSTRAINT "recurring_profile_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recurring_profiles" ADD CONSTRAINT "recurring_profiles_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recurring_profiles" ADD CONSTRAINT "recurring_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rental_agreement_items" ADD CONSTRAINT "rental_agreement_items_agreement_id_fkey" FOREIGN KEY ("agreement_id") REFERENCES "public"."rental_agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rental_agreement_items" ADD CONSTRAINT "rental_agreement_items_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."rental_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rental_agreement_items" ADD CONSTRAINT "rental_agreement_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rental_agreements" ADD CONSTRAINT "rental_agreements_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rental_agreements" ADD CONSTRAINT "rental_agreements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rental_assets" ADD CONSTRAINT "rental_assets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rental_assets" ADD CONSTRAINT "rental_assets_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rental_returns" ADD CONSTRAINT "rental_returns_agreement_id_fkey" FOREIGN KEY ("agreement_id") REFERENCES "public"."rental_agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rental_returns" ADD CONSTRAINT "rental_returns_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."rental_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rental_returns" ADD CONSTRAINT "rental_returns_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."request_for_quotations" ADD CONSTRAINT "request_for_quotations_converted_po_id_fkey" FOREIGN KEY ("converted_po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."request_for_quotations" ADD CONSTRAINT "request_for_quotations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."rfq_items" ADD CONSTRAINT "rfq_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."rfq_items" ADD CONSTRAINT "rfq_items_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "public"."request_for_quotations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."rfq_vendor_quote_items" ADD CONSTRAINT "rfq_vendor_quote_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."rfq_vendor_quotes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."rfq_vendor_quote_items" ADD CONSTRAINT "rfq_vendor_quote_items_rfq_item_id_fkey" FOREIGN KEY ("rfq_item_id") REFERENCES "public"."rfq_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."rfq_vendor_quotes" ADD CONSTRAINT "rfq_vendor_quotes_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "public"."request_for_quotations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."rfq_vendor_quotes" ADD CONSTRAINT "rfq_vendor_quotes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."rfq_vendor_quotes" ADD CONSTRAINT "rfq_vendor_quotes_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."contacts"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."salary_structures" ADD CONSTRAINT "salary_structures_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sales_order_items" ADD CONSTRAINT "sales_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sales_orders" ADD CONSTRAINT "sales_orders_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sales_orders" ADD CONSTRAINT "sales_orders_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sales_orders" ADD CONSTRAINT "sales_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_movements" ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_movements" ADD CONSTRAINT "stock_movements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_movements" ADD CONSTRAINT "stock_movements_to_warehouse_id_fkey" FOREIGN KEY ("to_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_movements" ADD CONSTRAINT "stock_movements_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_messages" ADD CONSTRAINT "support_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_tickets" ADD CONSTRAINT "support_tickets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."system_logs" ADD CONSTRAINT "system_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tax_groups" ADD CONSTRAINT "tax_groups_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tax_rates" ADD CONSTRAINT "tax_rates_tax_group_id_fkey" FOREIGN KEY ("tax_group_id") REFERENCES "public"."tax_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tenant_audit_logs" ADD CONSTRAINT "tenant_audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."training_enrollments" ADD CONSTRAINT "training_enrollments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."training_enrollments" ADD CONSTRAINT "training_enrollments_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."training_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."training_enrollments" ADD CONSTRAINT "training_enrollments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."training_programs" ADD CONSTRAINT "training_programs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."warehouse_stocks" ADD CONSTRAINT "warehouse_stocks_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."warehouse_stocks" ADD CONSTRAINT "warehouse_stocks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."warehouse_stocks" ADD CONSTRAINT "warehouse_stocks_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."warehouses" ADD CONSTRAINT "warehouses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."web_forms" ADD CONSTRAINT "web_forms_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."work_orders" ADD CONSTRAINT "work_orders_bom_id_fkey" FOREIGN KEY ("bom_id") REFERENCES "public"."bill_of_materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."work_orders" ADD CONSTRAINT "work_orders_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."work_orders" ADD CONSTRAINT "work_orders_source_warehouse_id_fkey" FOREIGN KEY ("source_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."work_orders" ADD CONSTRAINT "work_orders_target_warehouse_id_fkey" FOREIGN KEY ("target_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."work_orders" ADD CONSTRAINT "work_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."workflow_executions" ADD CONSTRAINT "workflow_executions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."workflow_executions" ADD CONSTRAINT "workflow_executions_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflow_rules"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."workflow_rules" ADD CONSTRAINT "workflow_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

