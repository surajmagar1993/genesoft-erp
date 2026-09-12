"use server"

import { prisma } from "@/lib/prisma"
import { getTenantId } from "@/lib/get-tenant-id"
import { COMPANY } from "@/lib/constants/company"
import {
  compileAustralianBas,
  formatAustralianBasJson,
  formatAustralianBasCsv,
  getAustralianBasPeriod,
  validateAustralianAbn,
  AustralianBasReport,
  RawAuInvoice,
  RawAuBill,
} from "@/lib/australia-tax-engine"

export interface AustralianBasOverviewResult {
  startYear: number
  quarter: "Q1" | "Q2" | "Q3" | "Q4"
  report: AustralianBasReport
  telemetry: {
    gstOnSales1A: number
    gstOnPurchases1B: number
    netGst9: number
    isPayable: boolean
    paygWithheldW2: number
    totalOwedToAto8A: number
    abnComplianceRate: number
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

export async function getAustralianBasOverview(params?: {
  startYear?: number
  quarter?: "Q1" | "Q2" | "Q3" | "Q4"
}): Promise<AustralianBasOverviewResult> {
  const tenantId = await getTenantId()

  const now = new Date()
  // Determine Australian FY start year (July to June)
  const currentMonth = now.getMonth() + 1 // 1 to 12
  const defaultStartYear = currentMonth >= 7 ? now.getFullYear() : now.getFullYear() - 1
  const startYear = params?.startYear || defaultStartYear

  // Default quarter based on Australian FY
  let defaultQuarter: "Q1" | "Q2" | "Q3" | "Q4" = "Q1"
  if (currentMonth >= 7 && currentMonth <= 9) defaultQuarter = "Q1"
  else if (currentMonth >= 10 && currentMonth <= 12) defaultQuarter = "Q2"
  else if (currentMonth >= 1 && currentMonth <= 3) defaultQuarter = "Q3"
  else defaultQuarter = "Q4"

  const quarter = params?.quarter || defaultQuarter
  const period = getAustralianBasPeriod(startYear, quarter)

  const startDate = new Date(`${period.startDate}T00:00:00.000Z`)
  const endDate = new Date(`${period.endDate}T23:59:59.999Z`)

  // Fetch Tenant Settings
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      name: true,
      settings: true,
    },
  })

  const tenantSettings = (tenant?.settings as Record<string, any>) || {}
  const taxpayerAbn = tenantSettings.abn || tenantSettings.australia_abn || "51 824 753 556"
  const taxpayerLegalName = tenant?.name || COMPANY.name || "Genesoft ERP Australia Pty Ltd"
  const taxpayerAddress = tenantSettings.address || "Level 25, 100 Barangaroo Avenue, Sydney NSW 2000"

  // Fetch Outward Invoices
  const invoicesDb = await prisma.invoice.findMany({
    where: {
      tenantId,
      invoiceDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      contact: true,
      items: true,
    },
    orderBy: {
      invoiceDate: "asc",
    },
  })

  const rawInvoices: RawAuInvoice[] = invoicesDb.map((inv: any) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    invoiceDate: inv.invoiceDate,
    type: inv.type,
    status: inv.status,
    subtotal: Number(inv.subtotal || 0),
    taxAmount: Number(inv.taxAmount || 0),
    total: Number(inv.total || 0),
    contact: inv.contact
      ? {
          id: inv.contact.id,
          displayName: inv.contact.displayName,
          companyName: inv.contact.companyName,
          trn: inv.contact.trn, // Customer ABN
        }
      : null,
  }))

  // Fetch Inward Bills
  const billsDb = await prisma.bill.findMany({
    where: {
      tenantId,
      billDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      contact: true,
      items: true,
    },
    orderBy: {
      billDate: "asc",
    },
  })

  const rawBills: RawAuBill[] = billsDb.map((b: any) => ({
    id: b.id,
    billNumber: b.billNumber,
    billDate: b.billDate,
    status: b.status,
    subtotal: Number(b.subtotal || 0),
    taxAmount: Number(b.taxAmount || 0),
    total: Number(b.total || 0),
    notes: b.notes,
    contact: b.contact
      ? {
          id: b.contact.id,
          displayName: b.contact.displayName,
          companyName: b.contact.companyName,
          trn: b.contact.trn,
        }
      : null,
  }))

  // Compile BAS Report
  const report = compileAustralianBas({
    invoices: rawInvoices,
    bills: rawBills,
    payg: {
      grossWages: 45000,
      taxWithheld: 8500,
    },
    taxpayerAbn,
    taxpayerLegalName,
    taxpayerAddress,
    startYear,
    quarter,
  })

  const daysRemaining = getDaysUntil(period.dueDate)
  let status: "ON_TRACK" | "DUE_SOON" | "OVERDUE" = "ON_TRACK"
  if (daysRemaining < 0) status = "OVERDUE"
  else if (daysRemaining <= 7) status = "DUE_SOON"

  return {
    startYear,
    quarter,
    report,
    telemetry: {
      gstOnSales1A: report.box1AGstOnSales,
      gstOnPurchases1B: report.box1BGstOnPurchases,
      netGst9: Math.abs(report.box9NetGst),
      isPayable: report.box9NetGst >= 0,
      paygWithheldW2: report.boxW2TaxWithheld,
      totalOwedToAto8A: report.box8ATotalOwedToAto,
      abnComplianceRate: report.summary.abnComplianceRate,
      daysRemaining,
      status,
    },
  }
}

export async function exportAustralianBasJson(params?: {
  startYear?: number
  quarter?: "Q1" | "Q2" | "Q3" | "Q4"
}) {
  const overview = await getAustralianBasOverview(params)
  const jsonPayload = formatAustralianBasJson(overview.report)
  return JSON.stringify(jsonPayload, null, 2)
}

export async function exportAustralianBasCsv(params?: {
  startYear?: number
  quarter?: "Q1" | "Q2" | "Q3" | "Q4"
}) {
  const overview = await getAustralianBasOverview(params)
  return formatAustralianBasCsv(overview.report)
}
