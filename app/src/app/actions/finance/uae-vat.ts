"use server"

import { prisma } from "@/lib/prisma"
import { getTenantId } from "@/lib/get-tenant-id"
import { COMPANY } from "@/lib/constants/company"
import {
  compileFormVat201,
  formatUaeVat201Json,
  formatUaeVat201Csv,
  getUaeVatPeriod,
  FormVat201Report,
  RawUaeInvoice,
  RawUaeBill,
} from "@/lib/uae-vat-engine"

export interface UaeVatOverviewResult {
  year: number
  quarter: "Q1" | "Q2" | "Q3" | "Q4"
  report: FormVat201Report
  telemetry: {
    totalOutputTax: number
    totalRecoverableTax: number
    netVatPayable: number
    isPayable: boolean
    invoicesCount: number
    billsCount: number
    rcmCount: number
    exportCount: number
    trnComplianceRate: number
    daysRemaining: number
    status: "ON_TRACK" | "DUE_SOON" | "OVERDUE"
  }
}

function getDaysUntil(dueDateStr: string): number {
  const target = new Date(dueDateStr)
  target.setHours(23, 59, 59, 999)
  const now = new Date()
  const diff = target.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export async function getUaeVatOverview(params?: {
  year?: number
  quarter?: "Q1" | "Q2" | "Q3" | "Q4"
}): Promise<UaeVatOverviewResult> {
  const tenantId = await getTenantId()

  const now = new Date()
  const year = params?.year || now.getFullYear()

  // Default quarter based on current month
  let defaultQuarter: "Q1" | "Q2" | "Q3" | "Q4" = "Q3"
  const m = now.getMonth() + 1
  if (m <= 3) defaultQuarter = "Q1"
  else if (m <= 6) defaultQuarter = "Q2"
  else if (m <= 9) defaultQuarter = "Q3"
  else defaultQuarter = "Q4"

  const quarter = params?.quarter || defaultQuarter
  const period = getUaeVatPeriod(year, quarter)

  const startDate = new Date(`${period.startDate}T00:00:00.000Z`)
  const endDate = new Date(`${period.endDate}T23:59:59.999Z`)

  // Fetch Tenant Settings
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      name: true,
      settings: true,
    }
  })

  const tenantSettings = (tenant?.settings as Record<string, any>) || {}
  const taxpayerTrn = tenantSettings.trn || tenantSettings.vat_trn || "100234567890003"
  const taxpayerLegalName = tenant?.name || COMPANY.name || "Genesoft Technologies FZ-LLC"
  const taxpayerAddress = tenantSettings.address || "Dubai Internet City, Dubai, UAE"

  // Fetch Outward Invoices in Period
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

  const rawInvoices: RawUaeInvoice[] = invoicesDb.map((inv: any) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    invoiceDate: inv.invoiceDate,
    type: inv.type,
    status: inv.status,
    subtotal: Number(inv.subtotal || 0),
    taxAmount: Number(inv.taxAmount || 0),
    total: Number(inv.total || 0),
    currencyCode: inv.currencyCode,
    placeOfSupply: inv.placeOfSupply,
    billTo: inv.billTo,
    contact: inv.contact ? {
      id: inv.contact.id,
      displayName: inv.contact.displayName,
      companyName: inv.contact.companyName,
      trn: inv.contact.trn,
      email: inv.contact.email,
    } : null,
    items: (inv.items || []).map((li: any) => ({
      id: li.id,
      description: li.description,
      quantity: Number(li.quantity || 1),
      unitPrice: Number(li.unitPrice || 0),
      vatRate: li.vatRate ? Number(li.vatRate) : (li.cgstRate ? 5 : null),
      vatAmount: li.vatAmount ? Number(li.vatAmount) : (li.cgstAmount ? Number(li.cgstAmount) + Number(li.sgstAmount || 0) : null),
      discount: Number(li.discount || 0),
      lineTotal: Number(li.lineTotal || 0),
    }))
  }))

  // Fetch Inward Bills in Period
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

  const rawBills: RawUaeBill[] = billsDb.map((b: any) => ({
    id: b.id,
    billNumber: b.billNumber,
    billDate: b.billDate,
    status: b.status,
    subtotal: Number(b.subtotal || 0),
    taxAmount: Number(b.taxAmount || 0),
    total: Number(b.total || 0),
    currencyCode: b.currencyCode,
    notes: b.notes,
    contact: b.contact ? {
      id: b.contact.id,
      displayName: b.contact.displayName,
      companyName: b.contact.companyName,
      trn: b.contact.trn,
    } : null,
    items: (b.items || []).map((bi: any) => ({
      id: bi.id,
      description: bi.description,
      quantity: Number(bi.quantity || 1),
      unitPrice: Number(bi.unitPrice || 0),
      taxPercent: Number(bi.taxPercent || 0),
      taxAmount: Number(bi.taxAmount || 0),
      lineTotal: Number(bi.lineTotal || 0),
    }))
  }))

  // Compile Form VAT201
  const report = compileFormVat201({
    invoices: rawInvoices,
    bills: rawBills,
    taxpayerTrn,
    taxpayerLegalName,
    taxpayerAddress,
    year,
    quarter,
  })

  const daysRemaining = getDaysUntil(period.dueDate)
  let status: "ON_TRACK" | "DUE_SOON" | "OVERDUE" = "ON_TRACK"
  if (daysRemaining < 0) status = "OVERDUE"
  else if (daysRemaining <= 7) status = "DUE_SOON"

  const totalContacts = report.summary.b2bTrnCount + report.summary.b2cCount
  const trnComplianceRate = totalContacts > 0 ? Math.round((report.summary.b2bTrnCount / totalContacts) * 100) : 100

  return {
    year,
    quarter,
    report,
    telemetry: {
      totalOutputTax: report.box6TotalOutputTaxDue,
      totalRecoverableTax: report.box12TotalRecoverableTax,
      netVatPayable: Math.abs(report.box13NetVatPayable),
      isPayable: report.box13NetVatPayable >= 0,
      invoicesCount: report.summary.invoicesCount,
      billsCount: report.summary.billsCount,
      rcmCount: report.summary.rcmCount,
      exportCount: report.summary.exportCount,
      trnComplianceRate,
      daysRemaining,
      status,
    }
  }
}

/**
 * Server action to export Form VAT201 as official FTA JSON.
 */
export async function exportUaeVat201Json(params: {
  year: number
  quarter: "Q1" | "Q2" | "Q3" | "Q4"
}): Promise<{ filename: string; json: string }> {
  const overview = await getUaeVatOverview(params)
  const jsonPayload = formatUaeVat201Json(overview.report)
  const filename = `FTA_VAT201_${overview.report.taxpayerTrn}_${params.year}_${params.quarter}.json`

  return {
    filename,
    json: JSON.stringify(jsonPayload, null, 2),
  }
}

/**
 * Server action to export Form VAT201 as CSV.
 */
export async function exportUaeVat201Csv(params: {
  year: number
  quarter: "Q1" | "Q2" | "Q3" | "Q4"
}): Promise<{ filename: string; csv: string }> {
  const overview = await getUaeVatOverview(params)
  const csv = formatUaeVat201Csv(overview.report)
  const filename = `FTA_VAT201_${overview.report.taxpayerTrn}_${params.year}_${params.quarter}.csv`

  return {
    filename,
    csv,
  }
}
