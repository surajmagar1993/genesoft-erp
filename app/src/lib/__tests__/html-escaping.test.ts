import { describe, expect, it } from "vitest"
import { generateCode128Svg } from "@/lib/barcode/code128"
import { formatSaaSInvoiceReceiptHtml, type SaaSPlatformInvoice } from "@/lib/saas-subscription-engine"

const ATTACK = `<img src=x onerror="alert(1)">`

describe("user text can't become HTML", () => {
    it("barcode labels escape the product code", () => {
        const svg = generateCode128Svg(`SKU${ATTACK}`)
        expect(svg).not.toContain("<img")
        expect(svg).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;")
    })

    it("barcode colours accept only real colour values", () => {
        const svg = generateCode128Svg("SKU-1", { barColor: `red" onload="alert(1)`, backgroundColor: "#fff" })
        expect(svg).not.toContain("onload")
        expect(svg).toContain('fill="#0f172a"')
        expect(svg).toContain('fill="#fff"')
    })

    it("subscription receipts escape the business name and payment details", () => {
        const inv: SaaSPlatformInvoice = {
            invoiceNumber: "SAAS-INV-2026-0001", tenantId: "t1", tenantName: `Evil Co ${ATTACK}`, tier: "BASIC", billingCycle: "MONTHLY",
            issueDate: "2026-10-16", periodStart: "2026-10-16", periodEnd: "2026-11-16", currency: "INR", subtotal: 999, taxPercent: 18,
            taxAmount: 179.82, totalAmount: 1178.82, status: "PAID", paymentMethod: "<b>card</b>", transactionRef: `pay_"><script>x</script>`,
        }
        const html = formatSaaSInvoiceReceiptHtml(inv)
        expect(html).not.toContain(ATTACK)
        expect(html).not.toContain("<script>x")
        expect(html).not.toContain("<b>card</b>")
        expect(html).toContain("Evil Co &lt;img")
    })
})
