import { describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { createQuote } from "@/app/actions/sales/quotes"
import { createOrder } from "@/app/actions/sales/orders"
import { createBill } from "@/app/actions/finance/bills"
import { createTask } from "@/app/actions/crm/tasks"
import { createCommunicationLog } from "@/app/actions/crm/communications"
import { createAccount } from "@/app/actions/finance/accounts"
import { actAs, createCustomer, createTestTenant } from "./helpers"

/**
 * These create records through the Supabase client. The test database, like
 * the live one, has updated_at NOT NULL with no default and rejects unknown
 * columns, so these fail if a payload doesn't match the table.
 */
describe("records saved through the Supabase client", () => {
    it("quotes, orders, bills, tasks, communication logs and accounts can be created", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const t = tenant.id
        const customer = await createCustomer(t)
        const line = { product_name: "Work", description: "", qty: 2, unit_price: 500, tax_percent: 18 }

        const quote = await createQuote({
            quote_number: "QT-1", customer_name: "Acme", customer_email: "", quote_date: "2026-10-01", valid_until: "2026-10-31", reference: "",
            status: "DRAFT", discount: 0, discount_type: "PERCENT", notes: "", terms_and_conditions: "", contact_id: customer.id, currency_code: "INR", line_items: [line],
        } as never)
        expect(quote.error).toBeNull()
        expect(await prisma.quoteItem.count({ where: { quoteId: quote.id! } })).toBe(1)

        const order = await createOrder({
            order_number: "SO-1", customer_name: "Acme", customer_email: "", order_date: "2026-10-01", reference: "", status: "DRAFT",
            discount: 0, discount_type: "PERCENT", notes: "", terms_and_conditions: "", contact_id: customer.id, currency_code: "INR", line_items: [line],
        } as never)
        expect(order.error).toBeNull()

        const vendor = await prisma.contact.create({ data: { tenantId: t, displayName: "Supplier" } })
        const bill = await createBill({
            contactId: vendor.id, billNumber: "B-1", status: "OPEN", billDate: new Date("2026-10-02"), subtotal: 1000, taxAmount: 180, discount: 0, total: 1180, currencyCode: "INR",
            items: [{ productId: null, description: "Repair", hsnSacCode: "", quantity: 1, unitPrice: 1000, taxPercent: 18, taxAmount: 180, lineTotal: 1180 }],
        } as never)
        expect(bill?.id).toBeTruthy()
        expect(await prisma.billItem.count({ where: { billId: bill.id } })).toBe(1)
        // the bill also reaches the general ledger
        expect(await prisma.journalEntry.count({ where: { tenantId: t, sourceType: "BILL", sourceId: bill.id, status: "POSTED" } })).toBe(1)

        const task = await createTask({ title: "Call back", description: "", status: "TODO", priority: "MEDIUM", due_date: "2026-10-05", contact_id: customer.id } as never)
        expect(task.error).toBeNull()

        const log = await createCommunicationLog({ type: "NOTE", subject: "Met", content: "Discussed renewal", logged_at: new Date().toISOString(), contact_id: customer.id } as never)
        expect(log.error).toBeNull()

        const acc = await createAccount({ code: "5960", name: "Training", type: "EXPENSE", parent_id: null, is_group: false, description: "", balance: 0, currency_code: "INR", is_active: true, is_system: false } as never)
        expect(acc.error).toBeNull()
    })
})
