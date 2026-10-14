# GenesoftERP — Module-by-module bug report

**Date:** 14 October 2026 · **Code reviewed:** `main` at `e3a78f2` (includes the general-ledger and P&L work, not yet pushed) · **Environment:** production build run locally against the live Supabase database (read-only checks), plus a throwaway in-memory test database for anything that writes.

This report lists the bugs found. **Fix status** is tracked in the next section.

## Fix log
| Date | Fixed | Notes |
|---|---|---|
| 14 Oct 2026 | **C1, C2, C3, C4, C5**, **M3**, **M6**, **N1** | Leads/deals moved to Prisma (email/phone on the linked contact; search fixed); products map `unit_price` ↔ live `"unitPrice"`; rental and challan invoices built with the business's tax rules and real invoice-line fields; one invoice-number series for every flow (`src/lib/invoice-number.ts`); rental/challan/recurring invoices now reach the customer statement. Covered by `critical-fixes.int.test.ts` and `supabase-writes.int.test.ts`. |
| 14 Oct 2026 | **H1, H2, H4, H5, H6**, **H3 (POS)**, **M10**, **N2** | PO→bill records the bill properly (supplier statement, ledger, no double conversion); credit-note restock writes a valid stock movement; payroll deducts absences marked in attendance and splits leaves across months; finished work orders are final (atomic claim on completion); report builder datasets use real fields (no invented cost price or reorder level); POS sales take goods out of product and default-warehouse stock (`src/lib/stock.ts`). Covered by `high-fixes.int.test.ts`. |
| 14 Oct 2026 | **H3 (rest)**, **M5**, **M2**, **N3, N4, N5** | Invoice lines have a catalog product picker (fills name, price, HSN/SAC, tax rate) and remember the product; issued invoices take goods out of stock and editing/cancelling/deleting puts them back (`syncInvoiceStock`, matched by invoice number so POS isn't double-counted); delivery-challan and recurring invoices too. Converted leads keep the person's name (via C1). Covered by `invoice-stock.int.test.ts`. |
| 14 Oct 2026 | **M4, M7, M8, M12, M14, M15, M16**, **N6, N7** | Sales order → draft invoice (`convertOrderToInvoice`, once per order); credit limit enforced on issued invoices; account balances only change through journals; leave overlap check + no self-approval for managers; rental returns guarded and refunds validated; work orders won't complete with a raw-material shortage; portal links and public web forms are off for suspended/closed businesses. Covered by `medium-fixes.int.test.ts`. |
| 14 Oct 2026 | **M9** | No hardcoded ₹ / Indian number format in the app screens: money uses the business's currency (`useTaxRegime().formatMoney`, plain number until it loads) or the document's own currency (`localeForCurrency`); dates use the viewer's locale; discount toggles, chart and Reports page use the right symbol; the India-only e-way notice shows only for INR invoices; the always-₹0 lead "estimated value" row was removed. Remaining ₹ is legitimate (INR pricing page, platform revenue, the INR option in currency pickers). |

**N1 🔴 (found while fixing) Most records saved through the Supabase client couldn't be saved at all.** In the live database `updated_at` is NOT NULL with no default on 59 tables and there are no triggers, so every Supabase insert that didn't send `updated_at` failed: **products, quotes, sales orders, bills (and bill items, which also sent a non-existent `tenant_id` and no `id`), CRM tasks, communication-log entries, new accounts and the default chart-of-accounts seed.** Confirmed with inserts inside rolled-back transactions on the live DB (fails without `updated_at`, succeeds with it). Fixed with `stamped()` (`src/lib/db-row.ts`) on every such insert; bill items now get an id and no tenant_id.

**N3 🟠 (found while fixing) No toast message has ever been shown.** 76 screens call `toast()` for success/error messages but no `<Toaster />` was mounted, so users never saw "saved", "failed" or permission messages. Fixed in `src/app/layout.tsx`.

**N4 🟡 (found while fixing) Invoice lines lost the product name** when details were also typed (`description || product_name`). Lines now store "Product — details" and the mapper splits them back.

**N5 🟡 (found while fixing) Saving an invoice failed silently**: the new/edit invoice pages only navigated on success and showed nothing on error. They now show the error.

**N6 🔴 (found while fixing) Web forms could only be created by one business.** Form codes are unique across all businesses (they're the public link) but were numbered per business (`FORM-<year>-<count+1>`), so every business after the first collided with `FORM-2026-0001` and couldn't create a form. Codes are now random (`FORM-2026-3FA9C1D2`), which also makes public form links unguessable.

**N7 🟡 (found while fixing) Quotes and sales orders were saved in INR** whatever the business's currency (pages sent a hardcoded `"INR"`). The server now always uses the business's currency.

**N2 🟠 (found while fixing) Payroll invented a ₹35,000 salary** for any employee without one (`payroll.ts`: `emp.basicSalary ? … : 35000`). Fixed: the pay run stops and names the employees who need a salary.

---

## Summary

| Severity | Count | Meaning |
|---|---|---|
| 🔴 Critical | 5 | A core feature cannot be used at all (the action always fails). |
| 🟠 High | 6 | Wrong results or data corruption in normal use. |
| 🟡 Medium | 17 | Wrong in some cases, misleading, or a feature claimed as done that doesn't work. |
| ⚪ Low | 14 | Edge cases, rough edges, maintainability. |

### Fix these first
1. **C1** Leads can't be created or edited from the form.
2. **C2** Deals can't be created from the form.
3. **C3** Products can't be created, edited or imported.
4. **C4** Rental agreement → invoice always fails.
5. **C5** Delivery challan → invoice always fails.
6. **H1** Purchase order → bill always fails.
7. **H2** Credit notes with "restock" ticked always fail.
8. **H3** Selling never reduces stock.
9. **H4** Payroll pays absent employees in full.

### Root causes behind most of these
- **The live database has drifted from the code.** Supabase-client code sends column names that don't exist (`leads.email`, `deals.company`, `products.unit_price`, while the live column is `"unitPrice"`). The form submits, Supabase rejects it, and the user sees an error.
- **TypeScript doesn't check any database call.** `src/lib/prisma.ts:28` can return an untyped placeholder, which makes the exported `prisma` client `any` everywhere. So `tsc` passes even when code writes fields that don't exist (C4, C5, H1, H2, H6). See **M1**.
- **Features were marked ✅ in `MODULE_CHECKLIST.md` without the end-to-end flow being exercised.**

---

## How this was checked

1. **Every page loaded** on a production build: 98 fixed pages (admin pages as super admin, everything else as the Fixo test admin), 17 record detail/edit pages using real Fixo IDs, and the invoice PDF route. **No page crashed.** The 12 redirects were all expected.
2. **Automated code sweeps** over all of `src/`:
   - every status / type / payment-method value written or compared, against the enum values the database allows;
   - every Prisma write (including nested creates), against the model's real fields;
   - every Supabase `select`, filter and insert/update payload, against the **live** columns (read from the Postgres catalog, metadata only);
   - the whole Prisma schema against the live schema;
   - queries on per-business tables missing a `tenantId` filter (94 write sites triaged by hand);
   - write actions missing a role check;
   - India-only hardcoding (₹, `en-IN`, `"INR"`).
3. **Module-by-module code review** of the server actions behind each checklist item.
4. **Runtime confirmation.** Suspected missing columns were confirmed with read-only queries through the same Supabase API, signed in as the Fixo admin. Report-builder datasets were run against the throwaway test database.

---

## Findings by module

### 🤝 CRM

**✅ Fixed · C1 🔴 Leads can't be created or edited from the form**
- Where: `src/components/crm/lead-form.tsx:63` sends `email` and `phone`. `src/app/actions/crm/leads.ts:85` inserts `{ ...formData }` with Supabase.
- Problem: the live `leads` table has no `email` or `phone` columns, so every insert or update fails with a "column not found" error.
- Verified: live API, `column leads.email does not exist` / `column leads.phone does not exist`. Fixo has 0 leads.
- Fix: map the form to real columns (contact name → `contact_name`, email/phone → the linked contact), or add the columns with a migration.

**✅ Fixed · C2 🔴 Deals can't be created from the form**
- Where: `src/components/crm/deal-form.tsx:82` sends `company`, `contact_name`, `expected_close`. `src/app/actions/crm/deals.ts:87` inserts `{ ...formData }`.
- Problem: the live `deals` table has `contact_id` and `expected_close_date`, and none of those three columns.
- Verified: live API, all three columns do not exist. Fixo has 0 deals.
- Fix: pick or create a contact and send `contact_id`; rename `expected_close` to `expected_close_date`; drop `company`, or link it through the contact.

**✅ Fixed · M2 🟡 Converting a lead loses the person's name and value**
- Where: `src/app/actions/crm/leads.ts:178`.
- Problem: conversion reads the lead with Prisma, but the name lives in `leads.contact_name`, a live column missing from `schema.prisma`. The new contact is always "New Contact from Lead" with no email or phone. The deal value is always 0.

**✅ Fixed · M3 🟡 Two CRM screens always show empty lists**
- `src/app/(dashboard)/crm/page.tsx:35`: "Recent leads" selects `leads.name`, which doesn't exist, so the query errors and the list is empty.
- `src/app/actions/crm/companies.ts:234`: a company's deals are filtered by `deals.company`, which doesn't exist, so a company page never shows its deals.
- Verified: live API, both columns do not exist.

**L1 ⚪ Contact import issues**
- Where: `src/app/actions/crm/contacts.ts:361`.
- The imported `balance` goes straight into `contacts.balance`, with no customer-ledger or general-ledger entry.
- An invalid `type` value fails the whole import with a raw database message.
- Currency defaults to INR, and there's no duplicate check.

**L2 ⚪** Deleting a customer who has invoices fails with a raw foreign-key error.

**L3 ⚪** Opening `/crm/contacts/<not-a-uuid>` throws unhandled database errors in the ledger, tasks and communication-log queries. Each one now also sends an error-alert email.

### 🛒 Sales & invoicing

**✅ Fixed · C3 🔴 Products can't be created, edited or imported**
- Where: `src/app/(dashboard)/sales/products/new/page.tsx:22` and the edit page send `unit_price`. `src/app/actions/sales/products.ts:199` (import) does the same.
- Problem: the live column is `"unitPrice"` (camelCase, no `@map`), so every insert or update fails. The edit page also reads `initialProduct.unit_price` (`edit-client.tsx:26`), so prices show as 0.
- Verified: live API, `column products.unit_price does not exist`; `unitPrice` works.

**✅ Fixed · C5 🔴 Delivery challan → invoice always fails**
- Where: `src/app/actions/sales/delivery-challan.ts:497`.
- Problem: invoice lines are created with `productName`, `taxRate`, `taxAmount` and `totalAmount`, which aren't invoice-line fields, and without the required `lineTotal`. Prisma rejects the write.
- Also: the currency is hardcoded to `"INR"` (`:491`), and no CGST/SGST/IGST or VAT columns are set.
- Verified: against the Prisma schema.

**✅ Fixed · M4 🟡 Sales orders can't become invoices.** Quote → order exists (`orders.ts`), but nothing converts an order to an invoice, so the order is a dead end.

**✅ Fixed · M5 🟡 No product picker on invoices, quotes or orders.** You type product names freehand, so documents never link to products. That means:
- no stock movement (see H3);
- no product-level sales reports;
- prices and tax groups aren't pulled from the catalog;
- customer price lists are never applied.

**✅ Fixed · M6 🟡 Two invoice-number series**
- The main form uses `INV-<financial year>-NNNN` (for example `INV-2026-27-0001`).
- Rental (`rental.ts:1060`), challan (`delivery-challan.ts:473`) and recurring (`recurring-runner.ts:64`) invoices use `INV-<year>-<count+1>`.
- That's two series in one financial year, and count + 1 can repeat an existing number after a deletion, which makes the unique constraint fail.

**✅ Fixed · M7 🟡 Customer credit limits are never enforced.** The limit is stored, but invoices, orders and POS never check it. The checklist says "basic enforcement".

**L4 ⚪** Quote → order numbers the order `ORD-<timestamp>` (`orders.ts:326`) instead of the normal sequence.

**L5 ⚪** Pages for a missing record (for example `/sales/invoices/<unknown id>`) return HTTP 200 with a "not found" message instead of 404.

### 💳 Credit notes & refunds

**✅ Fixed · H2 🟠 Credit notes with "restock inventory" always fail**
- Where: `src/app/actions/sales/credit-notes.ts:616`.
- Problem: the stock movement is written with `notes` and `reference`, but the model's fields are `reason` and `referenceNo`. The whole credit-note transaction rolls back.
- Verified: against the Prisma schema.

(Fixed today in `e3a78f2`: applying a credit note always failed; credit notes raised the customer's balance instead of lowering it; voiding didn't reverse it.)

### 📦 Purchase & procurement

**✅ Fixed · H1 🟠 Purchase order → bill always fails**
- Where: `src/app/actions/purchase.ts:643`.
- Problem: inside the transaction, a ledger entry is written with type `"CREDIT"` (not an allowed value) and with `balanceAfter` and `referenceType` (fields that don't exist).
- Also: the supplier balance is increased (+), while `createBill` records bills as negative (−).
- Verified: against the Prisma schema and enum.

### 🏭 Inventory & warehouse

**✅ Fixed · H3 🟠 Selling never reduces stock**
- No sales path in the app reduces stock or writes a stock movement: invoices (lines don't even store the product), POS (only reads `stockQty`), delivery challans and rentals all leave it untouched.
- Stock only changes through manual adjustments, transfers, receiving goods and manufacturing.
- Impact: stock levels, low-stock alerts, stock valuation and the STOCK_LOW workflow are all wrong for any business that sells.

### 📊 Finance & accounting

**✅ Fixed · M8 🟡** The new-account form lets you type a `balance` straight into the account (`NewAccountForm.tsx:41`), with no journal entry. Chart of Accounts then disagrees with the ledger reports. Opening balances belong in General Ledger → Opening Balances.

**L6 ⚪ Bank reconciliation auto-match** (`bank-reconciliation.ts:843`)
- It considers payments from **all** bank accounts, not just the statement's account.
- The "same amount within 14 days" rule can pair the wrong transactions when amounts repeat.

**L7 ⚪** Budget "actuals" come from Expenses only (`budgets.ts:152`). Bills and payroll aren't counted, so variance looks better than it is.

(Fixed today: the P&L ignored expenses, payroll and credit notes; the customer ledger assumed INR; there was no double-entry general ledger.)

### 🌍 Tax & multi-country

**✅ Fixed · C4 🔴 Rental agreement → invoice always fails**
- Where: `src/app/actions/rental.ts:1116`.
- Problem: invoice lines use `tenantId`, `taxRate`, `taxAmount` and `total`, which aren't invoice-line fields, and leave out the required `lineTotal`.
- Also: tax is hardcoded at **18% GST for every country** (`:1084`), and currency falls back to INR.
- Verified: against the Prisma schema.

**✅ Fixed · M9 🟡 Rupee symbol and Indian number format shown to every business.** Hardcoded ₹ and `en-IN` appear in:
- `rental-client.tsx` (27 ₹ / 16 `en-IN`)
- `credit-notes-client.tsx` (21 / 17)
- `expenses-client.tsx` (16 / 4)
- `hr/portal-client.tsx` (14 / 15)
- payroll, projects, batch/serial, price-list messages, WhatsApp templates
- the contact, deal, quote, order and invoice forms, and the admin dashboard

There are also 104 `|| "INR"`-style fallbacks. A UAE or UK business sees ₹ in these screens.

### 👥 HR, payroll & recruitment

**✅ Fixed · H4 🟠 Absent employees are paid in full**
- Where: `src/app/actions/payroll.ts:468`.
- Problem: `generatePayRun` calculates days present from attendance and then never uses the figure. Only approved **unpaid leave** reduces pay.

**✅ Fixed · M10 🟡 Leave crossing month-end is deducted twice.** A leave overlapping two months counts its full length in **both** months (`payroll.ts:472`).

**M11 🟡 PF and employer costs** (`payroll.ts:497`)
- PF is 12% of the full basic salary with no ₹15,000 wage ceiling.
- The ₹21,000 ESI threshold is hardcoded.
- Employer PF/ESI isn't calculated or stored, so company payroll cost is understated, both in reports and in the ledger.

**✅ Fixed (overlap, self-approval; weekends still count — depends on each business's working week) · M12 🟡 Leave requests** (`hr.ts:644`, `hr.ts:687`)
- No overlap check, so the same dates can be requested twice.
- No leave balance or entitlement.
- Weekends and holidays count as leave days.
- A manager can approve their own leave.

**L8 ⚪** No pay proration for employees who join or leave mid-month.

**L9 ⚪** Attendance times are built as `new Date("<date>T<time>")` on the server, which runs in UTC on Vercel (`hr.ts:594`). An IST 09:30 check-in is stored as 09:30 UTC (15:00 IST). Check how the UI shows it.

**L10 ⚪** Hiring numbers employees `EMP-<year>-<count+1>` (`recruitment.ts:558`); see L13.

### 📁 Projects

**M13 🟡 "Project billing" doesn't exist.** The checklist marks it done, but billable hours and milestones are only tracked; nothing turns them into an invoice.

### 🏠 Rentals

(**C4** above.)

**✅ Fixed · M14 🟡 Rental returns** (`rental.ts:934`)
- `processRentalReturn` has no "already returned" check, so it can run twice.
- The refunded deposit isn't validated, so it can be negative or more than the deposit.
- Deposits never reach the ledger.

**L11 ⚪** Opening the Rentals page (a read) also writes "overdue" status updates (`rental.ts:464`), even for read-only users.

### 🔧 Manufacturing

**✅ Fixed · H5 🟠 Completing a work order twice moves stock twice**
- Where: `src/app/actions/manufacturing.ts:506`.
- Problem: there's no status check. Marking a work order Completed again (a double-click, or Completed → anything → Completed) consumes the raw materials and adds the finished goods a second time. Any status can change to any other.

**✅ Fixed (shortage check; the "scrap counted twice" point was wrong — rejected units and material wastage % are different) · M15 🟡 Consumption maths**
- Raw-material stock can go negative; there's no shortage check at completion.
- Scrap is counted twice (actual scrap units **and** the scrap allowance %).

### 📈 Reports & analytics

**✅ Fixed · H6 🟠 Three of the six Custom Report Builder datasets crash every time**
- **Inventory** (`builder.ts:99`): uses `include: { category }`, but `Product.category` is plain text. It also reads `p.stock` (the field is `stockQty`), **invents** a cost price as 70% of the selling price, and assumes a reorder level of 10.
- **Bills** (`builder.ts:126`): orders by `issueDate`, which bills don't have.
- **Expenses** (`builder.ts:146`): uses `date`, which expenses don't have.
- Verified: all six datasets were run against the test database; these three failed.

### 🌐 Customer portal & web forms

**✅ Fixed · M16 🟡 The portal ignores suspended or closed businesses** (`portal.ts:38`). Customers of a suspended or closed workspace can still open its invoices, statements and tickets, including during the 30-day closure period. Portal links never expire.

### ⚙️ Platform & code quality

**M1 🟡 Database calls aren't type-checked.** `src/lib/prisma.ts:28` returns `PrismaClient` or an untyped placeholder, so `prisma` is effectively `any` throughout the app. That's why `tsc` passed while C4, C5, H1, H2 and H6 were writing fields that don't exist. Making the client typed would surface these at build time.

**M17 🟡 Schema drift.** The live database has two columns Prisma doesn't know about (`tenants.gstin`, `leads.contact_name`). Separately, Supabase-client code uses names that match neither (C1–C3, M3). Pick one data-access path per table, ideally Prisma, and keep `schema.prisma` matching the live database.

**L12 ⚪ Read-only check.** Every write action has a role check, except the ones that are public by design (web form submit, contact form, unsubscribe).

**L13 ⚪ Fragile numbering.** 28 places number documents as `count + 1` (`EMP-`, `JE-`, expenses, some invoices). Deleted records or two saves at the same moment produce duplicates, which fail the unique constraint.

**L14 ⚪** Opening `/sales/invoices/recurring/edit` is treated as editing an invoice whose ID is "recurring" (renders "not found" with 200).

---

## Checked and found OK

- **No crashes:** all 98 fixed pages, 17 detail/edit pages and the invoice PDF load. Login protection, redirects and the hidden compliance pages all behave correctly.
- **Tenant isolation:** 94 write sites that lacked a `tenantId` filter were triaged. Every one is preceded by a business-scoped lookup, so **no new cross-tenant leak** was found. (Today's commit also fixed `deleteInvoice` deleting another business's line items.)
- **Role checks:** every write action uses the right helper (writer, manager, admin or super admin), or is public by design.
- **Prisma vs live database:** every Prisma model, column and model reference exists in the live database.
- **Payments, invoices, sign-up, plan checkout, workspace export/close/purge, the general ledger, the P&L, marketing emails and error monitoring** are covered by passing integration tests.
- **Deals stage changes, bank-reconciliation de-duplication and invoice payment status** looked correct.

## Not covered in depth (worth a later pass)

- WhatsApp, email (SMTP/IMAP), the workflow builder UI, performance reviews, training, barcode/QR and the notification screens: pages load, but the actions weren't exercised.
- The hidden government-filing modules (GST returns, TDS, e-way, VAT 201, ZATCA, MTD, BAS, US 1099): they're turned off and not connected to any authority.
- Browser behaviour (layout, JavaScript errors in the browser); this review was server-side.

## Reproducing

- **Missing columns:** sign in with the Supabase client as a business user and run `supabase.from("leads").select("email")`. It errors with "column does not exist" and changes nothing.
- **Report builder:** call `runCustomReportQuery({ dataset: "INVENTORY" | "BILLS" | "EXPENSES", selectedFields: [...], filters: [] })` in the integration test harness (`npm run test:integration`).
- **Invalid writes (C4, C5, H1, H2):** compare the object passed to Prisma with the model in `prisma/schema.prisma`, or call the action in the integration harness.
