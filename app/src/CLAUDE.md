> **Last Updated:** 2026-10-14 | Current rules: root `CLAUDE.md` → Security Rules | Open work: `REMAINING_TASKS.md` → "Open items"

## 📦 Scope
Application source code including components, hooks, actions, and utilities.

## 🏗 Structure
- `actions/`: Server actions for CRUD (Prisma only; Supabase is used for Auth).
  - `crm/whatsapp.ts`: WhatsApp Cloud API, direct links, message/invoice dispatch.
  - `sales/pos.ts`: Retail POS terminal checkout, walk-in creation, session summary.
  - `crm/portal-actions.ts`: Customer self-service portal actions and ticket responses.
  - `inventory.ts`: Multi-warehouse stock tracking, adjustments, transfers, reorder alerts, and barcode lookup.
  - `saas/subscription.ts`: Plan upgrade/downgrade proration and platform B2B invoicing.
  - `admin/email-templates.ts`: System transactional email templates and live dispatch.
  - `finance/*.ts`: Regional tax return actions (GST, TDS, UAE VAT, KSA ZATCA, UK VAT, Australia BAS).
- `components/`: UI components using shadcn/ui.
  - `inventory/barcode-scanner-modal.tsx`: Web Audio API beep & camera/wedge scanner.
  - `inventory/barcode-generator-modal.tsx`: Code 128 / QR printable label sheet studio.
  - `notifications-dropdown.tsx`: Interactive notification UI.
  - `admin/dashboard/DashboardCharts.tsx`: Recharts visualizations.
- `lib/`: Utility functions, Prisma singleton, tax engines. The filing engines (GST returns, e-way, TDS, UAE/KSA/UK/AU returns) only prepare figures and files; they aren't connected to government systems and their screens are hidden (`NEXT_PUBLIC_ENABLE_COMPLIANCE_MODULES`).
  - `whatsapp-engine.ts`: Meta Graph API v20.0, E.164 phone normalizer, statutory templates.
  - `gst-returns-engine.ts`: India GSTR-1, GSTR-3B & 2B reconciliation.
  - `eway-bill-engine.ts`: India e-way bill drafts and bulk-upload JSON (real numbers come from the NIC portal).
  - `tds-engine.ts`: India TDS/TCS calculation engine & Form 26Q compiler.
  - `uae-vat-engine.ts`: UAE VAT 201 7-Emirates return & FAF audit file.
  - `ksa-zatca-engine.ts`: KSA ZATCA Fatoora Phase 1 & 2 XML, TLV QR & Zakat.
  - `uk-vat-engine.ts`: UK HMRC MTD VAT 9-Box return & Modulus 97 VRN.
  - `australia-tax-engine.ts`: Australia ATO BAS Form & Modulus 89 ABN.
  - `saas-subscription-engine.ts`: Real-time proration mathematics.
  - `email-template-engine.ts`: Transactional email compiler & merge tags.
  - `get-tenant-id.ts`: Multi-tenant boundary + role helpers (`getTenantId` any role, `getTenantWriterId` USER+, `getTenantManagerId` MANAGER+, `getTenantAdminId` ADMIN+, `getTenantRole`).
  - `secret-box.ts`: AES-256-GCM `sealSecret`/`openSecret`/`maskSecret` for stored tenant credentials (`ENCRYPTION_KEY`).
  - `demo-seed.ts`: `isDemoSeedEnabled()` gate for sample-data seeders (`ENABLE_DEMO_SEED`).
  - `invoice-mapper.ts`: Prisma invoice → `InvoiceDB` mapper shared by actions and the portal PDF route.
  - `smtp-guard.ts`: Rejects private/internal SMTP hosts and non-mail ports.
  - `utils.ts`: `formatCurrency(amount, code)` global formatter.
  - `prisma.ts`: Prisma client singleton with `@prisma/adapter-pg`.
  - `tenant-data.ts` / `tenant-data-plan.ts`: export a workspace as a ZIP and permanently delete a closed one, from the live catalog's tables and foreign keys.
  - `workspace-closure.ts`: closure record and 30-day grace period.
  - `marketing-email.ts` / `unsubscribe-token.ts`: opted-in marketing emails with signed unsubscribe links.

## 📐 Module Patterns (Standard)

### List Pages (Standardized)
All CRM/Sales/Inventory listing pages follow a two-tier pattern:
1. **Server Component (`page.tsx`)**: Extracts `searchParams` and calls Server Action with parameters (`export const dynamic = "force-dynamic"`).
2. **Client Component (`*Client.tsx`)**: Manages UI state, client filters, search debounce, and dialog triggers.

### Server Action Signature
Listing actions MUST support the following interface:
```typescript
async function getEntity(
  page: number = 1,
  limit: number = 20,
  filters?: { status?: EntityStatus; search?: string }
): Promise<{ data: Entity[]; total: number }>
```

### Form Placeholder Rule
> ⚠️ **NEVER** hardcode example values like `"QT-2024-001"` or `"John Doe"` in form placeholders.
> Always use instructional text: `"Enter quotation number"`, `"Contact full name"`.

### Tenant Scoping (Required)
Prisma bypasses RLS. Any query using a client-supplied id must include `tenantId`, and referenced ids must be verified against the tenant. See "Security Rules" in the root `CLAUDE.md`.

### Dynamic API Routes
All API routes that access the database MUST include:
```typescript
export const dynamic = "force-dynamic";
```
This prevents build-time `DATABASE_URL` errors during `npm run build`.

## 🔥 Next
See "Open items" in `REMAINING_TASKS.md`.
