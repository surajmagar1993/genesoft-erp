import { describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { sendInvoiceViaWhatsApp } from "@/app/actions/crm/whatsapp"
import { actAs, createCustomer, createTestTenant } from "./helpers"

describe("bugs found by type-checking database calls", () => {
    it("sending an invoice on WhatsApp reads the invoice (no database error)", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const customer = await prisma.contact.update({ where: { id: (await createCustomer(tenant.id)).id }, data: { phone: "+919000000001" } })
        const inv = await prisma.invoice.create({ data: { tenantId: tenant.id, contactId: customer.id, invoiceNumber: "WA-1", status: "SENT", billTo: { name: "Acme" }, subtotal: 100, taxAmount: 18, total: 118 } as never })
        const res = await sendInvoiceViaWhatsApp({ invoiceId: inv.id })
        // Without a WhatsApp setup it may refuse, but never with a Prisma "Unknown argument" error
        expect(String((res as { error?: string }).error ?? "")).not.toMatch(/Unknown argument|Invalid `prisma/)
    })
})
