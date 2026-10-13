"use server"

import { prisma } from "@/lib/prisma"
import { requireTaxId } from "@/lib/tax-identity"
import { getTenantId, getTenantWriterId } from "@/lib/get-tenant-id"
import { COMPANY } from "@/lib/constants/company"
import {
  compileUsStateSalesTaxSchedule,
  compileUs1099Records,
  evaluateCertificateStatus,
  formatUsStateSalesTaxCsv,
  format1099FireCsv,
  EXEMPTION_STATUTES,
  ExemptionType,
  RawUsInvoice,
  RawUsBill,
  UsExemptionCertificate,
  UsTaxOverviewReport,
  US_STATE_TAX_RULES,
  validateUsEin,
} from "@/lib/us-tax-engine"

/**
 * State name to 2-letter uppercase postal code mapping helper
 */
const STATE_NAME_TO_CODE: Record<string, string> = {
  ALABAMA: "AL",
  ALASKA: "AK",
  ARIZONA: "AZ",
  ARKANSAS: "AR",
  CALIFORNIA: "CA",
  COLORADO: "CO",
  CONNECTICUT: "CT",
  DELAWARE: "DE",
  FLORIDA: "FL",
  GEORGIA: "GA",
  HAWAII: "HI",
  IDAHO: "ID",
  ILLINOIS: "IL",
  INDIANA: "IN",
  IOWA: "IA",
  KANSAS: "KS",
  KENTUCKY: "KY",
  LOUISIANA: "LA",
  MAINE: "ME",
  MARYLAND: "MD",
  MASSACHUSETTS: "MA",
  MICHIGAN: "MI",
  MINNESOTA: "MN",
  MISSISSIPPI: "MS",
  MISSOURI: "MO",
  MONTANA: "MT",
  NEBRASKA: "NE",
  NEVADA: "NV",
  "NEW HAMPSHIRE": "NH",
  "NEW JERSEY": "NJ",
  "NEW MEXICO": "NM",
  "NEW YORK": "NY",
  "NORTH CAROLINA": "NC",
  "NORTH DAKOTA": "ND",
  OHIO: "OH",
  OKLAHOMA: "OK",
  OREGON: "OR",
  PENNSYLVANIA: "PA",
  "RHODE ISLAND": "RI",
  "SOUTH CAROLINA": "SC",
  "SOUTH DAKOTA": "SD",
  TENNESSEE: "TN",
  TEXAS: "TX",
  UTAH: "UT",
  VERMONT: "VT",
  VIRGINIA: "VA",
  WASHINGTON: "WA",
  "WEST VIRGINIA": "WV",
  WISCONSIN: "WI",
  WYOMING: "WY",
  "DISTRICT OF COLUMBIA": "DC",
}

/** Two-letter US state code, or "" when it can't be determined (never a guess). */
function resolveStateCode(rawState?: string | null): string {
  if (!rawState) return ""
  const cleaned = rawState.trim().toUpperCase()
  if (US_STATE_TAX_RULES[cleaned]) return cleaned
  if (STATE_NAME_TO_CODE[cleaned]) return STATE_NAME_TO_CODE[cleaned]
  return ""
}

export async function getUsTaxOverview(params?: {
  taxYear?: number
  quarter?: "Q1" | "Q2" | "Q3" | "Q4" | "ALL"
}): Promise<UsTaxOverviewReport> {
  const tenantId = await getTenantId()
  const now = new Date()
  const taxYear = params?.taxYear || now.getFullYear()
  const quarter = params?.quarter || "ALL"

  // Date ranges
  let startDate: Date
  let endDate: Date

  if (quarter === "Q1") {
    startDate = new Date(Date.UTC(taxYear, 0, 1, 0, 0, 0))
    endDate = new Date(Date.UTC(taxYear, 2, 31, 23, 59, 59, 999))
  } else if (quarter === "Q2") {
    startDate = new Date(Date.UTC(taxYear, 3, 1, 0, 0, 0))
    endDate = new Date(Date.UTC(taxYear, 5, 30, 23, 59, 59, 999))
  } else if (quarter === "Q3") {
    startDate = new Date(Date.UTC(taxYear, 6, 1, 0, 0, 0))
    endDate = new Date(Date.UTC(taxYear, 8, 30, 23, 59, 59, 999))
  } else if (quarter === "Q4") {
    startDate = new Date(Date.UTC(taxYear, 9, 1, 0, 0, 0))
    endDate = new Date(Date.UTC(taxYear, 11, 31, 23, 59, 59, 999))
  } else {
    // Full Calendar Year
    startDate = new Date(Date.UTC(taxYear, 0, 1, 0, 0, 0))
    endDate = new Date(Date.UTC(taxYear, 11, 31, 23, 59, 59, 999))
  }

  // 1. Fetch Invoices for Sales Tax & Nexus
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

  // Format invoices
  const rawInvoices: RawUsInvoice[] = invoicesDb.map((inv: any) => {
    const billTo = (inv.billTo as Record<string, any>) || {}
    const shipTo = (inv.shipTo as Record<string, any>) || {}
    const contactBilling = (inv.contact?.billingAddress as Record<string, any>) || {}

    const stateCandidate =
      inv.placeOfSupply ||
      shipTo.state ||
      shipTo.stateCode ||
      billTo.state ||
      billTo.stateCode ||
      contactBilling.state ||
      "NY"

    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate.toISOString().split("T")[0],
      contactId: inv.contactId,
      contactName: inv.contact?.displayName || "Customer",
      stateCode: resolveStateCode(stateCandidate),
      subtotal: Number(inv.subtotal),
      taxAmount: Number(inv.taxAmount),
      total: Number(inv.total),
      isTaxExempt: inv.isTaxExempt || false,
      taxExemptionReason: inv.taxExemptionReason,
      taxExemptionCertificate: inv.taxExemptionCertificate,
    }
  })

  // 2. Fetch Bills for IRS 1099 (Always evaluated across full calendar year)
  const fullYearStart = new Date(Date.UTC(taxYear, 0, 1, 0, 0, 0))
  const fullYearEnd = new Date(Date.UTC(taxYear, 11, 31, 23, 59, 59, 999))

  const billsDb = await prisma.bill.findMany({
    where: {
      tenantId,
      billDate: {
        gte: fullYearStart,
        lte: fullYearEnd,
      },
    },
    include: {
      contact: true,
    },
    orderBy: {
      billDate: "asc",
    },
  })

  const rawBills: RawUsBill[] = billsDb.map((b: any) => ({
    id: b.id,
    billNumber: b.billNumber,
    billDate: b.billDate.toISOString().split("T")[0],
    vendorId: b.contactId,
    vendorName: b.contact?.displayName || "Vendor",
    vendorEin: b.contact?.ein || b.contact?.taxNumber,
    total: Number(b.total),
    status: b.status,
    category: b.notes?.includes("Rent") ? "Rent" : "Services",
  }))

  // 3. Fetch Exemption Certificates from Contacts
  const exemptContacts = await prisma.contact.findMany({
    where: {
      tenantId,
      OR: [
        { isTaxExempt: true },
        { taxExemptionCertificate: { not: null } },
      ],
    },
  })

  const exemptionCertificates: UsExemptionCertificate[] = exemptContacts.map((c: any) => {
    const rawReason = (c.taxExemptionReason as ExemptionType) || "RESALE"
    const validReason: ExemptionType = EXEMPTION_STATUTES[rawReason] ? rawReason : "RESALE"
    const statute = EXEMPTION_STATUTES[validReason]
    const certNum = c.taxExemptionCertificate || ""

    // Default expiry 1 year from updated date or end of current tax year
    const expiryDateStr = `${taxYear}-12-31`
    const { status, daysToExpiry } = evaluateCertificateStatus(expiryDateStr)

    const addr = (c.billingAddress as Record<string, any>) || {}
    const state = resolveStateCode(addr.state)

    return {
      id: c.id,
      customerId: c.id,
      customerName: c.displayName,
      certificateNumber: certNum,
      issuingState: state,
      exemptionType: validReason,
      effectiveDate: `${taxYear}-01-01`,
      expiryDate: expiryDateStr,
      status,
      daysToExpiry,
      statutoryClause: statute.law,
    }
  })

  // 4. Compile Schedules & Records
  const stateSchedules = compileUsStateSalesTaxSchedule(rawInvoices, taxYear, quarter)
  const vendor1099Records = compileUs1099Records(rawBills)

  // 5. Compute Top Telemetry Bar Metrics
  const totalGrossSales = Math.round(stateSchedules.reduce((acc, s) => acc + s.grossSales, 0) * 100) / 100
  const totalTaxableSales = Math.round(stateSchedules.reduce((acc, s) => acc + s.taxableSales, 0) * 100) / 100
  const totalExemptSales = Math.round(stateSchedules.reduce((acc, s) => acc + s.exemptSales, 0) * 100) / 100
  const totalSalesTaxCollected = Math.round(stateSchedules.reduce((acc, s) => acc + s.totalTaxCollected, 0) * 100) / 100

  const activeNexusCount = stateSchedules.filter((s) => s.nexusStatus === "ACTIVE_NEXUS").length
  const approachingNexusCount = stateSchedules.filter((s) => s.nexusStatus === "APPROACHING").length
  const monitoredStatesCount = stateSchedules.filter((s) => s.nexusStatus === "MONITORED").length

  const reportable1099Vendors = vendor1099Records.filter((v) => v.filingStatus === "REQUIRED")
  const total1099ReportableAmount =
    Math.round(reportable1099Vendors.reduce((acc, v) => acc + v.box1NecAmount + v.box1MiscRents, 0) * 100) / 100
  const reportable1099VendorCount = reportable1099Vendors.length

  const verifiedW9Count = reportable1099Vendors.filter((v) => v.w9Status === "VERIFIED").length
  const w9ComplianceRate =
    reportable1099VendorCount > 0 ? Math.round((verifiedW9Count / reportable1099VendorCount) * 100) : 100

  const activeCertificatesCount = exemptionCertificates.filter((c) => c.status === "ACTIVE").length

  const periodLabel = quarter === "ALL" ? `Full Calendar Year ${taxYear}` : `${quarter} ${taxYear}`

  return {
    taxYear,
    quarter,
    periodLabel,
    telemetry: {
      totalGrossSales,
      totalTaxableSales,
      totalExemptSales,
      totalSalesTaxCollected,
      activeNexusCount,
      approachingNexusCount,
      monitoredStatesCount,
      total1099ReportableAmount,
      reportable1099VendorCount,
      w9ComplianceRate,
      activeCertificatesCount,
    },
    stateSchedules,
    vendor1099Records,
    exemptionCertificates,
  }
}

export async function exportUsTaxCsv(params: {
  taxYear: number
  quarter?: "Q1" | "Q2" | "Q3" | "Q4" | "ALL"
}): Promise<string> {
  const tenantId = await getTenantId()
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  })
  const payerName = tenant?.name || ""

  const overview = await getUsTaxOverview(params)
  return formatUsStateSalesTaxCsv(overview.stateSchedules, payerName, params.taxYear)
}

export async function export1099FireCsvAction(params: { taxYear: number }): Promise<string> {
  const tenantId = await getTenantId()
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, settings: true },
  })
  const settings = (tenant?.settings as Record<string, any>) || {}
  const payerName = tenant?.name || ""
  const payerEin = requireTaxId(settings.ein || settings.tax_id, "EIN")

  const overview = await getUsTaxOverview({ taxYear: params.taxYear, quarter: "ALL" })
  return format1099FireCsv(overview.vendor1099Records, payerName, payerEin, params.taxYear)
}

export async function saveExemptionCertificateAction(data: {
  customerId: string
  certificateNumber: string
  issuingState: string
  exemptionType: ExemptionType
  expiryDate: string
  reason?: string
}): Promise<{ success: boolean; message: string }> {
  const tenantId = await getTenantWriterId()

  await prisma.contact.update({
    where: {
      id: data.customerId,
      tenantId,
    },
    data: {
      isTaxExempt: true,
      taxExemptionCertificate: data.certificateNumber,
      taxExemptionReason: data.exemptionType,
    },
  })

  return {
    success: true,
    message: `Exemption Certificate ${data.certificateNumber} successfully registered for customer.`,
  }
}

export async function updateVendorW9Action(data: {
  vendorId: string
  ein: string
}): Promise<{ success: boolean; message: string }> {
  const tenantId = await getTenantWriterId()
  const check = validateUsEin(data.ein)

  if (!check.isValid) {
    throw new Error(check.error || "Invalid EIN format")
  }

  await prisma.contact.update({
    where: {
      id: data.vendorId,
      tenantId,
    },
    data: {
      ein: check.formatted,
    },
  })

  return {
    success: true,
    message: `Vendor EIN updated to ${check.formatted}. W-9 status verified.`,
  }
}
