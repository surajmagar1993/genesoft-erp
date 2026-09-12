"use server"

import { prisma } from "@/lib/prisma"
import { getTenantId } from "@/lib/get-tenant-id"
import { COMPANY } from "@/lib/constants/company"
import {
  compileKsaVatReturn,
  encodeZatcaTlv,
  generateZatcaUblXml,
  formatKsaVatReturnJson,
  formatKsaVatReturnCsv,
  getKsaVatPeriod,
  calculateZakatBase,
  validateKsaVatNumber,
  KsaVatReturnReport,
  ZakatCalculationInputs,
  ZakatCalculationResult,
  RawKsaInvoice,
  RawKsaBill,
  KsaInvoiceType,
} from "@/lib/ksa-zatca-engine"
import { generateQrCodeSvg } from "@/lib/barcode/qrcode"

export interface KsaInvoiceListItem {
  id: string
  invoiceNumber: string
  invoiceDate: string
  customerName: string
  customerVatNumber?: string | null
  invoiceType: KsaInvoiceType
  subtotal: number
  vatAmount: number
  total: number
  status: string
  tlvBase64: string
  hasValidZatcaVat: boolean
}

export interface KsaVatOverviewResult {
  year: number
  quarter: "Q1" | "Q2" | "Q3" | "Q4"
  report: KsaVatReturnReport
  telemetry: {
    totalOutputVat: number
    totalRecoverableInputVat: number
    netVatDue: number
    isPayable: boolean
    standardInvoicesCount: number
    simplifiedInvoicesCount: number
    billsCount: number
    exportCount: number
    complianceRate: number
    daysRemaining: number
    status: "ON_TRACK" | "DUE_SOON" | "OVERDUE"
  }
  invoices: KsaInvoiceListItem[]
  defaultZakat: ZakatCalculationResult
}

function getDaysUntil(dueDateStr: string): number {
  const target = new Date(dueDateStr)
  target.setHours(23, 59, 59, 999)
  const now = new Date()
  const diff = target.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export async function getKsaVatOverview(params?: {
  year?: number
  quarter?: "Q1" | "Q2" | "Q3" | "Q4"
}): Promise<KsaVatOverviewResult> {
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
  const period = getKsaVatPeriod(year, quarter)

  const startDate = new Date(`${period.startDate}T00:00:00.000Z`)
  const endDate = new Date(`${period.endDate}T23:59:59.999Z`)

  // Fetch Tenant Details
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      name: true,
      settings: true,
    },
  })

  const tenantSettings = (tenant?.settings as Record<string, any>) || {}
  const taxpayerVatNumber = tenantSettings.ksa_vat_number || tenantSettings.vat_number || "310123456789003"
  const taxpayerLegalName = tenant?.name || COMPANY.name || "Genesoft Middle East KSA LLC"
  const taxpayerAddress = tenantSettings.address || "King Fahd Road, Riyadh, Saudi Arabia"

  // Fetch Invoices in Period
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

  const rawInvoices: RawKsaInvoice[] = invoicesDb.map((inv: any) => ({
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
          trn: inv.contact.trn,
        }
      : null,
    items: (inv.items || []).map((li: any) => ({
      id: li.id,
      description: li.description,
      quantity: Number(li.quantity || 1),
      unitPrice: Number(li.unitPrice || 0),
      vatRate: li.vatRate ? Number(li.vatRate) : 15.0,
      vatAmount: li.vatAmount ? Number(li.vatAmount) : Number(li.taxAmount || 0),
      lineTotal: Number(li.lineTotal || 0),
    })),
  }))

  // Fetch Bills in Period
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

  const rawBills: RawKsaBill[] = billsDb.map((b: any) => ({
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
      taxPercent: Number(bi.taxPercent || 15.0),
      taxAmount: Number(bi.taxAmount || 0),
      lineTotal: Number(bi.lineTotal || 0),
    })),
  }))

  // Compile Return
  const report = compileKsaVatReturn({
    invoices: rawInvoices,
    bills: rawBills,
    taxpayerVatNumber,
    taxpayerLegalName,
    taxpayerAddress,
    year,
    quarter,
  })

  // Format Invoices for ZATCA Fatoora Desk
  const invoiceList: KsaInvoiceListItem[] = rawInvoices.map((inv) => {
    const buyerVat = (inv.contact?.trn || "").trim()
    const isB2B = validateKsaVatNumber(buyerVat).isValid
    const invoiceType: KsaInvoiceType = isB2B ? "STANDARD" : "SIMPLIFIED"

    const dateObj = new Date(inv.invoiceDate)
    const isoTimestamp = !isNaN(dateObj.getTime()) ? dateObj.toISOString() : new Date().toISOString()

    const tlvBase64 = encodeZatcaTlv({
      sellerName: taxpayerLegalName,
      vatNumber: taxpayerVatNumber,
      invoiceTimestamp: isoTimestamp,
      invoiceTotal: inv.total,
      vatTotal: inv.taxAmount,
    })

    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: !isNaN(dateObj.getTime()) ? dateObj.toISOString().split("T")[0] : "",
      customerName: inv.contact?.companyName || inv.contact?.displayName || "Walk-in Customer",
      customerVatNumber: buyerVat || null,
      invoiceType,
      subtotal: inv.subtotal,
      vatAmount: inv.taxAmount,
      total: inv.total,
      status: inv.status,
      tlvBase64,
      hasValidZatcaVat: isB2B,
    }
  })

  const daysRemaining = getDaysUntil(period.dueDate)
  let status: "ON_TRACK" | "DUE_SOON" | "OVERDUE" = "ON_TRACK"
  if (daysRemaining < 0) status = "OVERDUE"
  else if (daysRemaining <= 7) status = "DUE_SOON"

  // Compute Baseline Zakat
  const defaultZakat = calculateZakatBase({
    calendarType: "GREGORIAN",
    paidUpCapital: 500000,
    retainedEarnings: 120000,
    statutoryReserves: 50000,
    longTermLiabilities: 80000,
    adjustedNetProfit: Math.max(0, report.totalSalesTaxable - report.totalPurchasesTaxable),
    netFixedAssets: 150000,
  })

  return {
    year,
    quarter,
    report,
    telemetry: {
      totalOutputVat: report.totalOutputVat,
      totalRecoverableInputVat: report.totalRecoverableInputVat,
      netVatDue: Math.abs(report.netVatDue),
      isPayable: report.netVatDue >= 0,
      standardInvoicesCount: report.summary.standardInvoicesCount,
      simplifiedInvoicesCount: report.summary.simplifiedInvoicesCount,
      billsCount: report.summary.billsCount,
      exportCount: report.summary.exportCount,
      complianceRate: report.summary.complianceRate,
      daysRemaining,
      status,
    },
    invoices: invoiceList,
    defaultZakat,
  }
}

export async function generateZatcaInvoicePayload(invoiceId: string) {
  const tenantId = await getTenantId()

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId },
    include: {
      items: true,
      contact: true,
      tenant: {
        select: {
          name: true,
          settings: true,
        },
      },
    },
  })

  if (!invoice) throw new Error("Invoice not found.")

  const tenantSettings = (invoice.tenant?.settings as Record<string, any>) || {}
  const sellerVatNumber = tenantSettings.ksa_vat_number || tenantSettings.vat_number || "310123456789003"
  const sellerName = invoice.tenant?.name || COMPANY.name || "Genesoft Middle East KSA LLC"

  const buyerVat = (invoice.contact?.trn || "").trim()
  const isB2B = validateKsaVatNumber(buyerVat).isValid
  const invoiceType: KsaInvoiceType = isB2B ? "STANDARD" : "SIMPLIFIED"

  const dateObj = new Date(invoice.invoiceDate)
  const isoTimestamp = !isNaN(dateObj.getTime()) ? dateObj.toISOString() : new Date().toISOString()
  const invoiceDateStr = isoTimestamp.split("T")[0]
  const invoiceTimeStr = isoTimestamp.split("T")[1]?.slice(0, 8) || "12:00:00"

  const totalNum = Number(invoice.total || 0)
  const vatNum = Number(invoice.taxAmount || 0)
  const subtotalNum = Number(invoice.subtotal || 0)

  const tlvBase64 = encodeZatcaTlv({
    sellerName,
    vatNumber: sellerVatNumber,
    invoiceTimestamp: isoTimestamp,
    invoiceTotal: totalNum,
    vatTotal: vatNum,
  })

  const qrSvg = await generateQrCodeSvg(tlvBase64, {
    width: 200,
    margin: 1,
  })

  const items = (invoice.items || []).map((it: any, idx: number) => ({
    id: it.id || String(idx + 1),
    name: it.description || `Item ${idx + 1}`,
    quantity: Number(it.quantity || 1),
    unitPrice: Number(it.unitPrice || 0),
    vatRate: 15.0,
    vatAmount: Number(it.taxAmount || 0),
    lineTotal: Number(it.lineTotal || 0),
  }))

  const xmlContent = generateZatcaUblXml({
    invoiceNumber: invoice.invoiceNumber,
    invoiceUuid: invoice.id,
    invoiceDate: invoiceDateStr,
    invoiceTime: invoiceTimeStr,
    invoiceType,
    seller: {
      legalName: sellerName,
      vatNumber: sellerVatNumber,
      street: tenantSettings.street || "King Fahd Road",
      postalZone: tenantSettings.postalCode || "12211",
      city: tenantSettings.city || "Riyadh",
      district: tenantSettings.district || "Olaya",
    },
    buyer: {
      legalName: invoice.contact?.companyName || invoice.contact?.displayName || "Walk-in Customer",
      vatNumber: buyerVat || null,
      city: "Riyadh",
      street: "King Abdullah Road",
      postalZone: "11564",
    },
    subtotal: subtotalNum,
    vatAmount: vatNum,
    total: totalNum,
    items,
    tlvQrBase64: tlvBase64,
  })

  return {
    invoiceNumber: invoice.invoiceNumber,
    invoiceType,
    sellerName,
    sellerVatNumber,
    buyerName: invoice.contact?.companyName || invoice.contact?.displayName || "Walk-in Customer",
    buyerVatNumber: buyerVat || null,
    total: totalNum,
    vatAmount: vatNum,
    subtotal: subtotalNum,
    tlvBase64,
    qrSvg,
    xmlContent,
  }
}

export async function exportKsaVatReturnJson(params?: {
  year?: number
  quarter?: "Q1" | "Q2" | "Q3" | "Q4"
}) {
  const overview = await getKsaVatOverview(params)
  const jsonPayload = formatKsaVatReturnJson(overview.report)
  return JSON.stringify(jsonPayload, null, 2)
}

export async function exportKsaVatReturnCsv(params?: {
  year?: number
  quarter?: "Q1" | "Q2" | "Q3" | "Q4"
}) {
  const overview = await getKsaVatOverview(params)
  return formatKsaVatReturnCsv(overview.report)
}

export async function calculateZakatLiability(inputs: ZakatCalculationInputs): Promise<ZakatCalculationResult> {
  return calculateZakatBase(inputs)
}
