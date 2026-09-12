"use server"

import { prisma } from "@/lib/prisma"
import { getTenantId } from "@/lib/get-tenant-id"
import { COMPANY } from "@/lib/constants/company"
import {
  compileUkMtdVatReturn,
  formatUkMtdJson,
  formatUkMtdCsv,
  getUkVatPeriod,
  validateUkVrn,
  UkMtdVatReturnReport,
  RawUkInvoice,
  RawUkBill,
} from "@/lib/uk-vat-engine"

export interface UkVatOverviewResult {
  year: number
  quarter: "Q1" | "Q2" | "Q3" | "Q4"
  report: UkMtdVatReturnReport
  telemetry: {
    box3TotalVatDue: number
    box4VatReclaimed: number
    box5NetVatDue: number
    isPayable: boolean
    box6NetSales: number
    box7NetPurchases: number
    vrnComplianceRate: number
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

export async function getUkVatOverview(params?: {
  year?: number
  quarter?: "Q1" | "Q2" | "Q3" | "Q4"
}): Promise<UkVatOverviewResult> {
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
  const period = getUkVatPeriod(year, quarter)

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
  const taxpayerVrn = tenantSettings.uk_vrn || tenantSettings.vrn || "GB 999 9999 73"
  const taxpayerLegalName = tenant?.name || COMPANY.name || "Genesoft Technologies UK Ltd"
  const taxpayerAddress = tenantSettings.address || "100 Bishopsgate, London EC2N 4AG, United Kingdom"

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
      items: true,
      contact: true,
    },
    orderBy: {
      invoiceDate: "asc",
    },
  })

  const rawInvoices: RawUkInvoice[] = invoicesDb.map((inv: any) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    invoiceDate: inv.invoiceDate,
    type: inv.type,
    status: inv.status,
    subtotal: Number(inv.subtotal || 0),
    taxAmount: Number(inv.taxAmount || 0),
    total: Number(inv.total || 0),
    placeOfSupply: inv.placeOfSupply,
    contact: inv.contact
      ? {
          id: inv.contact.id,
          displayName: inv.contact.displayName,
          companyName: inv.contact.companyName,
          trn: inv.contact.trn, // UK VRN
        }
      : null,
    items: (inv.items || []).map((it: any) => ({
      id: it.id,
      description: it.description,
      quantity: Number(it.quantity || 1),
      unitPrice: Number(it.unitPrice || 0),
      vatRate: it.vatRate ? Number(it.vatRate) : 20.0,
      vatAmount: Number(it.taxAmount || 0),
      lineTotal: Number(it.lineTotal || 0),
    })),
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
      items: true,
      contact: true,
    },
    orderBy: {
      billDate: "asc",
    },
  })

  const rawBills: RawUkBill[] = billsDb.map((b: any) => ({
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
    items: (b.items || []).map((bi: any) => ({
      id: bi.id,
      description: bi.description,
      quantity: Number(bi.quantity || 1),
      unitPrice: Number(bi.unitPrice || 0),
      taxPercent: Number(bi.taxPercent || 20.0),
      taxAmount: Number(bi.taxAmount || 0),
      lineTotal: Number(bi.lineTotal || 0),
    })),
  }))

  // Compile MTD 9-Box Report
  const report = compileUkMtdVatReturn({
    invoices: rawInvoices,
    bills: rawBills,
    taxpayerVrn,
    taxpayerLegalName,
    taxpayerAddress,
    year,
    quarter,
  })

  const daysRemaining = getDaysUntil(period.dueDate)
  let status: "ON_TRACK" | "DUE_SOON" | "OVERDUE" = "ON_TRACK"
  if (daysRemaining < 0) status = "OVERDUE"
  else if (daysRemaining <= 7) status = "DUE_SOON"

  return {
    year,
    quarter,
    report,
    telemetry: {
      box3TotalVatDue: report.box3TotalVatDue,
      box4VatReclaimed: report.box4VatReclaimedPurchases,
      box5NetVatDue: Math.abs(report.box5NetVatDue),
      isPayable: report.box5NetVatDue >= 0,
      box6NetSales: report.box6TotalValueSalesExVat,
      box7NetPurchases: report.box7TotalValuePurchasesExVat,
      vrnComplianceRate: report.summary.vrnComplianceRate,
      daysRemaining,
      status,
    },
  }
}

export async function exportUkMtdJson(params?: {
  year?: number
  quarter?: "Q1" | "Q2" | "Q3" | "Q4"
}) {
  const overview = await getUkVatOverview(params)
  const jsonPayload = formatUkMtdJson(overview.report)
  return JSON.stringify(jsonPayload, null, 2)
}

export async function exportUkMtdCsv(params?: {
  year?: number
  quarter?: "Q1" | "Q2" | "Q3" | "Q4"
}) {
  const overview = await getUkVatOverview(params)
  return formatUkMtdCsv(overview.report)
}
