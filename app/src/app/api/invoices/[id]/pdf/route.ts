/**
 * GET /api/invoices/[id]/pdf
 * Renders the Tax Invoice to PDF and streams it as a downloadable file.
 */
import { NextResponse } from "next/server"
import { getInvoiceById } from "@/app/actions/sales/invoices"
import { renderInvoicePdf } from "@/lib/pdf/renderInvoicePdf"

export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const invoice = await getInvoiceById(id)

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
  }

  const buffer = await renderInvoicePdf(invoice)
  const filename = `Invoice-${invoice.invoice_number}.pdf`

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.byteLength),
    },
  })
}
