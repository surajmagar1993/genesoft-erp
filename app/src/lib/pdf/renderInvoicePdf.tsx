/**
 * renderInvoicePdf.tsx
 * Renders a TaxInvoice to a PDF Buffer using @react-pdf/renderer.
 * This MUST be a .tsx file so JSX is supported.
 */
import { renderToBuffer } from "@react-pdf/renderer"
import { TaxInvoice } from "./TaxInvoice"
import type { InvoiceDB } from "@/app/actions/sales/invoices"
import React from "react"

export async function renderInvoicePdf(invoice: InvoiceDB): Promise<Buffer> {
  return renderToBuffer(<TaxInvoice invoice={invoice} /> as any)
}
