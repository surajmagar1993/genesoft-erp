# 🧪 Genesoft ERP & CRM — Phase 1 Verification Plan

This verification plan provides a systematic checklist and set of procedures to validate all Phase 1 (MVP) modules of the Genesoft ERP & CRM. It covers **automated checks**, **manual step-by-step UI test protocols**, and **database-level verification scripts**.

---

## 1. Automated Verification Checks

To verify build stability, schema integrity, and initial configurations:

### 1.1 Next.js Build & Compile Test
Runs static analysis, compiles TypeScript, and checks for server action bindings.
- **Command**:
  ```bash
  npm run build
  ```
- **Expectation**: Passes with exit code `0`. Resolves all dynamic routes and verifies that the prisma recursive proxy allows compile-time packaging without a database connection.

### 1.2 Prisma Schema & Migration Verification
Ensures that the database tables and columns match the active datamodel.
- **Commands**:
  ```bash
  npx prisma validate
  ```
- **Expectation**: Schema compiles successfully without warnings or structural errors.

---

## 2. Database Verification Queries (Supabase SQL Editor)

Use these SQL checks in the Supabase SQL editor to ensure Row-Level Security (RLS) policies and core seeds are functioning.

### 2.1 Multi-Tenant Separation (RLS) Test
Verify that the `my_tenant_id()` policy successfully isolates data.
```sql
-- 1. Check active tenants
SELECT id, name, plan, is_active FROM tenants;

-- 2. Verify that users are mapped to profiles and tenants
SELECT p.id, p.email, p.role, t.name as tenant_name 
FROM profiles p 
LEFT JOIN tenants t ON p.tenant_id = t.id;

-- 3. Verify that invoice line items cascade from correct tenant_ids
SELECT id, invoice_number, tenant_id, customer_name, total FROM invoices;
```

### 2.2 Chart of Accounts (CoA) Seed Verification
Verify that the Indian template of 39 accounts has seeded correctly.
```sql
SELECT tenant_id, code, name, type, parent_id 
FROM accounts 
ORDER BY code ASC 
LIMIT 10;
```

---

## 3. Manual UI Test Protocols (Step-by-Step)

### 3.1 Authentication & Role Authorization
1. **Onboarding / Signup**:
   - Go to `/register` and sign up a new account.
   - **Expectation**: Creates a new `Tenant` record, seeds the Indian Chart of Accounts (39 accounts), and links the profile as `ADMIN`.
2. **Access Control**:
   - Attempt to access the Super Admin page `/admin/dashboard` as a standard admin.
   - **Expectation**: Middleware catches the role discrepancy and redirects the user back to `/crm/contacts`.

### 3.2 SaaS Super Admin Command Center (`/admin/dashboard`)
*Requires login with a `SUPER_ADMIN` account (e.g. `suraj.magar1993@gmail.com`).*
1. **KPI Verification**:
   - Verify that **Total Tenants**, **Active Trials**, and **Revenue Estimate** display correct database counts.
2. **Analytics Charts**:
   - Ensure the Recharts **Tenant Growth** line chart and **Global Presence** regional pie chart render correctly.
3. **Database Health Latency**:
   - Check the quick status box. It should display a latency reading (e.g., `85ms`) and show `HEALTHY`.
4. **Recent System Logs**:
   - Verify that the incident monitor displays real-time logs with color-coded severity.

### 3.3 CRM Module (Contacts, Leads, Deals & Timeline)
1. **Contacts Listing & CSV Import**:
   - Navigate to `/crm/contacts`.
   - Click the "Import CSV" button and upload a dummy contact list.
   - **Expectation**: Records populate the contact grid dynamically with paginated controls.
2. **Lead-to-Deal Conversion**:
   - Create a Lead at `/crm/leads/new`.
   - On the Lead details tab view, click "Convert to Deal".
   - **Expectation**: Creates a Deal mapping back to the contact and updates lead status to `CONVERTED`.
3. **Interactive Timeline & Tasks**:
   - Go to any Lead detail view and create a task. Mark it as complete.
   - Add a call interaction log in the Communications tab.
   - **Expectation**: Task completes dynamically, and the timeline logs the call interaction with a timestamp.

### 3.4 Sales & Indian GST Invoice Engine
1. **Product Catalog**:
   - Create a Product. Set type to `PRODUCT`, associate an HSN/SAC code, and select a default `Tax Group` (e.g., GST 18%).
2. **GST Invoice Creation**:
   - Go to `/sales/invoices/new` and select a customer.
   - Set the billing address state to the same as your company state (Intra-state CGST + SGST test).
   - Add a line item.
   - **Expectation**: Tax totals compute automatically showing splitting CGST and SGST.
   - Change place of supply state to a different state (Inter-state IGST test).
   - **Expectation**: Split tax columns merge into a single IGST percentage and amount.
3. **PDF Generation & Email Delivery**:
   - Click "Save & View Invoice", then click "Download PDF".
   - **Expectation**: The invoice compiles a clean PDF with HSN Summary Table, Bank Details, and Total in Words.
   - Click "Email Invoice".
   - **Expectation**: A Resend email triggers and sends the PDF invoice attachment to the customer.

### 3.5 Finance Ledger & AP/AR Tracking
1. **Automated Ledger Ledger Entry**:
   - View the Contact details Ledger tab for a client.
   - Save an Invoice for $1,000 for that contact.
   - **Expectation**: Contact balance increases by $1,000, and a `debit` entry of $1,000 appears on the Ledger.
2. **Partial Payments Logic**:
   - Record a partial payment of $400 against the invoice.
   - **Expectation**: Invoice status shifts to `PARTIALLY_PAID`, customer balance updates to outstanding $600, and a `credit` entry of $400 is added on the Ledger.
3. **Accounts Payable (AP)**:
   - Navigate to `/finance/bills`. Create a vendor bill.
   - **Expectation**: Vendor bill persists and appears on the AR/AP dashboard outstanding balance grids.
4. **Exchange Rate ledger**:
   - Record a transaction using a different currency (e.g., USD).
   - **Expectation**: The ledger entry converts the amount to the tenant's base currency (e.g., INR) based on system exchange rates, updates contact balance, and logs the original values.
