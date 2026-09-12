import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * Token-authenticated invoice PDF download for Customer Portal.
 * GET /api/portal/invoice/[id]?token=...
 *
 * Validates that the token belongs to a portal-enabled contact
 * who owns the requested invoice, then redirects to the PDF URL
 * or returns the invoice data as JSON (for rendering client-side).
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
    select: {
      id: true,
      invoiceNumber: true,
      pdfUrl: true,
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

  // Otherwise redirect to the internal PDF generation route
  // This generates the PDF on-the-fly using the existing invoice PDF route
  const pdfUrl = `${request.nextUrl.origin}/api/invoices/${invoice.id}/pdf`
  return NextResponse.redirect(pdfUrl)
}
