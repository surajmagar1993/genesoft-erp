# Genesoft ERP — Test Cases

> **Last Updated:** 2026-11-18 | Run on **genesoftdev.vercel.app** (or `http://localhost:3000` with `npm run dev` in `app/`).
> Go top to bottom. Each case: **Steps → Expected**. Mark ✅ / ❌ and note the time of any failure, so it can be found in Super Admin → System Logs.

**What you need**
- A Super Admin login, and two test businesses: one **India** (e.g. Fixo) and one **Saudi Arabia** (e.g. DNENACE). Never put passwords in this file.
- A second browser or private window, for testing as a team member.
- For the API section: a terminal with `curl`. Set `B=https://genesoftdev.vercel.app` first.

**Test data rule:** start every record you create with `ZZ TEST` and delete it at the end (section 15). Never test on a real customer's business.

---

## 0. Automated tests (run before every push)

From `app/`:

| # | Command | Expected |
|---|---|---|
| 0.1 | `npx tsc --noEmit -p .` | No output (0 type errors) |
| 0.2 | `npm run lint` | 0 errors (warnings are OK) |
| 0.3 | `npm test` | All unit tests pass |
| 0.4 | `npm run test:integration` | All pass (uses a throwaway in-memory database, never the real one) |
| 0.5 | `npm run build` | Build finishes |
| 0.6 | `npm run test:e2e` | Public pages pass; signed-in pages run when `E2E_EMAIL` / `E2E_PASSWORD` are set |
| 0.7 | `npm audit --omit=dev` | 0 vulnerabilities |
| 0.8 | After pushing: GitHub → Actions | CI green; Vercel deploy **Ready** |

---

## 1. Public website (signed out)

| # | Steps | Expected |
|---|---|---|
| 1.1 | Open `/` | Home page loads with no error; logo, menu and footer appear |
| 1.2 | Open `/services`, a service page, `/services/it-rentals`, `/portfolio`, `/about`, `/careers`, `/contact`, `/erp` | Each page loads |
| 1.3 | Open `/pricing` | Redirects to the ERP pricing page; prices are in your region's currency (India ₹, Saudi SAR, UAE AED, UK £, US $, Australia A$) |
| 1.4 | Open the legal pages (terms, privacy, refund, cookie, …) from the footer | Each page loads and shows a "Last updated" date |
| 1.5 | Switch your device between light and dark mode | The site follows it; there is no theme switch on the page |
| 1.6 | Send the contact form with your own email | "Thank you" message; the lead shows in Super Admin → Website → Leads |
| 1.7 | Send the contact form with nothing filled in | It is blocked, with a clear message |
| 1.8 | Open `/this-page-does-not-exist` | "Page not found" page (HTTP 404) |
| 1.9 | Open the site on a phone (or a 390 px browser window) | Nothing runs off the screen; the menu opens and closes |

## 2. Sign-up, sign-in and account security

| # | Steps | Expected |
|---|---|---|
| 2.1 | `/register`: sign up with a new email and choose **Saudi Arabia** | No country is preselected; you are asked to confirm your email |
| 2.2 | Click the link in the confirmation email | You are signed in; a welcome email arrives from hello@ |
| 2.3 | Open the dashboard | The sidebar shows 🇸🇦 VAT • SAR (not GST / INR) |
| 2.4 | Sign up again with the same email | Message telling you to sign in instead; no crash |
| 2.5 | Sign in with a wrong password 5 times | Locked out for 15 minutes, with a clear message |
| 2.6 | "Forgot password?" | The reset email arrives; its link opens `/reset-password`; the new password works |
| 2.7 | Settings → Account → turn on two-factor, scan the QR code, sign out and back in | You are asked for the 6-digit code; no app page opens until you enter it |
| 2.8 | Stay idle longer than the session timeout set in Admin → Security (if it is on) | You are signed out |
| 2.9 | Signed out, open `/crm/companies` | You are sent to sign in |

## 3. Business setup (Settings)

| # | Steps | Expected |
|---|---|---|
| 3.1 | Settings → Company profile: fill in name, address and tax ID, then save | Saved; still there after reloading the page |
| 3.2 | Upload a logo (PNG/JPEG, 1 MB or smaller) | It appears in Settings **and at the top left of the sidebar** straight away |
| 3.3 | Upload a 2 MB file, or a file that isn't an image | Rejected, with a clear message |
| 3.4 | Remove the logo | The sidebar goes back to the Genesoft mark |
| 3.5 | Settings → Billing | Shows the plan, renewal date and past receipts; "Upgrade" opens the Razorpay checkout (**don't pay** unless you are testing payments) |
| 3.6 | Settings → Activity log | The changes you just made are listed with your name |
| 3.7 | Settings → Data & Account → Export | A ZIP downloads containing the business's data |

## 4. Team and access

| # | Steps | Expected |
|---|---|---|
| 4.1 | Settings → Team & Access → invite a member as **USER**; copy the link | A link appears (the app doesn't email it) |
| 4.2 | Open the link in a private window and create the account | The new member lands in the same business |
| 4.3 | As the admin, set the member's CRM to **VIEW** | The member sees CRM but has no "New" or "Edit" buttons; saving is refused if forced |
| 4.4 | Set CRM to **NONE** | CRM disappears from the member's menu; `/crm/companies` sends them away |
| 4.5 | The member opens Settings → Billing or Team | Not allowed (admins only) |
| 4.6 | Deactivate the member | They are signed out and can't sign back in |

## 5. CRM

| # | Steps | Expected |
|---|---|---|
| 5.1 | Companies → New: name `ZZ TEST Co`, type "Saudi" in Country **without picking from the list**, then save | Saved; the list shows it |
| 5.2 | Companies → New: pick **Saudi Arabia** from the list | Saved with country Saudi Arabia (code SA) |
| 5.3 | Open the company → **Edit** | The page opens (no crash); every field you entered is filled in |
| 5.4 | Change the city and industry → Save | "Company updated"; the changes are still there after reloading |
| 5.5 | Contacts → New → Individual and Company types, with phone and country code | Saved; an invalid phone number for that country is refused, with a message |
| 5.6 | Contact → Edit | Opens with every field filled in; Tax & Compliance shows the fields for the contact's country (India: GSTIN/PAN; Saudi: VAT/CR) |
| 5.7 | Address: type a city or state; for India, enter a 6-digit PIN code | Suggestions appear; a PIN fills in the city and state |
| 5.8 | Leads → New → Edit → change the status | Saved; the status shows in the list |
| 5.9 | Deals → New → Edit → move it to another stage | Saved; the stage updates |
| 5.10 | Tasks → add one, then mark it done | Shows as done |
| 5.11 | Contact → Customer portal → turn it on and copy the link; open it in a private window | The portal shows that customer's invoices only |
| 5.12 | Delete the `ZZ TEST` company | It is removed; a USER can't delete (MANAGER or above only) |

## 6. Sales

| # | Steps | Expected |
|---|---|---|
| 6.1 | Products → New (price, tax rate, stock item) | Saved |
| 6.2 | Quotes → New → add 2 lines and a 10% discount → Save | The total is (lines − discount) + tax; the discount comes off **before** tax |
| 6.3 | Convert the quote to an order, then the order to an invoice | Every line carries over unchanged |
| 6.4 | **India business** invoice, customer in the same state | CGST + SGST lines |
| 6.5 | **India business** invoice, customer in another state | One IGST line |
| 6.6 | **Saudi business** invoice | One VAT 15% line in SAR; the PDF has the ZATCA QR code |
| 6.7 | Invoice → Download PDF | The PDF opens with the business's logo, tax ID and correct totals |
| 6.8 | Invoice → Email | The customer gets the business's branded email (no Genesoft branding) |
| 6.9 | Record a part payment, then the rest | Status goes Partially Paid → Paid; Receivables updates |
| 6.10 | Try to pay more than is due | Refused |
| 6.11 | Credit note on a paid invoice → apply or refund | Balances update; you can't credit more than the invoice |
| 6.12 | Recurring invoice → New → Run now | An invoice is created; the next run date moves forward |
| 6.13 | Delivery challan, price list (assign one to a customer, then invoice that customer) | The price-list price is used |
| 6.14 | Rental (**Enterprise plan only**) | Shown on Enterprise; hidden in the menu on Free, Basic and Pro |
| 6.15 | Free plan: create more invoices or contacts than the plan allows | Stopped with a "plan limit" message and an upgrade prompt |

## 7. Finance

| # | Steps | Expected |
|---|---|---|
| 7.1 | After 6.x: General Ledger | Every invoice, payment and credit note has a balanced journal (debits = credits) |
| 7.2 | Reports → Trial Balance | Total debits = total credits |
| 7.3 | Reports → Profit & Loss, Balance Sheet | Figures match the invoices and expenses you entered |
| 7.4 | Tax Summary | The taxable value is **after** discounts; India splits by GST rate, Saudi shows VAT |
| 7.5 | Expenses → New → approve | Posts to the ledger |
| 7.6 | Bills → New (vendor bill) → pay | Payables goes up, then down to zero |
| 7.7 | Chart of Accounts → New account | Saved; it can be used in journals |
| 7.8 | General Ledger → "Rebuild ledger" | Finishes; the trial balance still balances |

## 8. Purchase and inventory

| # | Steps | Expected |
|---|---|---|
| 8.1 | Purchase → Vendors → New, **without a country** | The vendor's country is your business's country (not India for a Saudi business) |
| 8.2 | Purchase order → receive goods → convert to bill | Stock goes up in the warehouse; a bill is created |
| 8.3 | Inventory → Warehouses → New, **without a country** | Saved with the country empty (not "India") |
| 8.4 | Adjust stock, and transfer between two warehouses | Movements are listed; the totals are correct |
| 8.5 | Sell a stock item on an invoice | Stock goes down |
| 8.6 | Reorder alerts | An item below its reorder level is listed |

## 9. HR and projects

| # | Steps | Expected |
|---|---|---|
| 9.1 | HR → New employee | Saved; shown in the directory |
| 9.2 | Attendance for today; a leave request → approve | Saved; the leave shows as approved |
| 9.3 | Payroll run (MANAGER or above) | Payslips are created and posted to the ledger |
| 9.4 | An employee opens the Employee Portal | Sees only their own details and leave |
| 9.5 | Projects → New → tasks on the board → log time | Progress and hours update |

## 10. Country checks (repeat for each country you sell in)

| # | Steps | Expected |
|---|---|---|
| 10.1 | Sidebar header | Flag, tax name and currency of the business's country |
| 10.2 | Any new form (company, contact, vendor, warehouse) | Never preset to India for a non-Indian business |
| 10.3 | Invoice, quote, PDF | The country's tax name and currency; amounts are rounded correctly (e.g. 47.925 → 47.93) |
| 10.4 | E-way bills | Shown only for India (and only when the compliance switch is on) |
| 10.5 | Pricing page from that country | The region's currency; tax 18% GST for India only, 0% elsewhere |

## 11. Super Admin (`/admin`)

| # | Steps | Expected |
|---|---|---|
| 11.1 | Dashboard, Tenants, a tenant's page | Load; the numbers make sense |
| 11.2 | Tenant → change plan / extend trial / suspend → activate | Applied; a suspended business can't sign in |
| 11.3 | Users | Every business's users are listed; "Reset 2FA" works |
| 11.4 | Pricing & Plans → Limits & modules → switch a module off for a plan | That module disappears for businesses on that plan |
| 11.5 | Email Templates → preview | The preview shows inside a frame; the template can't run scripts |
| 11.6 | System Logs | New errors appear with the page and time; "Prune" works |
| 11.7 | Audit | Super Admin actions and "Client activity" are listed |
| 11.8 | Website → Pages → edit the draft → publish | The public page shows the change (within an hour, or straight away after publishing) |
| 11.9 | Marketing Emails → count the audience | Only users who opted in are counted |
| 11.10 | Support → reply to a ticket | The business sees the reply in its Support page |

## 12. API checks (signed out, from a terminal)

Run each command and compare the last number (the HTTP status). `-o /dev/null -w '%{http_code}\n'` prints only the status.

```bash
B=https://genesoftdev.vercel.app
s(){ curl -s -o /dev/null -w '%{http_code}\n' "$@"; }
```

| # | Command | Expected | Why |
|---|---|---|---|
| 12.1 | `s $B/api/settings/export` | **403** | Only workspace admins can export |
| 12.2 | `s $B/api/invoices/abc/pdf` | **307** | Redirects to sign-in |
| 12.3 | `s $B/api/portal/invoice/abc` | **401** | Needs a valid portal link |
| 12.4 | `s $B/api/cron/workflows` | **401** | Needs `CRON_SECRET` |
| 12.5 | `s -H "Authorization: Bearer wrong" $B/api/cron/workflows` | **401** | Wrong secret is refused |
| 12.6 | `s -X POST -d '{}' $B/api/webhooks/razorpay` | **400** | No signature → refused |
| 12.7 | `s -X POST -H "x-razorpay-signature: bad" -d '{"event":"payment.captured"}' $B/api/webhooks/razorpay` | **400** | A fake payment is refused |
| 12.8 | `curl -s -X POST $B/api/session/activity` | `{"expired":true}` | Signed out: no session to extend |
| 12.9 | `s -X POST -H 'content-type: application/json' -d '{"message":"test"}' $B/api/client-error` | **204** | Browser error report accepted (logged as WARN, never emailed) |
| 12.10 | `s -X POST $B/api/forms/abc/submit` | **404** | Web forms are switched off |
| 12.11 | `s "$B/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=x&hub.challenge=1"` | **403** | Wrong verify token |
| 12.12 | `s -X POST "$B/api/unsubscribe?token=bad"` | **400** | Unsigned unsubscribe link is refused |
| 12.13 | `s "$B/api/unsubscribe?token=bad"` | **307** | Sent to the unsubscribe page, which shows the error |
| 12.14 | `s $B/portal/badtoken` | **404** | An unknown portal link shows nothing |
| 12.15 | `curl -sI $B/ \| grep -iE "strict-transport\|x-frame\|content-security\|x-content-type\|referrer"` | All 5 headers present | Security headers |

**Signed-in API checks (in the browser, signed in as the business admin):**

| # | Steps | Expected |
|---|---|---|
| 12.16 | Open `/api/settings/export` | A ZIP downloads |
| 12.17 | Open `/api/invoices/<your invoice id>/pdf` | The PDF opens |
| 12.18 | Change the id to another business's invoice id | Not found; another business's data never shows |
| 12.19 | Signed in as a member with Finance = NONE, open an invoice PDF URL | Refused |

## 13. Security checks (safe to repeat)

| # | Steps | Expected |
|---|---|---|
| 13.1 | Type `<script>alert(1)</script>` as a company, contact and product name, then open their pages | Shown as plain text; no popup |
| 13.2 | Type `' OR 1=1 --` in any search box | Normal "no results"; no error page |
| 13.3 | Open a record, then change the id in the URL to random text | "Not found" |
| 13.4 | Open a record of business A while signed in as business B (copy the URL) | "Not found" |
| 13.5 | As a VIEWER, try every "Delete" button | Refused |
| 13.6 | Super Admin → System Logs after all tests | No new **ERROR** rows you can't explain |

## 14. Phone and tablet

| # | Steps | Expected |
|---|---|---|
| 14.1 | Open the main pages at 390 px (phone) and 768 px (tablet) | Nothing runs off the screen; tab bars scroll sideways |
| 14.2 | Open a dialog (e.g. delete a record) | It opens in the middle; Esc closes it |
| 14.3 | Switch the device between light and dark mode | The app follows it |

## 15. Clean up

| # | Steps | Expected |
|---|---|---|
| 15.1 | Delete every `ZZ TEST` record you created (invoices: void them) | Gone from the lists |
| 15.2 | Remove test team members and test logos | Done |
| 15.3 | Super Admin → System Logs | Note any errors with their time and send them for fixing |
