import { describe, expect, it } from "vitest"
import { interpolateWhatsAppTemplate } from "@/lib/whatsapp-engine"

describe("interpolateWhatsAppTemplate", () => {
    const body = "Hello {{customer_name}}, your invoice {{invoice_number}} is ready. View and pay online: {{payment_link}}. Thank you!"

    it("fills variables", () => {
        expect(interpolateWhatsAppTemplate(body, { customer_name: "Asha", invoice_number: "INV-1", payment_link: "https://x.test/p/1" }))
            .toBe("Hello Asha, your invoice INV-1 is ready. View and pay online: https://x.test/p/1. Thank you!")
    })

    it("drops the link sentence when there is no link", () => {
        expect(interpolateWhatsAppTemplate(body, { customer_name: "Asha", invoice_number: "INV-1", payment_link: "" }))
            .toBe("Hello Asha, your invoice INV-1 is ready. Thank you!")
    })
})
