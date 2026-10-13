/**
 * renderInvoicePdf.tsx
 * Renders a TaxInvoice to a PDF Buffer using @react-pdf/renderer.
 * This MUST be a .tsx file so JSX is supported.
 */
import { renderToBuffer } from "@react-pdf/renderer"
import { TaxInvoice } from "./TaxInvoice"
import type { InvoiceDB } from "@/app/actions/sales/invoices"
import React from "react"
import QRCode from "qrcode"

export async function renderInvoicePdf(invoice: InvoiceDB, templateId?: string): Promise<Buffer> {
  const chosenTemplate = (templateId?.toUpperCase() || invoice.template_id || "MODERN") as any
  // KSA ZATCA phase 1: the TLV payload rendered as a QR code on the invoice
  const zatcaQrDataUrl = invoice.zatca_tlv ? await QRCode.toDataURL(invoice.zatca_tlv, { margin: 1, width: 240 }) : null
  return renderToBuffer(<TaxInvoice invoice={invoice} templateId={chosenTemplate} zatcaQrDataUrl={zatcaQrDataUrl} /> as any)
}
