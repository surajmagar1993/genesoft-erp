import {
    ChallanReason,
    ChallanStatus,
    TransportMode
} from "@prisma/client"

export interface MockChallanItem {
    productName: string
    hsnCode: string
    quantity: number
    unit: string
    unitPrice: number
    taxRate: number
    taxableAmount: number
    taxAmount: number
    totalAmount: number
}

export function calculateChallanItemTotals(item: {
    unitPrice: number
    quantity: number
    taxRate: number
}) {
    const taxableAmount = Math.round(item.unitPrice * item.quantity * 100) / 100
    const taxAmount = Math.round(taxableAmount * (item.taxRate / 100) * 100) / 100
    const totalAmount = Math.round((taxableAmount + taxAmount) * 100) / 100
    return { taxableAmount, taxAmount, totalAmount }
}

export function calculateChallanTotals(items: MockChallanItem[]) {
    return items.reduce((acc, item) => {
        acc.totalQuantity += item.quantity
        acc.taxableAmount = Math.round((acc.taxableAmount + item.taxableAmount) * 100) / 100
        acc.taxAmount = Math.round((acc.taxAmount + item.taxAmount) * 100) / 100
        acc.totalValue = Math.round((acc.totalValue + item.totalAmount) * 100) / 100
        return acc
    }, { totalQuantity: 0, taxableAmount: 0, taxAmount: 0, totalValue: 0 })
}

export function formatChallanNumber(year: number, sequence: number): string {
    return `DC-${year}-${sequence.toString().padStart(4, "0")}`
}

export function getRule55Declaration(reason: ChallanReason): { title: string; declaration: string } {
    switch (reason) {
        case "JOB_WORK":
            return {
                title: "Goods Sent for Job Work (Section 143 / Rule 55)",
                declaration: "Issued under Rule 55 of CGST Rules, 2017. Goods dispatched for job work and must be returned within 1 year (or 3 years for capital goods) under Section 143."
            }
        case "SUPPLY_ON_APPROVAL":
            return {
                title: "Goods Sent on Approval for Sale or Return",
                declaration: "Issued under Rule 55 of CGST Rules, 2017. Goods sent on approval. Subject to acceptance/return within 6 months as per Section 31(7) of the CGST Act."
            }
        case "EXHIBITION_DEMO":
            return {
                title: "Goods Dispatched for Exhibition / Demonstration",
                declaration: "Issued under Rule 55 of CGST Rules, 2017. Goods removed for display/demonstration without consideration and not by way of supply."
            }
        case "WAREHOUSE_TRANSFER":
            return {
                title: "Inter-Unit / Warehouse Stock Movement",
                declaration: "Issued under Rule 55 of CGST Rules, 2017. Transfer between distinct/related warehouse locations under single registration."
            }
        case "LINE_SALE":
            return {
                title: "Line Sale Consignment Dispatch",
                declaration: "Issued under Rule 55 of CGST Rules, 2017. Quantity/value determined at the time of delivery from the vehicle."
            }
        case "OTHERS":
        default:
            return {
                title: "Goods Transported for Non-Supply Purposes",
                declaration: "Issued under Rule 55 of CGST Rules, 2017 for transportation of goods other than by way of supply."
            }
    }
}

export function getPrintCopyDesignation(copyType: "CONSIGNEE" | "TRANSPORTER" | "CONSIGNOR"): string {
    switch (copyType) {
        case "CONSIGNEE":
            return "ORIGINAL FOR CONSIGNEE"
        case "TRANSPORTER":
            return "DUPLICATE FOR TRANSPORTER"
        case "CONSIGNOR":
            return "TRIPLICATE FOR CONSIGNOR"
    }
}

export function isValidLifecycleTransition(current: ChallanStatus, next: ChallanStatus): boolean {
    const validTransitions: Record<ChallanStatus, ChallanStatus[]> = {
        DRAFT: ["ISSUED", "CANCELLED"],
        ISSUED: ["IN_TRANSIT", "DELIVERED", "CANCELLED", "CONVERTED_TO_INVOICE"],
        IN_TRANSIT: ["DELIVERED", "RETURNED", "CANCELLED"],
        DELIVERED: ["RETURNED", "CONVERTED_TO_INVOICE"],
        RETURNED: ["CONVERTED_TO_INVOICE"],
        CANCELLED: [],
        CONVERTED_TO_INVOICE: []
    }
    return validTransitions[current]?.includes(next) ?? false
}

async function runDeliveryChallanSuite() {
    console.log("=================================================================")
    console.log("   DELIVERY CHALLAN & STATUTORY RULE 55 VERIFICATION SUITE       ")
    console.log("=================================================================")

    let totalTests = 0
    let passedTests = 0

    function assert(condition: boolean, msg: string) {
        totalTests++
        if (condition) {
            console.log(`  ✓ ${msg}`)
            passedTests++
        } else {
            console.error(`  ✗ FAIL: ${msg}`)
            throw new Error(`Test failed: ${msg}`)
        }
    }

    // ── Test 1: Numbering Convention ──────────────────────────────────
    console.log("\n[Test 1] Testing Sequential Challan Numbering...")
    {
        assert(formatChallanNumber(2026, 1) === "DC-2026-0001", "Should format sequence 1 as DC-2026-0001")
        assert(formatChallanNumber(2026, 42) === "DC-2026-0042", "Should format sequence 42 as DC-2026-0042")
        assert(formatChallanNumber(2026, 9999) === "DC-2026-9999", "Should format sequence 9999 as DC-2026-9999")
        assert(formatChallanNumber(2027, 10500) === "DC-2027-10500", "Should handle sequences exceeding 4 digits gracefully")
    }

    // ── Test 2: Item and Summary Financial Calculations ───────────────
    console.log("\n[Test 2] Testing Line-Item and Tax Calculations...")
    {
        const item1 = calculateChallanItemTotals({ unitPrice: 2500, quantity: 4, taxRate: 18 })
        assert(item1.taxableAmount === 10000, "Taxable amount: 2500 * 4 = 10000")
        assert(item1.taxAmount === 1800, "18% GST on 10000 = 1800")
        assert(item1.totalAmount === 11800, "Total amount: 10000 + 1800 = 11800")

        const item2 = calculateChallanItemTotals({ unitPrice: 150.5, quantity: 10, taxRate: 12 })
        assert(item2.taxableAmount === 1505, "Taxable amount: 150.5 * 10 = 1505")
        assert(item2.taxAmount === 180.6, "12% GST on 1505 = 180.60")
        assert(item2.totalAmount === 1685.6, "Total amount: 1505 + 180.6 = 1685.60")

        const mockItems: MockChallanItem[] = [
            { productName: "P1", hsnCode: "8471", quantity: 4, unit: "PCS", unitPrice: 2500, taxRate: 18, ...item1 },
            { productName: "P2", hsnCode: "8473", quantity: 10, unit: "PCS", unitPrice: 150.5, taxRate: 12, ...item2 }
        ]

        const totals = calculateChallanTotals(mockItems)
        assert(totals.totalQuantity === 14, "Total quantity should be 14 (4 + 10)")
        assert(totals.taxableAmount === 11505, "Total taxable amount should be 11505 (10000 + 1505)")
        assert(totals.taxAmount === 1980.6, "Total tax amount should be 1980.60 (1800 + 180.60)")
        assert(totals.totalValue === 13485.6, "Total dispatched value should be 13485.60 (11800 + 1685.60)")
    }

    // ── Test 3: Rule 55 Statutory Purposes and Declarations ───────────
    console.log("\n[Test 3] Testing Statutory Rule 55 Declarations...")
    {
        const reasons: ChallanReason[] = [
            "JOB_WORK",
            "SUPPLY_ON_APPROVAL",
            "EXHIBITION_DEMO",
            "WAREHOUSE_TRANSFER",
            "LINE_SALE",
            "OTHERS"
        ]

        for (const r of reasons) {
            const decl = getRule55Declaration(r)
            assert(decl.title.length > 0, `Purpose ${r} has a valid title`)
            assert(decl.declaration.includes("Rule 55"), `Declaration for ${r} cites Rule 55 CGST Rules`)
        }

        const jobWork = getRule55Declaration("JOB_WORK")
        assert(jobWork.declaration.includes("Section 143"), "Job work declaration explicitly cites Section 143")

        const approval = getRule55Declaration("SUPPLY_ON_APPROVAL")
        assert(approval.declaration.includes("Section 31(7)"), "Approval declaration explicitly cites Section 31(7)")
    }

    // ── Test 4: Multi-Copy Rule 55(2) Header Designations ─────────────
    console.log("\n[Test 4] Testing Multi-Copy Print Headers (Rule 55(2))...")
    {
        assert(getPrintCopyDesignation("CONSIGNEE") === "ORIGINAL FOR CONSIGNEE", "Consignee copy should be marked ORIGINAL")
        assert(getPrintCopyDesignation("TRANSPORTER") === "DUPLICATE FOR TRANSPORTER", "Transporter copy should be marked DUPLICATE")
        assert(getPrintCopyDesignation("CONSIGNOR") === "TRIPLICATE FOR CONSIGNOR", "Consignor copy should be marked TRIPLICATE")
    }

    // ── Test 5: Status Lifecycle State Machine ────────────────────────
    console.log("\n[Test 5] Testing Delivery Challan Lifecycle State Machine...")
    {
        // Valid forward paths
        assert(isValidLifecycleTransition("ISSUED", "IN_TRANSIT"), "ISSUED -> IN_TRANSIT is valid")
        assert(isValidLifecycleTransition("IN_TRANSIT", "DELIVERED"), "IN_TRANSIT -> DELIVERED is valid")
        assert(isValidLifecycleTransition("DELIVERED", "CONVERTED_TO_INVOICE"), "DELIVERED -> CONVERTED_TO_INVOICE is valid")
        assert(isValidLifecycleTransition("ISSUED", "CONVERTED_TO_INVOICE"), "Direct conversion ISSUED -> CONVERTED_TO_INVOICE is valid")
        assert(isValidLifecycleTransition("IN_TRANSIT", "RETURNED"), "Goods rejected/returned IN_TRANSIT -> RETURNED is valid")
        assert(isValidLifecycleTransition("ISSUED", "CANCELLED"), "Cancellation of ISSUED challan is valid")

        // Invalid transitions
        assert(!isValidLifecycleTransition("CANCELLED", "IN_TRANSIT"), "CANCELLED cannot transition to IN_TRANSIT")
        assert(!isValidLifecycleTransition("CONVERTED_TO_INVOICE", "IN_TRANSIT"), "CONVERTED_TO_INVOICE is terminal")
        assert(!isValidLifecycleTransition("CANCELLED", "DELIVERED"), "CANCELLED cannot transition to DELIVERED")
    }

    // ── Test 6: 1-Click Invoice Conversion Payload Mapping ───────────
    console.log("\n[Test 6] Testing 1-Click Invoice Conversion Mapping...")
    {
        const mockChallan = {
            id: "dc-uuid-101",
            challanNumber: "DC-2026-0088",
            contactId: "cust-123",
            recipientName: "Acme Industrial Tools Ltd",
            recipientEmail: "finance@acme.com",
            recipientPhone: "+91 98765 43210",
            recipientGstin: "27AAACA1234A1Z5",
            sourceWarehouseId: "wh-mumbai-1",
            salesOrderId: "so-555",
            placeOfSupply: "27-Maharashtra",
            totalValue: 59000,
            items: [
                {
                    productId: "prod-1",
                    productName: "High Torque Industrial Drill",
                    description: "Heavy duty 1200W drill machine",
                    hsnCode: "8467",
                    quantity: 5,
                    unitPrice: 10000,
                    taxRate: 18,
                    taxableAmount: 50000,
                    taxAmount: 9000,
                    totalAmount: 59000
                }
            ]
        }

        // Simulating the conversion payload constructor
        const invoicePayload = {
            contactId: mockChallan.contactId,
            customerName: mockChallan.recipientName,
            customerEmail: mockChallan.recipientEmail,
            customerGstin: mockChallan.recipientGstin,
            salesOrderId: mockChallan.salesOrderId,
            sourceWarehouseId: mockChallan.sourceWarehouseId,
            type: "TAX_INVOICE",
            subtotal: mockChallan.items.reduce((s, i) => s + i.taxableAmount, 0),
            taxTotal: mockChallan.items.reduce((s, i) => s + i.taxAmount, 0),
            total: mockChallan.totalValue,
            notes: `Generated from Delivery Challan #${mockChallan.challanNumber}`,
            items: mockChallan.items.map(it => ({
                productId: it.productId,
                productName: it.productName,
                description: it.description,
                hsnSac: it.hsnCode,
                quantity: it.quantity,
                unitPrice: it.unitPrice,
                taxPercent: it.taxRate,
                lineTotal: it.totalAmount
            }))
        }

        assert(invoicePayload.customerName === "Acme Industrial Tools Ltd", "Customer name mapped correctly")
        assert(invoicePayload.subtotal === 50000, "Invoice subtotal matches challan taxable amount")
        assert(invoicePayload.taxTotal === 9000, "Invoice tax total matches challan tax amount")
        assert(invoicePayload.total === 59000, "Invoice total matches challan total value")
        assert(invoicePayload.items.length === 1, "Invoice has mapped line items")
        assert(invoicePayload.items[0].productName === "High Torque Industrial Drill", "Item product name preserved")
        assert(invoicePayload.items[0].lineTotal === 59000, "Item total matches")
        assert(invoicePayload.notes.includes("DC-2026-0088"), "Invoice notes cite origin challan number")
    }

    console.log("\n=================================================================")
    console.log(`  DELIVERY CHALLAN SUITE PASSED: ${passedTests}/${totalTests} tests ok!`)
    console.log("=================================================================")
}

runDeliveryChallanSuite().catch((err) => {
    console.error("Test Suite Failed:", err)
    process.exit(1)
})
