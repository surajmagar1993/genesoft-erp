import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { mapPrismaInvoiceToDB } from "@/lib/invoice-mapper"
import { renderInvoicePdf } from "@/lib/pdf/renderInvoicePdf"

export const dynamic = "force-dynamic"

/**
 * Token-authenticated invoice PDF download for Customer Portal.
 * GET /api/portal/invoice/[id]?token=...
 *
 * Validates that the token belongs to a portal-enabled contact
 * who owns the requested invoice, then redirects to the stored PDF URL
 * or renders the PDF on the fly.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const token = request.nextUrl.searchParams.get("token")

  if (!token) {
    return NextResponse.json(
      { error: "Missing portal token" },
      { status: 401 }
    )
  }

  // Resolve contact from token
  const contact = await prisma.contact.findUnique({
    where: { portalToken: token },
    select: { id: true, portalEnabled: true, tenantId: true },
  })

  if (!contact || !contact.portalEnabled) {
    return NextResponse.json(
      { error: "Invalid or disabled portal access" },
      { status: 403 }
    )
  }

  // Fetch the invoice — verify it belongs to this contact
  const invoice = await prisma.invoice.findFirst({
    where: {
      id,
      tenantId: contact.tenantId,
      contactId: contact.id,
    },
    include: {
      items: true,
      contact: true,
      tenant: true,
    },
  })

  if (!invoice) {
    return NextResponse.json(
      { error: "Invoice not found" },
      { status: 404 }
    )
  }

  // If a PDF URL exists, redirect to it
  if (invoice.pdfUrl) {
    return NextResponse.redirect(invoice.pdfUrl)
  }

  // Otherwise render it here. /api/invoices/[id]/pdf needs a dashboard
  // session, so portal customers can't be redirected there.
  const buffer = await renderInvoicePdf(mapPrismaInvoiceToDB(invoice))
  const filename = `Invoice-${invoice.invoiceNumber}.pdf`

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.byteLength),
    },
  })
}
