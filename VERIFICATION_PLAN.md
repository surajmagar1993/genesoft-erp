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

---

### 3.6 SaaS Super Admin Tenant Management Protocols
1. **Manual Business Onboarding (`/admin/tenants/new`)**:
   - Navigate to `/admin/tenants/new`.
   - Fill in Business Name, primary email, domain, operating country, and currency.
   - Leave "Auto-seed Standard Chart of Accounts" checked. Click "Provision Tenant".
   - **Expectation**: Tenant record is created in PostgreSQL with active trial window, 39 standard accounts (Assets, Liabilities, Equity, Revenue, Expenses) are seeded in `accounts` table, action is logged in `AdminAuditLog`, and user is redirected to `/admin/tenants/[id]`.
2. **Tenant 360° Profile & User Roster (`/admin/tenants/[id]`)**:
   - Navigate to the newly provisioned tenant page.
   - **Expectation**: Top KPI cards render (Revenue, Invoices, Contacts, Users), Overview tab shows all entity metadata, Team Members tab lists registered users, Business Footprint shows entity counts, and Governance Audit Trail lists the creation event.
3. **In-Place Lifecycle Controls**:
   - Click "Extend Trial (+7d)".
   - **Expectation**: Expiration date increments by 7 days, toast notification appears, and audit log records the extension.
   - Click "Edit Profile", change official phone/website, and save.
   - **Expectation**: Updated fields persist and revalidate immediately.
   - Click "Suspend Account".
   - **Expectation**: Tenant status badge shifts to "Suspended" with red dot, and suspension is logged.

---

### 3.7 SaaS Platform Security & Governance Protocols (`/admin/security`)
1. **Security Command Center & Telemetry**:
   - Navigate to `/admin/security`.
   - **Expectation**: Top telemetry cards render live values for **2FA Mandate**, **Global Rate Limit**, **Firewall Blocklist**, and **Idle Session Guard**.
2. **Access Policy Enforcement**:
   - On the **Access Control** tab, toggle "Enforce Two-Factor Authentication (2FA)" or change "Session Inactivity Timeout".
   - Click "Save Policy".
   - **Expectation**: Success toast appears, updated policy settings persist in database, and an entry with action `SECURITY_POLICY_UPDATE` is committed to `AdminAuditLog`.
3. **Firewall & IP Blocklist Management**:
   - Navigate to the **Firewall** tab.
   - Click "Block IP Address", enter a test IP (e.g., `192.168.1.100`) and a reason.
   - **Expectation**: IP appears immediately in the Active Blocklist table with status `BLOCKED`, and action `SECURITY_IP_BLOCK` is logged in the audit trail.
   - Click "Unblock" on the blocked entry.
   - **Expectation**: Entry is removed from blocklist, action `SECURITY_IP_UNBLOCK` is logged, and UI revalidates immediately.
4. **Rate Limiting & Abuse Prevention**:
   - Navigate to the **Rate Limiting** tab.
   - Adjust "Max Requests Per Minute" or "Burst Allowance" threshold.
   - Click "Update Rate Limits".
   - **Expectation**: Settings save successfully and are confirmed in the Security Audit Trail.
5. **Security Incident & Audit Trail**:
   - Navigate to the **Security Audit Trail** tab.
   - **Expectation**: Displays paginated, chronologically ordered log of security events (IP blocks, policy updates, admin logins) with target details, metadata JSON inspector, and timestamp.

---

### 3.8 Inventory & Multi-Warehouse Operations Protocols (`/inventory`)
1. **Initial Auto-Provisioning & Telemetry**:
   - Navigate to `/inventory`.
   - **Expectation**: Page provisions default "Central Logistics Hub" (`WH-MAIN`) if none exists, maps existing products, and renders 4-column KPI cards (Total Valuation, Total Units, Active Warehouses, Low/Out of Stock).
2. **Multi-Depot Warehouse Provisioning**:
   - Click "New Warehouse", enter facility name (e.g. `West Coast Distribution`), code `WH-02`, city, and manager contact. Click "Create Warehouse".
   - **Expectation**: Warehouse persists in `warehouses` table, appears immediately under the "Warehouses" tab with item counts, and increments the Active Warehouses KPI card.
3. **Stock Adjustment (Receiving & Write-offs)**:
   - Click "Adjust Stock", select an item, choose facility, select `IN` (Stock In), enter quantity `100`, and provide a PO reference.
   - **Expectation**: Warehouse stock increments by 100, product aggregate stock updates, Total Valuation increases, and a `STOCK IN` transaction appears in the "Movement Ledger" tab.
   - Repeat with `DAMAGE` or `OUT`.
   - **Expectation**: Warehouse balance decrements appropriately and write-off is logged in audit trail.
4. **Inter-Warehouse Stock Transfer**:
   - Click "Transfer Stock", select item, source `WH-MAIN`, destination `WH-02`, and quantity `25`.
   - **Expectation**: Units in `WH-MAIN` decrease by 25, units in `WH-02` increase by 25, total tenant-wide stock remains invariant, and a `TRANSFER` record is logged in the Movement Ledger with source and destination arrows.
5. **Low Stock Thresholds & Restock Action**:
   - Perform an adjustment setting an item's stock below its reorder point (e.g., <= 10).
   - **Expectation**: Item receives amber "Low Stock" badge, low-stock warning callout banner appears, item lists under "Reorder Alerts" tab with calculated deficit units and estimated restock cost, and clicking "Receive Stock" opens the pre-filled adjustment dialog.

---

### 3.9 Purchase & Vendor Procurement Protocols (`/purchase`)
1. **Procurement Command Center & Telemetry**:
   - Navigate to `/purchase`.
   - **Expectation**: Top KPI cards render real-time values for **Procurement Spend**, **Open Purchase Orders**, **Pending Receipts**, and **Active Suppliers**.
2. **Vendor Directory Registration**:
   - Click "New Supplier", enter company name, representative contact name, email, phone, GSTIN, city, and state. Click "Register Supplier".
   - **Expectation**: Vendor persists in `contacts` table with `customerGroup: "vendor"`, tags `['vendor', 'supplier']`, and appears immediately under the "Suppliers & Vendors" tab.
3. **Purchase Order Creation & Sequential Numbering**:
   - Click "New Purchase Order".
   - Select the newly registered supplier, choose target warehouse, and specify expected delivery date.
   - Add line items selecting catalog products or entering custom line items with unit price, quantity, and GST tax percentage (e.g., 18%).
   - Verify live financial summary calculation (Subtotal, Estimated Tax, Grand Total). Click "Save Purchase Order".
   - **Expectation**: Order is created with sequential number `PO-YYYY-XXXX`, status `DRAFT`, itemized records in `purchase_order_items`, and appears in the "Purchase Orders" tab table.
4. **Lifecycle State Transitions**:
   - From the actions dropdown on a `DRAFT` order, click "Mark as Sent". Status badge changes to blue "Sent".
   - Click "Approve Order". Status badge changes to amber "Approved", and order appears in the "Pending Receipts" operational intake queue tab.
5. **Multi-Facility Goods Receipt Intake (`/purchase` -> `/inventory`)**:
   - In the "Pending Receipts" queue or via the order actions menu, click "Intake Goods".
   - Confirm target warehouse and enter quantity received for each line item. Click "Confirm Receipt & Update Stock".
   - **Expectation**:
     - `receivedQty` updates on line items.
     - If all items received, PO status updates to green "Received"; if partial, status shifts to sky blue "Partially Received".
     - In `warehouses`, target facility stock balances increment atomically.
     - In `products`, aggregate `stockQty` increments by received units.
     - An immutable `IN` transaction is created in `stock_movements` linked to the warehouse and item.
6. **Accounts Payable Vendor Bill Conversion (`/purchase` -> `/finance/bills`)**:
   - On an approved or received PO without an existing bill, click "Convert to Vendor Bill".
   - Select due date (defaults to Net 30) and optional custom invoice reference. Click "Create Vendor Bill".
   - **Expectation**:
     - A formal `Bill` is generated in `bills` with itemized line items mapped to `/finance/bills`.
     - `billId` is linked to `purchase_orders`.
     - The vendor's payable balance in `contacts` increments by the total bill amount.
     - A double-entry `CREDIT` ledger entry is appended to `ledger_entries` under the vendor's account.
     - The PO table displays a direct clickable link to the generated Bill.

---

### 3.10 HR & Workforce Management Protocols (`/hr`)
1. **Initial Provisioning & Auto-Seeded Departments**:
   - Navigate to `/hr`.
   - **Expectation**: If no departments exist for the tenant, the system auto-seeds 5 standard departments (*Engineering & Technology*, *Sales & Business Development*, *Finance & Accounts*, *Operations & Logistics*, *Human Resources*) with predefined designations.
   - Top KPI cards render real-time values for **Total Headcount**, **Present Today**, **Pending Leaves**, and **Departments & Teams**.
2. **Employee Registration (`EMP-XXXX`)**:
   - Click "Add Employee", fill in First Name, Last Name, Work Email, Phone, Joining Date, Department, Designation, Employment Type, and Base Salary. Click "Register Employee".
   - **Expectation**: Employee record is created with sequential employee number (e.g., `EMP-0001`), status `ACTIVE`, and appears in the "Directory" tab table.
3. **Daily Attendance Tracking**:
   - Navigate to the "Attendance" tab or click "Mark Attendance".
   - Select employee, verify target date, choose status `PRESENT`, specify Check-in time `09:00` and Check-out time `17:30`, and save.
   - **Expectation**: Attendance record persists in `attendances` table with calculated 8.5 working hours, daily summary badges update, and the "Present Today" KPI card increments.
4. **Leave Application & Management Decisions**:
   - Click "Apply Leave", choose employee, select leave type (e.g., `CASUAL`), choose start and end dates, specify reason, and submit.
   - **Expectation**: Leave request is created with status `PENDING`, duration is calculated in days, and "Pending Leaves" KPI increments.
   - Under the "Leaves" tab, click "Approve".
   - **Expectation**: Status transitions to green "Approved" badge with audit timestamp, and pending count decrements.
5. **Organizational Structuring**:
   - Navigate to the "Organization" tab.
   - Verify departmental cards show employee headcounts and assigned manager names.
   - Click "Add Department" to create custom business units, or "Add Designation" to introduce new organizational job titles.

---

### 3.11 Project Management & Delivery Protocols (`/projects`)
1. **Initial Provisioning & Auto-Seeding**:
   - Navigate to `/projects`.
   - **Expectation**: If no projects exist for the tenant, the system auto-seeds realistic starter template projects (*Enterprise ERP & Cloud Infrastructure Modernization* and *B2B Customer Self-Service Mobile Portal*) populated with deliverables, milestones, Kanban tasks, staff assignments, and billable time logs.
   - Top KPI cards render real-time values for **Active Projects**, **Task Velocity** (% completion progress bar), **Tracked Effort** (total & billable hours), and **Portfolio Budget** (in INR).
2. **Project Creation (`PRJ-XXXX`)**:
   - Click "New Project", specify Project Title, Client Account, Lead Manager (from `/hr`), Billing Type (`FIXED_FEE`, `TIME_AND_MATERIALS`, `NON_BILLABLE`), Budget, and Start/Target End dates.
   - **Expectation**: Project persists in `projects` table with sequential code `PRJ-XXXX`, status `PLANNING`, manager auto-allocated as team lead, and appears in the Projects Directory table.
3. **Agile Kanban Sprint Board**:
   - Navigate to the "Kanban Board" tab.
   - Verify tasks are sorted across 5 columns: `BACKLOG`, `TODO`, `IN_PROGRESS`, `IN_REVIEW`, and `DONE`.
   - Each card displays the task code (`TSK-XXXX`), priority badge, project code, linked milestone, assignee avatar/name, and actual vs estimated hours.
   - Use the inline stage switcher dropdown on a task to advance it from `TODO` to `IN_PROGRESS` or `DONE`.
   - **Expectation**: Status updates seamlessly in the database; completing a task automatically records `completedAt` timestamp and updates project completion percentage.
4. **Milestone Tracking & Sign-offs**:
   - Navigate to the "Milestones" tab.
   - Click "Add Milestone", assign to project, enter title, key deliverable description, target due date, and save.
   - Click "Mark Done" on an in-progress milestone.
   - **Expectation**: Milestone status toggles to `COMPLETED` with completed timestamp.
5. **Team Resource Allocation**:
   - Under the "Resource Allocation" tab, view staff members assigned to the scoped project.
   - Click "Allocate Team Member", select an active employee from `/hr`, assign their project role (e.g., "Senior Full-Stack Engineer"), set hourly billing rate, and confirm.
   - **Expectation**: Employee is linked in `project_members` and appears in the team roster.
6. **Timesheets & Effort Tracking**:
   - Under the "Time Tracking & Logs" tab or via top bar "Log Hours", click "Log Work Hours".
   - Select project, choose specific task, select employee, enter duration (e.g., `4.5`), work description, and toggle Billable.
   - **Expectation**:
     - Time entry records in `project_time_entries`.
     - `actualHours` accumulator increments automatically on the target `ProjectTask`.
     - Tracked Effort KPI card updates hours and recalculates billable ratio.

---

### 3.12 Rental Management & Asset Leasing Protocols (`/sales/rental`)
1. **Initial Provisioning & Fleet Telemetry**:
   - Navigate to `/sales/rental`.
   - **Expectation**:
     - System auto-provisions default equipment fleet (*Caterpillar 320D Hydraulic Excavator*, *Apple MacBook Pro 16" M3 Max*, *Yamaha DZR12-D Audio Rig*, *Mercedes Sprinter Van*, *Genie Scissor Lift*, *Sony FX6 Cinema Camera*) with predefined daily, weekly, monthly rates and security deposits.
     - Top KPI cards render real-time values for **Fleet Availability** (available % vs rented units), **Active Leases** (active contracts & total pipeline value in INR), **Security Deposits Held** (escrow protection), and **Damages & Penalties** (assessed fee totals).
2. **Asset Registration (`AST-XXXX`)**:
   - Click "Register Asset", enter Asset Name, Category, Serial Number, Daily/Weekly/Monthly rates, Security Deposit, Condition (`EXCELLENT`, `GOOD`, `FAIR`), Depot Warehouse, and Description. Click "Register Asset".
   - **Expectation**: Asset persists in `rental_assets` table with auto-generated code `AST-XXXX`, status `AVAILABLE`, and appears in the "Asset Fleet Directory" tab table.
3. **Rental Agreement Drafting & Asset Checkout (`RNT-YYYY-XXXX`)**:
   - Click "New Rental Agreement".
   - Select hiring customer, choose available asset, specify start date and return date (e.g. 7 days), and review estimated total rent and required security deposit.
   - Click "Activate Agreement & Check Out".
   - **Expectation**:
     - Agreement persists in `rental_agreements` with sequential code `RNT-YYYY-XXXX`, status `ACTIVE`, and linked line items in `rental_agreement_items`.
     - Target asset status transitions atomically from `AVAILABLE` to `RENTED`.
     - Active Leases KPI increments and contract value updates.
4. **Return Gear & Damage Inspection Workflow**:
   - On an active or overdue agreement row, click "Return Gear".
   - In the inspection modal, verify return date, inspect condition (e.g., `DAMAGED` or `EXCELLENT`), input inspection notes, assess optional damage fee or late fee.
   - Note the deposit refund recalculation: `Deposit - Damage Fee - Late Fee`.
   - Click "Confirm Return & Restock".
   - **Expectation**:
     - Formal inspection record commits to `rental_returns` table.
     - Agreement status updates to `RETURNED` with recorded return date and reconciled deposit status.
     - If returned in `DAMAGED` condition, asset status shifts to `MAINTENANCE`; if `EXCELLENT`/`GOOD`, asset returns to `AVAILABLE` status.
5. **Direct GST Sales Invoice Generation (`/sales/rental` -> `/sales/invoices`)**:
   - On an agreement without an existing invoice, click "Invoice".
   - **Expectation**:
     - System generates an official `Invoice` in `invoices` with sequential numbering (`INV-YYYY-XXXX`).
     - Line items map rental period days, daily rates, and any assessed damage/late fees with SAC code `9973` and GST 18%.
     - Agreement displays the linked invoice badge (e.g. `INV-2026-0004`).
     - Navigating to `/sales/invoices` confirms the newly created invoice ready for payment tracking or PDF download.

---

### 3.13 Credit Notes & Customer Refunds Protocols (`/sales/credit-notes`)
1. **Initial Provisioning & Credit Telemetry**:
   - Navigate to `/sales/credit-notes`.
   - **Expectation**:
     - If no credit notes exist for the tenant, the system auto-provisions initial demonstration credit notes (*Sales Return / Defective Unit RMA* and *Billing Rate Correction & Promotional Rebate*) with linked customer ledger entries and items.
     - 4-column KPI telemetry renders real-time counts and amounts for:
       - **Total Credit Issued**: Sum of active credits (`ISSUED`, `PARTIALLY_APPLIED`, `APPLIED`).
       - **Unallocated Credit**: Remaining balance available to apply to future invoices or cash refunds.
       - **Cash/Bank Disbursed**: Total cash/bank payouts issued against credit notes.
       - **Voided Credits**: Total count and value of cancelled credit instruments.
2. **Issuing a Credit Note (`CN-YYYY-XXXX`)**:
   - Click "Issue Credit Note".
   - Select Customer/Contact.
   - (Optional) Select a linked Sales Invoice (`INV-YYYY-XXXX`).
   - Select Credit Reason (`SALES_RETURN`, `DEFECTIVE_GOODS`, `PRICE_CORRECTION`, `GOODWILL_REBATE`, etc.).
   - Specify line items: Item description, Unit Price, Quantity, Tax Rate (e.g., 18% GST).
   - If `SALES_RETURN` or `DEFECTIVE_GOODS`, optionally check "Restock Inventory to Warehouse" and select target depot.
   - Click "Issue Credit Note".
   - **Expectation**:
     - Credit note persists in `credit_notes` table with code `CN-YYYY-XXXX`, status `ISSUED`, line items in `credit_note_items`.
     - If inventory restock checked, `warehouse_stocks` increments and a `stock_movements` record of type `RESTOCK` is created.
     - Customer ledger balance updates with a `"CREDIT_NOTE"` transaction reducing receivables.
3. **Applying Credit Note to Unpaid Sales Invoice**:
   - On a credit note with remaining balance, click "Apply to Invoice".
   - Select target invoice with pending balance.
   - Enter allocation amount (up to the lesser of the unallocated credit or invoice pending balance).
   - Click "Allocate Credit".
   - **Expectation**:
     - Credit note `remainingAmount` decrements; status updates to `PARTIALLY_APPLIED` or `APPLIED`.
     - Target invoice `paid_amount` increments; invoice status shifts to `PAID` or `PARTIAL`.
     - Record added to Applied Invoices ledger tab.
4. **Disbursing Cash or Bank Refund**:
   - On a credit note with remaining balance, click "Disburse Refund".
   - Select payment mode (`BANK_TRANSFER`, `CHEQUE`, `CASH`, `UPI`), enter reference number (e.g., UTR / Transaction ID), refund amount, and notes.
   - Click "Process Refund Payout".
   - **Expectation**:
     - `CreditNoteRefund` record persists in `credit_note_refunds`.
     - Credit note `remainingAmount` decrements.
     - Customer ledger records a `"REFUND"` debit balancing the accounts.
     - History displays under the "Cash & Bank Refunds" tab.
5. **Voiding a Credit Note**:
   - On an unapplied credit note, click "Void". Confirm the prompt.
   - **Expectation**:
     - Credit note status changes to `VOID`.
     - Reverse transaction entries are logged in the customer ledger.
     - Unallocated credit decreases and Voided Credits KPI increments.

---

### 3.14 Expense Management & General Ledger Protocols (`/finance/expenses`)
1. **Initial Provisioning & Financial Telemetry**:
   - Navigate to `/finance/expenses`.
   - **Expectation**:
     - If no expenses exist for the tenant, the system auto-provisions realistic operational business expenses (*AWS Cloud Compute & EC2 Hosting*, *Corporate Headquarters Office Rent*, *Google Ads & Marketing Campaigns*, *Client Pitch Travel & Meals*, *High-Speed Leased Line Internet*) with balanced double-entry Journal Vouchers in the General Ledger.
     - 4-column KPI telemetry renders real-time totals for:
       - **Operational Expenses**: Gross paid and approved business spending in current fiscal period.
       - **Pending Approvals**: Total value and count of unapproved employee claims.
       - **Top Expense Driver**: Dominant expenditure category with total outlay.
       - **Input Tax Credit (ITC)**: Total deductible GST claimable against output tax liabilities.
2. **Recording an Expense with Automatic General Ledger Posting**:
   - Click "Record Expense".
   - Enter Title (e.g. *Datadog Monitoring & APM Subscription*).
   - Select Category (e.g. *Software & Hosting*).
   - Select Expense Account from Chart of Accounts (e.g. `5650 — Software & Cloud Infrastructure`).
   - Select Payment Account (e.g. `1120 — Bank Account (HDFC)`).
   - Select or enter Payee/Vendor (e.g. *Datadog Inc*).
   - Enter Net Amount (e.g. ₹20,000) and GST rate 18% (Tax: ₹3,600, Total: ₹23,600).
   - Leave "Auto-Post to General Ledger" checked and submit.
   - **Expectation**:
     - Expense voucher persists with code `EXP-YYYY-XXXX`, status `PAID`.
     - Automatically creates a balanced double-entry Journal Voucher `JE-YYYY-XXXX`:
       - Debit: `5650 — Software & Cloud Infrastructure` (₹20,000).
       - Debit: `1400 — Input GST (ITC)` (₹3,600).
       - Credit: `1120 — Bank Account (HDFC)` (₹23,600).
     - $\sum \text{Debit} = \sum \text{Credit} = ₹23,600$ verified balanced.
     - Account balances in Chart of Accounts update accordingly.
3. **Double-Entry Journal Voucher Authoring**:
   - Click "New Journal Voucher" or switch to "General Ledger Vouchers" tab and click "Post Manual Voucher".
   - Specify Date, Reference, and Narration (e.g., *Annual Office Equipment Depreciation Journal*).
   - Add lines:
     - Line 1: Debit `5800 — Depreciation` for ₹15,000.
     - Line 2: Credit `1520 — Office Equipment` for ₹15,000.
   - Verify the real-time balance indicator reports "Balanced Entry".
   - Click "Post Journal Voucher".
   - **Expectation**:
     - Journal entry commits with code `JE-YYYY-XXXX` and status `POSTED`.
     - Line items appear in the General Ledger table and update respective account balances.
     - Attempting to submit unbalanced entries is rejected by both client and server guards.
4. **Account T-Ledger Statement Inspection**:
   - Switch to the "Account T-Ledger" tab.
   - Select an account from the dropdown (e.g. `1120 — Bank Account` or `5650 — Software & Cloud Infrastructure`).
   - **Expectation**:
     - Top banner displays account code, account classification (`ASSET`, `EXPENSE`, etc.), current balance, and voucher volume.
     - Chronological ledger table displays all posted vouchers impacting that account with Date, Voucher Ref, Narration, Debit, Credit, and calculated Running Balance.
5. **Employee Reimbursement Workflow**:
   - Click "Record Expense", check "This is an Employee Reimbursement Claim", select an employee from `/hr`, and submit.
   - **Expectation**:
     - Expense voucher is created with status `PENDING_APPROVAL`.
     - Pending Approvals KPI card increments count and amount.
     - Under the "Expenses Register" tab, clicking "Approve" advances status to `APPROVED`.
     - Clicking "Mark Paid" shifts status to `PAID`, marks reimbursement claim settled, and automatically posts the balanced Journal Voucher.
6. **Voiding an Expense**:
   - Click the void icon (ban button) on an active expense row. Confirm the prompt.
   - **Expectation**:
     - Expense status updates to `VOID`.
     - Linked Journal Entry status transitions to `VOID`.
     - General Ledger account balances are atomically reversed.

---

### 3.15 Price Lists & Customer Tier Pricing Protocols (`/sales/price-lists`)
1. **Initial Provisioning & Rate Card Telemetry**:
   - Navigate to `/sales/price-lists`.
   - **Expectation**:
     - System auto-seeds realistic starter rate cards (*Wholesale Partner Rate Card*, *Enterprise VIP Corporate Rate Card*, *High-Volume Distributor Rate Card*) with tiered volume breaks across catalog products (*Enterprise ERP License*, *Cloud Database Engine*, *Industrial IoT Sensor Node*).
     - 4-column KPI telemetry renders real-time values for:
       - **Active Rate Cards**: Count of active pricing policies.
       - **Product Price Rules**: Total custom price overrides with progressive volume breaks.
       - **Avg Tier Discount**: Average percentage savings configured across price lists.
       - **Assigned Accounts**: Customers mapped to specialized pricing tiers.
2. **Catalog Pricing Comparison Matrix Inspection**:
   - Click the "Item Pricing Matrix" tab.
   - **Expectation**:
     - Comprehensive grid displays all products, catalog base prices, and side-by-side columns for each active rate card (`PL-WHOLESALE`, `PL-ENTERPRISE-VIP`, `PL-DISTRIBUTOR`).
     - Each cell displays effective unit prices, discount badges (e.g. `-15%`, `-20%`), and volume tier tags.
3. **Volume Discount Tiers View**:
   - Switch to the "Volume Break Tiers" tab.
   - **Expectation**:
     - Cards display progressive volume breaks grouped by rate card (e.g. Min Order: 1 unit, 5 units, 20 units, 100 units) with lower unit prices for higher quantities.
4. **Interactive Real-Time Price Simulator**:
   - Switch to the "Interactive Price Simulator" tab.
   - Pick a customer (e.g. Enterprise or Wholesale customer).
   - Select a product (e.g. *Enterprise ERP Cloud Platform Annual License*).
   - Enter quantity (e.g. `25`).
   - Click "Resolve Price".
   - **Expectation**:
     - Simulator displays complete breakdown: Catalog Base Price, Effective Contract Unit Price, Net Line Total, Total Customer Savings (₹ and %), and confirms the matched volume break tier ($Q \ge 20$).
5. **Rate Card Authoring & Volume Break Overrides**:
   - Click "New Rate Card", enter Code (e.g. `PL-GOV`), Name (e.g. *Government & Educational Rate Card*), Scheme (`PERCENTAGE_DISCOUNT`), Default Discount (`25%`), Target Group (`ALL`), and submit.
   - **Expectation**: New rate card appears in the Directory and Matrix tables.
   - Click "Add Product Rule", select the new rate card, pick a product, specify `minQuantity = 10` and `customPrice = 75000`.
   - **Expectation**: Custom override rule commits and immediately reflects in the matrix and simulator.
6. **Customer Pricing Tier Assignment**:
   - Click "Assign Customer", select a customer contact from CRM, select an assigned rate card, and confirm.
   - **Expectation**: Customer is linked to the price list; future sales documents and simulator lookups automatically inherit the contracted rate card.

---

### 3.16 Bank Reconciliation Protocols (`/finance/bank-reconciliation`)
1. **Initial Provisioning & Account Telemetry**:
   - Navigate to `/finance/bank-reconciliation`.
   - **Expectation**:
     - If no bank accounts exist for the tenant, the system auto-provisions realistic corporate bank accounts (*HDFC Primary Corporate Current Account* linked to CoA 1120 and *ICICI Forex & Escrow Current Account*) with an active March 2026 statement batch and diverse transaction lines.
     - 4-column KPI telemetry renders real-time figures for:
       - **Statement Balance**: Closing statement balance reported by the bank feed.
       - **ERP Book Balance**: System general ledger balance from the linked Chart of Accounts node.
       - **Cleared Balance**: Total cleared deposits and debits plus opening balance.
       - **Reconciliation Variance ($\Delta$)**: Live mathematical difference between Statement Ending Balance and Cleared Balance. Displays a green "Balanced" badge when reconciled.
2. **Reconciliation Match Desk (Split-Screen Workbench)**:
   - Review the "Reconciliation Match Desk" tab.
   - **Expectation**:
     - Left pane lists all imported bank lines with Date, Transaction Type (`DEPOSIT` or `WITHDRAWAL`), Narration, Payee, Reference (UTR/Cheque/IMPS), Amount, and Status (`UNMATCHED`, `MATCHED`, `RECONCILED`).
     - Right pane lists open ERP candidate records (Inbound Customer Payments, Outbound Vendor PO Payments, Operational Expenses).
3. **Smart Rule-Based Auto-Matching Engine**:
   - Click "Run Auto-Match".
   - **Expectation**:
     - The engine scans unmatched bank transactions against open ERP payments and expenses.
     - Matches exact transaction references, invoice IDs, or identical amounts within $\pm 14$ days.
     - Successfully matched lines update to `MATCHED` with a badge (`EXACT` or `RULE`), incrementing the Cleared Balance and shrinking the variance.
4. **Manual Record Matching**:
   - On an unmatched bank line, click "Match".
   - Select an open ERP candidate payment or expense from the modal dialog.
   - Click "Link".
   - **Expectation**:
     - Bank line links to the chosen system record, shifts to `MATCHED`, and updates running reconciliation balances.
5. **Quick Expense & Instant Reconcile (Bank Charges / Interest)**:
   - On an unmatched bank withdrawal (such as quarterly bank charges or interest debit), click "Quick Expense".
   - Select Expense Category (e.g. *Bank Charges & Commission*), verify the prefilled amount, select the CoA expense account (e.g. `5700`), and click "Post & Instantly Reconcile".
   - **Expectation**:
     - An operational `Expense` voucher is created.
     - A balanced General Ledger double-entry Journal Voucher (`JE-YYYY-XXXX`) is automatically posted (debiting Bank Charges, crediting Bank Account).
     - The bank line is immediately marked `RECONCILED`.
6. **Corporate Bank Account Management**:
   - Switch to the "Bank Accounts Directory" tab.
   - Click "Add Account", enter Bank Name (e.g. *State Bank of India*), Account Number, IFSC, Account Type (`CURRENT`), opening balance, and link to Chart of Accounts.
   - Click "Create Account".
   - **Expectation**:
     - Account persists in `bank_accounts` table and displays in the directory with balance badges and routing information.
7. **Statement Batch Import**:
   - Switch to "Statement Batches & Periods" tab or click "Import Statement".
   - Provide Statement Number (e.g. `STMT-2026-04-HDFC`), date range, opening/closing balances, and paste CSV lines.
   - Click "Parse & Import Statement".
   - **Expectation**:
     - Creates `bank_statements` record and itemized `bank_transactions`.
     - Appears in the statement history table with reconciled progress bar.
8. **Finalizing & Locking Reconciliation**:
   - Once all lines are cleared and variance reaches zero ($\Delta = ₹0.00$), click "Finalize".
   - Confirm the lock prompt.
   - **Expectation**:
     - Statement status updates to `RECONCILED` with timestamp.
     - All matched lines are locked as permanently `RECONCILED`.

---

### 3.17 Recurring Invoices & Subscription Billing Protocols (`/sales/invoices/recurring`)
1. **Initial Provisioning & Subscription Telemetry**:
   - Navigate to `/sales/invoices/recurring`.
   - **Expectation**:
     - If no recurring profiles exist for the tenant, the system auto-provisions realistic client retainers (*Enterprise Cloud Managed DevOps Retainer [Monthly]*, *Annual Enterprise ERP Infrastructure License [Annually]*, *Quarterly Database Cluster Replication SLA [Quarterly]*).
     - 4-column KPI telemetry renders real-time totals for:
       - **Active Retainers**: Total count of active ongoing subscription contracts.
       - **Monthly Run Rate (MRR)**: Normalized monthly revenue pipeline across all frequencies.
       - **Next Run Scheduled**: Earliest upcoming next run date with countdown indicator ("Runs in X days").
       - **Invoices Generated**: Total lifetime sales invoices spawned from recurring schedules.
2. **Subscription Profiles Directory & Inspection**:
   - Review the "Subscription Profiles" tab.
   - Filter by status (`ACTIVE`, `PAUSED`, `COMPLETED`) or search by profile title/client.
   - **Expectation**:
     - Cards display Profile Code (`REC-YYYY-XXXX`), Cadence badge, Total recurring amount, Client company, Next run date with countdown tag, and Cycles completed progress.
3. **Instant Invoice Generation ("Run Now" Trigger)**:
   - On an active profile card, click "Run Now".
   - Review confirmation modal and confirm.
   - **Expectation**:
     - An authentic Sales Invoice (`INV-YYYY-XXXX`) is spawned in `invoices` with full line items, HSN/SAC codes, and GST taxes.
     - Profile `cyclesCompleted` increments by 1.
     - Profile `nextRunDate` automatically shifts forward by the cadence interval (e.g. +1 month for monthly, +1 year for annual).
     - Execution record is appended to `recurring_executions`.
4. **Schedule Forecast Calendar**:
   - Switch to the "Billing Forecast Schedule" tab.
   - **Expectation**:
     - Chronological list of upcoming billing events over the next 90 days.
     - Displays expected invoice amounts and direct "Run Now" actions.
5. **Generation History & Audit Log**:
   - Switch to the "Generation History & Audit Log" tab.
   - **Expectation**:
     - Itemized table of all spawned invoices with execution timestamps, billed amounts, and working "View Invoice" links navigating to the generated invoice record.
6. **Creating a New Recurring Billing Schedule**:
   - Click "New Recurring Schedule".
   - Enter Title (e.g. *Biweekly IT Support Retainer*), select Customer Contact, Frequency (`BIWEEKLY`), Start Date, Payment Terms (`NET_15`).
   - Add line items with Qty, Unit Price, GST tax rate (e.g. 18%).
   - Click "Create Schedule".
   - **Expectation**:
     - Profile persists with sequential numbering `REC-YYYY-XXXX`.
     - Displays in directory and updates MRR telemetry card.
7. **Pause / Resume & Status Management**:
   - Click "Pause" on an active profile.
   - **Expectation**:
     - Status updates to `PAUSED`, MRR recalculates, and profile is excluded from automated batch runs.
   - Click "Resume" to restore status to `ACTIVE`.



