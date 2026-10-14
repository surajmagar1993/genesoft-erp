import { describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { createInvoice, deleteInvoice, updateInvoice, type CreateInvoicePayload } from "@/app/actions/sales/invoices"
import { createPayment } from "@/app/actions/finance/payments"
import { applyCreditToInvoice, createCreditNote, recordCreditNoteRefund } from "@/app/actions/sales/credit-notes"
import { getPnlReport } from "@/app/actions/finance/reports"
import { rebuildLedger, syncLedger } from "@/lib/ledger"
import { accountLedger, balanceSheet, getOpeningBalances, saveOpeningBalances, trialBalance } from "@/lib/accounting-reports"
import { actAs, createCustomer, createTestTenant } from "./helpers"

const line = { description: "", hsn_sac: "", cgst_percent: 0, sgst_percent: 0, igst_percent: 0, cgst_amount: 0, sgst_amount: 0, igst_amount: 0 }

function invoicePayload(contactId: string, over: Partial<CreateInvoicePayload> = {}): CreateInvoicePayload {
    return {
        invoice_number: `INV-${Math.random().toString(36).slice(2, 8)}`, customer_name: "Buyer", customer_email: "", invoice_date: "2026-09-05", valid_until: "",
        reference: "", status: "SENT", discount: 0, discount_type: "PERCENT", notes: "", terms_and_conditions: "", supplier_gstin: "", customer_gstin: "",
        supplier_state: "", place_of_supply: "Maharashtra", supply_type: "intra", contact_id: contactId,
        line_items: [{ ...line, product_name: "Work", qty: 1, unit_price: 10000, tax_percent: 18 }],
        ...over,
    }
}

/** Balance of the account with this code, from posted journals. */
async function bal(tenantId: string, code: string, asOf = "2026-12-31") {
    const tb = await trialBalance(tenantId, asOf)
    const r = tb.rows.find((x) => x.code === code)
    if (!r) return 0
    const type = r.type
    return type === "ASSET" || type === "EXPENSE" ? r.debit - r.credit : r.credit - r.debit
}

const posted = (tenantId: string) => prisma.journalEntry.count({ where: { tenantId, status: "POSTED" } })

describe("general ledger (India)", () => {
    it("posts sales, payments, purchases, credit notes, refunds and payroll as balanced double entry", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const t = tenant.id
        const customer = await createCustomer(t)

        // Sale 10,000 + 18% GST (CGST 900 + SGST 900)
        const inv = await createInvoice(invoicePayload(customer.id))
        expect(await bal(t, "1200")).toBe(11800)
        expect(await bal(t, "4100")).toBe(10000)
        expect(await bal(t, "2210")).toBe(900)
        expect(await bal(t, "2220")).toBe(900)

        // Customer pays 5,000 by bank, 1,000 in cash
        await createPayment({ invoice_id: inv.id, contact_id: customer.id, amount: 5000, payment_date: "2026-09-10", payment_method: "BANK_TRANSFER" })
        await createPayment({ invoice_id: inv.id, contact_id: customer.id, amount: 1000, payment_date: "2026-09-11", payment_method: "CASH" })
        expect(await bal(t, "1120")).toBe(5000)
        expect(await bal(t, "1110")).toBe(1000)
        expect(await bal(t, "1200")).toBe(5800)

        // Credit note 1,000 + 18% = 1,180, half applied to the invoice, half refunded
        const cn = await createCreditNote({ contactId: customer.id, invoiceId: inv.id!, issueDate: "2026-09-15", reason: "GOODS_RETURN" as never, items: [{ description: "Return", quantity: 1, unitPrice: 1000, taxRate: 18 }] })
        expect(await bal(t, "4150")).toBe(-1000) // contra revenue (debit balance)
        expect(await bal(t, "1200")).toBe(4620)
        await applyCreditToInvoice({ creditNoteId: cn.id, invoiceId: inv.id!, amount: 590 })
        expect(await bal(t, "1200")).toBe(4620) // applying credit moves no money
        await recordCreditNoteRefund({ creditNoteId: cn.id, amount: 590, refundDate: "2026-09-16", paymentMethod: "BANK_TRANSFER" } as never)
        expect(await bal(t, "1120")).toBe(4410)
        expect(await bal(t, "1200")).toBe(5210)

        // Supplier bill: stock 3,000 + service 1,000, 18% tax, then paid
        const vendor = await prisma.contact.create({ data: { tenantId: t, displayName: "Supplier" } })
        const stock = await prisma.product.create({ data: { tenantId: t, name: "Widget", type: "PRODUCT" } as never })
        const bill = await prisma.bill.create({
            data: {
                tenantId: t, contactId: vendor.id, billNumber: "B-1", status: "OPEN", billDate: new Date("2026-09-12T10:00:00Z"), subtotal: 4000, taxAmount: 720, total: 4720, currencyCode: "INR",
                items: { create: [
                    { description: "Widgets", productId: stock.id, quantity: 3, unitPrice: 1000, taxPercent: 18, taxAmount: 540, lineTotal: 3540 },
                    { description: "Repair", quantity: 1, unitPrice: 1000, taxPercent: 18, taxAmount: 180, lineTotal: 1180 },
                ] },
            } as never,
        })
        await syncLedger(t, { kind: "bill", id: bill.id })
        expect(await bal(t, "5100")).toBe(3000)
        expect(await bal(t, "5150")).toBe(1000)
        expect(await bal(t, "2100")).toBe(4720)
        await createPayment({ bill_id: bill.id, contact_id: vendor.id, amount: 4720, payment_date: "2026-09-20", payment_method: "BANK_TRANSFER", type: "OUTBOUND" })
        expect(await bal(t, "2100")).toBe(0)
        expect(await bal(t, "1120")).toBe(4410 - 4720)

        // Payroll: gross 20,000, unpaid leave 1,000, PF/PT withheld 2,000 → net 17,000; then paid
        const run = await prisma.payrollRun.create({ data: { tenantId: t, runNumber: "PR-1", periodYear: 2026, periodMonth: 9, payDate: new Date("2026-09-30T10:00:00Z"), status: "APPROVED", totalGross: 20000, totalDeductions: 3000, totalNetPay: 17000 } as never })
        await syncLedger(t, { kind: "payrollRun", id: run.id })
        expect(await bal(t, "5200")).toBe(20000)
        expect(await bal(t, "2400")).toBe(17000)
        expect(await bal(t, "2410")).toBe(3000)
        await prisma.payrollRun.update({ where: { id: run.id }, data: { status: "PAID", paidAt: new Date("2026-10-01T10:00:00Z") } })
        await syncLedger(t, { kind: "payrollRun", id: run.id })
        expect(await bal(t, "2400")).toBe(0)

        // The books balance, and agree with the document-based P&L for the period
        const tb = await trialBalance(t, "2026-12-31")
        expect(tb.balanced).toBe(true)
        const bs = await balanceSheet(t, "2026-12-31")
        expect(bs.balanced).toBe(true)
        const pnl = await getPnlReport("2026-09-01", "2026-09-30")
        expect(bs.currentYearProfit).toBe(pnl.netProfit)
        expect(pnl.netProfit).toBe(10000 - 1000 - 3000 - 1000 - 20000)

        // Account ledger: running balance on Accounts Receivable
        const ar = (await prisma.account.findFirstOrThrow({ where: { tenantId: t, code: "1200" } })).id
        const led = await accountLedger(t, ar, "2026-09-01", "2026-09-30")
        expect(led.openingBalance).toBe(0)
        expect(led.closingBalance).toBe(5210)
        expect(led.lines[0]).toMatchObject({ debit: 11800, balance: 11800 })

        // Rebuild changes nothing; editing re-posts; deleting voids (with its payments)
        const before = await posted(t)
        const rebuilt = await rebuildLedger(t)
        expect(rebuilt.failed).toEqual([])
        expect(await posted(t)).toBe(before)

        const inv2 = await createInvoice(invoicePayload(customer.id, { invoice_number: "INV-EDIT" }))
        await updateInvoice({ ...invoicePayload(customer.id, { invoice_number: "INV-EDIT" }), id: inv2.id!, line_items: [{ ...line, product_name: "Work", qty: 2, unit_price: 10000, tax_percent: 18 }] } as never)
        const journals = await prisma.journalEntry.findMany({ where: { tenantId: t, sourceType: "INVOICE", sourceId: inv2.id! }, orderBy: { createdAt: "asc" } })
        expect(journals.map((j: { status: string; totalDebit: unknown }) => [j.status, Number(j.totalDebit)])).toEqual([["VOID", 11800], ["POSTED", 23600]])

        await createPayment({ invoice_id: inv2.id, contact_id: customer.id, amount: 100, payment_date: "2026-09-25", payment_method: "UPI" })
        expect((await deleteInvoice(inv2.id!)).error).toBeNull()
        expect(await prisma.journalEntry.count({ where: { tenantId: t, status: "POSTED", sourceId: inv2.id! } })).toBe(0)
        expect((await trialBalance(t, "2026-12-31")).balanced).toBe(true)
        expect(await bal(t, "1200")).toBe(5210)
    })
})

describe("general ledger (other countries, opening balances)", () => {
    it("UAE posts one VAT account in AED", async () => {
        const { tenant, user } = await createTestTenant({ country: "AE", currency: "AED" })
        actAs(user)
        const customer = await createCustomer(tenant.id)
        await createInvoice(invoicePayload(customer.id, { place_of_supply: "", supply_type: "single", line_items: [{ ...line, product_name: "Work", qty: 1, unit_price: 1000, tax_percent: 5 }] }))
        const vat = await prisma.account.findMany({ where: { tenantId: tenant.id, type: "LIABILITY" }, select: { code: true, name: true, balance: true } })
        const vatAccount = vat.find((a: { name: string }) => /VAT/.test(a.name))
        expect(vatAccount).toBeTruthy()
        expect(Number(vatAccount!.balance)).toBe(50)
        expect(await prisma.account.count({ where: { tenantId: tenant.id, code: { in: ["2210", "2220", "2230"] } } })).toBe(0)
        expect((await trialBalance(tenant.id, "2026-12-31")).balanced).toBe(true)
    })

    it("opening balances balance against Opening Balance Equity and can be edited", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const t = tenant.id
        const mk = (code: string, name: string, type: string) => prisma.account.create({ data: { tenantId: t, code, name, type: type as never } })
        const bank = await mk("1120", "Bank Account", "ASSET")
        const loan = await mk("2500", "Loan", "LIABILITY")

        await saveOpeningBalances(t, { date: "2026-04-01", lines: [{ accountId: bank.id, debit: 50000, credit: 0 }, { accountId: loan.id, debit: 0, credit: 20000 }] })
        expect(await bal(t, "1120")).toBe(50000)
        expect(await bal(t, "3900")).toBe(30000)
        const bs = await balanceSheet(t, "2026-04-30")
        expect(bs.balanced).toBe(true)
        expect(bs.totalAssets).toBe(50000)

        const saved = await getOpeningBalances(t)
        expect(saved.lines).toHaveLength(2) // the equity line is worked out, not shown
        await saveOpeningBalances(t, { date: "2026-04-01", lines: [{ accountId: bank.id, debit: 60000, credit: 0 }] })
        expect(await bal(t, "1120")).toBe(60000)
        expect(await bal(t, "2500")).toBe(0)
        expect(await prisma.journalEntry.count({ where: { tenantId: t, sourceType: "OPENING_BALANCE", status: "POSTED" } })).toBe(1)
    })
})
