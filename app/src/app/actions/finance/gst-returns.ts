"use server"

import { prisma } from "@/lib/prisma"
import { getTenantId } from "@/lib/get-tenant-id"
import { COMPANY } from "@/lib/constants/company"
import {
  buildGstr1Report,
  buildGstr3bReport,
  formatGstr1Json,
  formatGstr1B2bCsv,
  formatGstr1HsnCsv,
  formatGstr3bJson,
  getIndianGstPeriod,
  Gstr1Report,
  Gstr3bReport,
  RawInvoice,
  RawCreditNote,
  RawBill,
} from "@/lib/gst-returns-engine"

export interface GstReturnsOverviewResult {
  year: number
  month: number
  gstr1: Gstr1Report
  gstr3b: Gstr3bReport
  telemetry: {
    totalOutputTax: number
    totalEligibleItc: number
    netCashPayable: number
    invoicesCount: number
    billsCount: number
    gstr1DueInDays: number
    gstr3bDueInDays: number
    complianceStatus: "ON_TRACK" | "DUE_SOON" | "OVERDUE"
  }
}

/**
 * Calculates due date remaining days from today
 */
function getDaysRemaining(dueDateStr: string): number {
  const target = new Date(dueDateStr)
  target.setHours(23, 59, 59, 999)
  const now = new Date()
  const diffMs = target.getTime() - now.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

export async function getGstReturnsOverview(params?: {
  year?: number
  month?: number
}): Promise<GstReturnsOverviewResult> {
  const tenantId = await getTenantId()

  const now = new Date()
  const year = params?.year || now.getFullYear()
  const month = params?.month || (now.getMonth() + 1)

  // Determine Month Start and End in UTC
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0))
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))

  // Fetch Tenant Details & Settings
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      name: true,
      settings: true,
    }
  })

  const tenantSettings = (tenant?.settings as Record<string, any>) || {}
  const supplierGstin = tenantSettings.gstin || COMPANY.gstin || "27AABCG1234F1Z5"
  const supplierLegalName = tenant?.name || COMPANY.name || "Genesoft ERP Enterprises Ltd."
  const supplierState = tenantSettings.state || COMPANY.state || "Maharashtra"

  // Fetch Invoices in Period
  const invoicesDb = await prisma.invoice.findMany({
    where: {
      tenantId,
      invoiceDate: {
        gte: startDate,
        lte: endDate,
      }
    },
    include: {
      items: true,
      contact: true,
    },
    orderBy: {
      invoiceDate: "asc"
    }
  })

  const rawInvoices: RawInvoice[] = invoicesDb.map((inv: any) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    invoiceDate: inv.invoiceDate,
    type: inv.type,
    status: inv.status,
    subtotal: Number(inv.subtotal || 0),
    taxAmount: Number(inv.taxAmount || 0),
    total: Number(inv.total || 0),
    placeOfSupply: inv.placeOfSupply,
    billTo: inv.billTo,
    contact: inv.contact ? {
      id: inv.contact.id,
      displayName: inv.contact.displayName,
      companyName: inv.contact.companyName,
      gstin: inv.contact.gstin,
      email: inv.contact.email,
    } : null,
    items: (inv.items || []).map((li: any) => ({
      id: li.id,
      description: li.description,
      hsnSacCode: li.hsnSacCode,
      quantity: Number(li.quantity || 1),
      unitPrice: Number(li.unitPrice || 0),
      cgstRate: li.cgstRate ? Number(li.cgstRate) : null,
      cgstAmount: li.cgstAmount ? Number(li.cgstAmount) : null,
      sgstRate: li.sgstRate ? Number(li.sgstRate) : null,
      sgstAmount: li.sgstAmount ? Number(li.sgstAmount) : null,
      igstRate: li.igstRate ? Number(li.igstRate) : null,
      igstAmount: li.igstAmount ? Number(li.igstAmount) : null,
      discount: Number(li.discount || 0),
      lineTotal: Number(li.lineTotal || 0),
    }))
  }))

  // Fetch Credit Notes in Period
  const creditNotesDb = await prisma.creditNote.findMany({
    where: {
      tenantId,
      issueDate: {
        gte: startDate,
        lte: endDate,
      }
    },
    include: {
      contact: true,
      items: true,
    },
    orderBy: {
      issueDate: "asc"
    }
  })

  const rawCreditNotes: RawCreditNote[] = creditNotesDb.map((cn: any) => ({
    id: cn.id,
    creditNoteNumber: cn.creditNoteNumber,
    issueDate: cn.issueDate,
    invoiceId: cn.invoiceId,
    status: cn.status,
    reason: cn.reason,
    subtotal: Number(cn.subtotal || 0),
    taxAmount: Number(cn.taxAmount || 0),
    total: Number(cn.total || 0),
    contact: cn.contact ? {
      id: cn.contact.id,
      displayName: cn.contact.displayName,
      companyName: cn.contact.companyName,
      gstin: cn.contact.gstin,
    } : null,
    items: (cn.items || []).map((ci: any) => ({
      description: ci.description,
      hsnSacCode: ci.hsnSacCode,
      quantity: Number(ci.quantity || 1),
      unitPrice: Number(ci.unitPrice || 0),
      taxRate: Number(ci.taxRate || 0),
      taxAmount: Number(ci.taxAmount || 0),
      total: Number(ci.total || 0),
    }))
  }))

  // Fetch Bills (Inward purchases) in Period
  const billsDb = await prisma.bill.findMany({
    where: {
      tenantId,
      billDate: {
        gte: startDate,
        lte: endDate,
      }
    },
    include: {
      contact: true,
      items: true,
    },
    orderBy: {
      billDate: "asc"
    }
  })

  const rawBills: RawBill[] = billsDb.map((b: any) => ({
    id: b.id,
    billNumber: b.billNumber,
    billDate: b.billDate,
    status: b.status,
    subtotal: Number(b.subtotal || 0),
    taxAmount: Number(b.taxAmount || 0),
    total: Number(b.total || 0),
    notes: b.notes,
    contact: b.contact ? {
      id: b.contact.id,
      displayName: b.contact.displayName,
      companyName: b.contact.companyName,
      gstin: b.contact.gstin,
    } : null,
    items: (b.items || []).map((bi: any) => ({
      id: bi.id,
      description: bi.description,
      hsnSacCode: bi.hsnSacCode,
      quantity: Number(bi.quantity || 1),
      unitPrice: Number(bi.unitPrice || 0),
      taxPercent: Number(bi.taxPercent || 0),
      taxAmount: Number(bi.taxAmount || 0),
      lineTotal: Number(bi.lineTotal || 0),
    }))
  }))

  // Execute GSTR-1 and GSTR-3B Engines
  const gstr1 = buildGstr1Report({
    invoices: rawInvoices,
    creditNotes: rawCreditNotes,
    supplierGstin,
    supplierLegalName,
    supplierState,
    year,
    month,
  })

  const gstr3b = buildGstr3bReport({
    gstr1,
    bills: rawBills,
  })

  // Telemetry computation
  const totalOutputTax = gstr1.summary.totalTax
  const totalEligibleItc = gstr3b.table4Itc.netAvailable.iamt +
    gstr3b.table4Itc.netAvailable.camt +
    gstr3b.table4Itc.netAvailable.samt

  const netCashPayable = gstr3b.table61Payment.taxPaidInCash.totalCashPayable

  const gstr1DueInDays = getDaysRemaining(gstr1.period.gstr1DueDate)
  const gstr3bDueInDays = getDaysRemaining(gstr1.period.gstr3bDueDate)

  let complianceStatus: "ON_TRACK" | "DUE_SOON" | "OVERDUE" = "ON_TRACK"
  if (gstr1DueInDays < 0 || gstr3bDueInDays < 0) {
    complianceStatus = "OVERDUE"
  } else if (gstr1DueInDays <= 3 || gstr3bDueInDays <= 5) {
    complianceStatus = "DUE_SOON"
  }

  return {
    year,
    month,
    gstr1,
    gstr3b,
    telemetry: {
      totalOutputTax,
      totalEligibleItc,
      netCashPayable,
      invoicesCount: rawInvoices.length,
      billsCount: rawBills.length,
      gstr1DueInDays,
      gstr3bDueInDays,
      complianceStatus,
    }
  }
}

/**
 * Server action to export GSTR-1 as GSTN portal JSON.
 */
export async function exportGstr1Json(params: {
  year: number
  month: number
}): Promise<{ filename: string; json: string }> {
  const overview = await getGstReturnsOverview(params)
  const jsonPayload = formatGstr1Json(overview.gstr1)
  const period = getIndianGstPeriod(params.year, params.month)
  const filename = `GSTR1_${overview.gstr1.supplierGstin}_${period.fp}.json`

  return {
    filename,
    json: JSON.stringify(jsonPayload, null, 2),
  }
}

/**
 * Server action to export GSTR-1 tables as CSV (B2B or HSN).
 */
export async function exportGstr1Csv(params: {
  year: number
  month: number
  table: "b2b" | "hsn"
}): Promise<{ filename: string; csv: string }> {
  const overview = await getGstReturnsOverview(params)
  const period = getIndianGstPeriod(params.year, params.month)

  let csv = ""
  let filename = ""
  if (params.table === "b2b") {
    csv = formatGstr1B2bCsv(overview.gstr1)
    filename = `GSTR1_B2B_${overview.gstr1.supplierGstin}_${period.fp}.csv`
  } else {
    csv = formatGstr1HsnCsv(overview.gstr1)
    filename = `GSTR1_HSN_Table12_${overview.gstr1.supplierGstin}_${period.fp}.csv`
  }

  return { filename, csv }
}

/**
 * Server action to export GSTR-3B as official GSTN portal JSON.
 */
export async function exportGstr3bJson(params: {
  year: number
  month: number
}): Promise<{ filename: string; json: string }> {
  const overview = await getGstReturnsOverview(params)
  const jsonPayload = formatGstr3bJson(overview.gstr3b)
  const period = getIndianGstPeriod(params.year, params.month)
  const filename = `GSTR3B_${overview.gstr3b.supplierGstin}_${period.fp}.json`

  return {
    filename,
    json: JSON.stringify(jsonPayload, null, 2),
  }
}
