"use server"

import { prisma } from "@/lib/prisma"
import { getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"
import {
  TDS_SECTIONS,
  calculateTds,
  validatePan,
  validateTan,
  getIndianFinancialYear,
  getIndianTaxQuarter,
  IndianTaxQuarter,
  getQuarterDateRange,
  getTdsMonthlyDepositDueDate,
  getForm26QDueDate,
} from "@/lib/tds-engine"

// ── Types & Interfaces ────────────────────────────────────────────────────────

export interface TdsDeductionRecord {
  id: string
  billId?: string | null
  billNumber?: string | null
  paymentId?: string | null
  contactId: string
  vendorName: string
  vendorPan: string | null
  vendorType: string
  sectionCode: string
  sectionName: string
  grossAmount: number
  tdsRate: number
  tdsAmount: number
  netPaidAmount: number
  deductionDate: string // ISO
  quarter: IndianTaxQuarter
  fiscalYear: string // e.g. "2026-27"
  status: "PENDING" | "DEPOSITED" | "EXEMPT"
  challanId?: string | null
  challanBSR?: string | null
  challanNo?: string | null
  challanDate?: string | null
  notes?: string | null
  is206AAPenaltyApplied?: boolean
}

export interface TdsChallanRecord {
  id: string
  bsrCode: string // 7 digits
  challanNo: string // 5 digits
  depositDate: string // YYYY-MM-DD
  sectionCode: string
  majorHead: "0020" | "0021" // 0020 = Companies, 0021 = Non-Companies
  minorHead: "200" | "400" // 200 = TDS Payable by Taxpayer, 400 = Regular Assessment
  bankName: string
  tenderDate: string
  taxAmount: number
  surcharge: number
  cess: number
  interest: number
  penalty: number
  totalAmount: number
  chequeRefNo?: string | null
  fiscalYear: string
  quarter: IndianTaxQuarter
  deductionIds: string[]
  notes?: string | null
}

export interface TdsProfile {
  tan: string
  pan: string
  deductorName: string
  deductorCategory: "COMPANY" | "FIRM" | "INDIVIDUAL" | "GOVERNMENT"
  responsiblePersonName: string
  responsiblePersonDesignation: string
  responsiblePersonPan: string
  flatDoorBlock?: string
  premisesName?: string
  roadStreet?: string
  city?: string
  state?: string
  pinCode?: string
  email?: string
  phone?: string
}

export interface TdsSectionSummary {
  sectionCode: string
  sectionName: string
  totalGross: number
  totalTds: number
  deducteeCount: number
  depositedAmount: number
  pendingAmount: number
}

export interface TdsOverviewData {
  telemetry: {
    totalDeducted: number
    totalDeposited: number
    totalPending: number
    activeDeducteesCount: number
    panCompliantCount: number
    panNonCompliantCount: number
    nextDepositDueDate: string
    form26QDueDate: string
  }
  fiscalYear: string
  quarter: IndianTaxQuarter
  deductions: TdsDeductionRecord[]
  challans: TdsChallanRecord[]
  sectionBreakdown: TdsSectionSummary[]
  profile: TdsProfile
  availableFiscalYears: string[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTdsStore(tenantSettings: any): {
  deductions: TdsDeductionRecord[]
  challans: TdsChallanRecord[]
  profile: TdsProfile
} {
  const s = tenantSettings || {}
  const deductions: TdsDeductionRecord[] = Array.isArray(s.tdsDeductions) ? s.tdsDeductions : []
  const challans: TdsChallanRecord[] = Array.isArray(s.tdsChallans) ? s.tdsChallans : []
  const profile: TdsProfile = s.tdsProfile || {
    tan: "",
    pan: "",
    deductorName: "",
    deductorCategory: "COMPANY",
    responsiblePersonName: "",
    responsiblePersonDesignation: "Director / Principal Officer",
    responsiblePersonPan: "",
    city: "Mumbai",
    state: "Maharashtra",
  }
  return { deductions, challans, profile }
}

// ── Server Actions ────────────────────────────────────────────────────────────

/**
 * Retrieves the comprehensive TDS overview, telemetry, deductions, and challans.
 */
export async function getTdsOverview(
  requestedFy?: string,
  requestedQuarter?: IndianTaxQuarter
): Promise<TdsOverviewData> {
  const tenantId = await getTenantId()
  const now = new Date()
  const currentFy = requestedFy || getIndianFinancialYear(now)
  const currentQuarter = requestedQuarter || getIndianTaxQuarter(now)

  // Fetch tenant settings for saved TDS records
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, settings: true, countryCode: true },
  })

  const { deductions: storedDeductions, challans: storedChallans, profile: storedProfile } = getTdsStore(
    tenant?.settings
  )

  // Also query bills and payments to automatically discover TDS recorded on bills
  const [billsWithTds, vendors] = await Promise.all([
    prisma.bill.findMany({
      where: { tenantId },
      include: { contact: true },
      orderBy: { billDate: "desc" },
      take: 200,
    }),
    prisma.contact.findMany({
      where: { tenantId },
      select: { id: true, displayName: true, pan: true, companyName: true, type: true },
    }),
  ])

  // Combine stored deductions with any bills that have TDS metadata in their notes
  const combinedDeductionsMap = new Map<string, TdsDeductionRecord>()

  // 1. Add stored manual/custom deductions
  storedDeductions.forEach((d) => {
    combinedDeductionsMap.set(d.id, d)
  })

  // 2. Discover deductions embedded in bills (e.g. notes containing TDS JSON)
  billsWithTds.forEach((bill: any) => {
    if (bill.notes && bill.notes.includes("TDS_DEDUCTION:")) {
      try {
        const jsonStr = bill.notes.split("TDS_DEDUCTION:")[1]?.split("\n")[0]?.trim()
        if (jsonStr) {
          const parsed = JSON.parse(jsonStr)
          const deductionId = `tds-bill-${bill.id}`
          if (!combinedDeductionsMap.has(deductionId)) {
            const billDate = new Date(bill.billDate)
            const fy = getIndianFinancialYear(billDate)
            const q = getIndianTaxQuarter(billDate)

            combinedDeductionsMap.set(deductionId, {
              id: deductionId,
              billId: bill.id,
              billNumber: bill.billNumber,
              contactId: bill.contactId,
              vendorName: bill.contact?.companyName || bill.contact?.displayName || "Vendor",
              vendorPan: bill.contact?.pan || null,
              vendorType: bill.contact?.type || "COMPANY",
              sectionCode: parsed.sectionCode || "194C",
              sectionName: TDS_SECTIONS[parsed.sectionCode]?.name || "TDS Deduction",
              grossAmount: Number(bill.total) + Number(parsed.tdsAmount || 0),
              tdsRate: Number(parsed.tdsRate || 1),
              tdsAmount: Number(parsed.tdsAmount || 0),
              netPaidAmount: Number(bill.total),
              deductionDate: billDate.toISOString(),
              quarter: q,
              fiscalYear: fy,
              status: parsed.challanId ? "DEPOSITED" : "PENDING",
              challanId: parsed.challanId || null,
              is206AAPenaltyApplied: !!parsed.is206AAPenaltyApplied,
              notes: bill.notes,
            })
          }
        }
      } catch (e) {
        // Ignore parse errors on unstructured notes
      }
    }
  })

  const allDeductions = Array.from(combinedDeductionsMap.values())

  // Filter deductions for selected FY & Quarter
  const filteredDeductions = allDeductions.filter((d) => {
    const matchesFy = !currentFy || d.fiscalYear === currentFy
    const matchesQ = !currentQuarter || d.quarter === currentQuarter
    return matchesFy && matchesQ
  })

  // Filter challans for selected FY & Quarter
  const filteredChallans = storedChallans.filter((c) => {
    const matchesFy = !currentFy || c.fiscalYear === currentFy
    const matchesQ = !currentQuarter || c.quarter === currentQuarter
    return matchesFy && matchesQ
  })

  // Telemetry Calculations
  const totalDeducted = filteredDeductions.reduce((sum, d) => sum + d.tdsAmount, 0)
  const totalDeposited = filteredDeductions
    .filter((d) => d.status === "DEPOSITED")
    .reduce((sum, d) => sum + d.tdsAmount, 0)
  const totalPending = Math.max(0, totalDeducted - totalDeposited)

  const distinctVendors = new Set(filteredDeductions.map((d) => d.contactId))
  const panCompliantCount = filteredDeductions.filter((d) => {
    const res = validatePan(d.vendorPan)
    return res.isValid
  }).length
  const panNonCompliantCount = filteredDeductions.length - panCompliantCount

  // Section Breakdown
  const sectionMap = new Map<string, TdsSectionSummary>()
  Object.keys(TDS_SECTIONS).forEach((secKey) => {
    const sec = TDS_SECTIONS[secKey]
    sectionMap.set(sec.code, {
      sectionCode: sec.code,
      sectionName: sec.name,
      totalGross: 0,
      totalTds: 0,
      deducteeCount: 0,
      depositedAmount: 0,
      pendingAmount: 0,
    })
  })

  filteredDeductions.forEach((d) => {
    const existing = sectionMap.get(d.sectionCode) || {
      sectionCode: d.sectionCode,
      sectionName: d.sectionName,
      totalGross: 0,
      totalTds: 0,
      deducteeCount: 0,
      depositedAmount: 0,
      pendingAmount: 0,
    }
    existing.totalGross += d.grossAmount
    existing.totalTds += d.tdsAmount
    existing.deducteeCount += 1
    if (d.status === "DEPOSITED") {
      existing.depositedAmount += d.tdsAmount
    } else {
      existing.pendingAmount += d.tdsAmount
    }
    sectionMap.set(d.sectionCode, existing)
  })

  // Filter out sections with zero activity for cleaner display
  const sectionBreakdown = Array.from(sectionMap.values()).filter(
    (s) => s.totalTds > 0 || ["194C", "194J_TECH", "194J_PROF", "194I_LAND"].includes(s.sectionCode)
  )

  // Available FY list
  const currentYearNum = now.getFullYear()
  const availableFiscalYears = [
    `${currentYearNum}-${String((currentYearNum + 1) % 100).padStart(2, "0")}`,
    `${currentYearNum - 1}-${String(currentYearNum % 100).padStart(2, "0")}`,
    `${currentYearNum - 2}-${String((currentYearNum - 1) % 100).padStart(2, "0")}`,
  ]

  // Due Dates
  const nextDepositDueDate = getTdsMonthlyDepositDueDate(now).toISOString()
  const form26QDueDate = getForm26QDueDate(currentFy, currentQuarter).toISOString()

  // Ensure default profile has company name if empty
  const profile: TdsProfile = {
    ...storedProfile,
    deductorName: storedProfile.deductorName || tenant?.name || "Company Name",
  }

  return {
    telemetry: {
      totalDeducted: Math.round(totalDeducted * 100) / 100,
      totalDeposited: Math.round(totalDeposited * 100) / 100,
      totalPending: Math.round(totalPending * 100) / 100,
      activeDeducteesCount: distinctVendors.size,
      panCompliantCount,
      panNonCompliantCount,
      nextDepositDueDate,
      form26QDueDate,
    },
    fiscalYear: currentFy,
    quarter: currentQuarter,
    deductions: filteredDeductions,
    challans: filteredChallans,
    sectionBreakdown,
    profile,
    availableFiscalYears,
  }
}

/**
 * Records a new TDS deduction for a bill, payment, or standalone deduction entry.
 */
export async function recordTdsDeduction(input: {
  contactId: string
  grossAmount: number
  sectionCode: string
  billId?: string | null
  paymentId?: string | null
  deductionDate?: string
  customRate?: number
  notes?: string
}): Promise<{ success: boolean; deduction?: TdsDeductionRecord; error?: string }> {
  try {
    const tenantId = await getTenantId()
    const gross = Number(input.grossAmount)
    if (isNaN(gross) || gross <= 0) {
      return { success: false, error: "Gross amount must be greater than zero." }
    }

    // Fetch vendor/contact
    const contact = await prisma.contact.findFirst({
      where: { id: input.contactId, tenantId },
    })
    if (!contact) {
      return { success: false, error: "Deductee contact not found." }
    }

    // Calculate TDS using engine
    const deductionDate = input.deductionDate ? new Date(input.deductionDate) : new Date()
    const fy = getIndianFinancialYear(deductionDate)
    const q = getIndianTaxQuarter(deductionDate)

    const calc = calculateTds({
      grossAmount: gross,
      sectionCode: input.sectionCode,
      deducteePan: contact.pan,
      isIndividualOrHuf: contact.type === "INDIVIDUAL",
      customRate: input.customRate,
    })

    const deductionId = `tds-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const newRecord: TdsDeductionRecord = {
      id: deductionId,
      billId: input.billId || null,
      paymentId: input.paymentId || null,
      contactId: contact.id,
      vendorName: contact.companyName || contact.displayName,
      vendorPan: contact.pan || null,
      vendorType: contact.type,
      sectionCode: calc.sectionCode,
      sectionName: calc.sectionName,
      grossAmount: calc.grossAmount,
      tdsRate: calc.appliedRate,
      tdsAmount: calc.tdsAmount,
      netPaidAmount: calc.netPayableAmount,
      deductionDate: deductionDate.toISOString(),
      quarter: q,
      fiscalYear: fy,
      status: "PENDING",
      is206AAPenaltyApplied: calc.is206AAPenaltyApplied,
      notes: input.notes || calc.notes,
    }

    // Persist in tenant.settings
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    })
    const { deductions, challans, profile } = getTdsStore(tenant?.settings)
    deductions.unshift(newRecord)

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        settings: {
          ...(typeof tenant?.settings === "object" && tenant?.settings !== null ? tenant.settings : {}),
          tdsDeductions: deductions,
          tdsChallans: challans,
          tdsProfile: profile,
        },
      },
    })

    revalidatePath("/finance/tds")
    revalidatePath("/finance/bills")
    return { success: true, deduction: newRecord }
  } catch (err: any) {
    console.error("Error recording TDS deduction:", err)
    return { success: false, error: err.message || "Failed to record TDS deduction." }
  }
}

/**
 * Records an ITNS 281 Challan payment deposit to the Income Tax Department.
 */
export async function recordTdsChallan(input: {
  bsrCode: string
  challanNo: string
  depositDate: string
  sectionCode: string
  majorHead: "0020" | "0021"
  minorHead: "200" | "400"
  bankName: string
  tenderDate: string
  taxAmount: number
  surcharge?: number
  cess?: number
  interest?: number
  penalty?: number
  chequeRefNo?: string
  deductionIds: string[]
  notes?: string
}): Promise<{ success: boolean; challan?: TdsChallanRecord; error?: string }> {
  try {
    const tenantId = await getTenantId()

    // Validate BSR code (7 digits)
    const bsrClean = input.bsrCode.trim()
    if (!/^\d{7}$/.test(bsrClean)) {
      return { success: false, error: "BSR Code must be exactly 7 numeric digits." }
    }

    // Validate Challan No (5 digits)
    const challanClean = input.challanNo.trim()
    if (!/^\d{1,5}$/.test(challanClean)) {
      return { success: false, error: "Challan Serial Number must be up to 5 digits." }
    }

    const taxAmount = Math.max(0, Number(input.taxAmount) || 0)
    const surcharge = Math.max(0, Number(input.surcharge) || 0)
    const cess = Math.max(0, Number(input.cess) || 0)
    const interest = Math.max(0, Number(input.interest) || 0)
    const penalty = Math.max(0, Number(input.penalty) || 0)
    const totalAmount = taxAmount + surcharge + cess + interest + penalty

    if (totalAmount <= 0) {
      return { success: false, error: "Total challan deposit amount must be greater than zero." }
    }

    const depDate = new Date(input.depositDate)
    const fy = getIndianFinancialYear(depDate)
    const q = getIndianTaxQuarter(depDate)

    const challanId = `challan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    const newChallan: TdsChallanRecord = {
      id: challanId,
      bsrCode: bsrClean,
      challanNo: challanClean.padStart(5, "0"),
      depositDate: input.depositDate,
      sectionCode: input.sectionCode,
      majorHead: input.majorHead,
      minorHead: input.minorHead,
      bankName: input.bankName.trim() || "State Bank of India",
      tenderDate: input.tenderDate || input.depositDate,
      taxAmount,
      surcharge,
      cess,
      interest,
      penalty,
      totalAmount,
      chequeRefNo: input.chequeRefNo || null,
      fiscalYear: fy,
      quarter: q,
      deductionIds: input.deductionIds || [],
      notes: input.notes || null,
    }

    // Fetch stored records to update
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    })
    const { deductions, challans, profile } = getTdsStore(tenant?.settings)

    // Mark selected deductions as DEPOSITED and link challan
    const updatedDeductions = deductions.map((d) => {
      if (input.deductionIds.includes(d.id)) {
        return {
          ...d,
          status: "DEPOSITED" as const,
          challanId: newChallan.id,
          challanBSR: newChallan.bsrCode,
          challanNo: newChallan.challanNo,
          challanDate: newChallan.depositDate,
        }
      }
      return d
    })

    challans.unshift(newChallan)

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        settings: {
          ...(typeof tenant?.settings === "object" && tenant?.settings !== null ? tenant.settings : {}),
          tdsDeductions: updatedDeductions,
          tdsChallans: challans,
          tdsProfile: profile,
        },
      },
    })

    revalidatePath("/finance/tds")
    return { success: true, challan: newChallan }
  } catch (err: any) {
    console.error("Error recording TDS challan:", err)
    return { success: false, error: err.message || "Failed to record Challan 281 deposit." }
  }
}

/**
 * Updates the company TAN Deductor Profile and statutory contact details.
 */
export async function updateTdsProfile(
  profile: Partial<TdsProfile>
): Promise<{ success: boolean; error?: string }> {
  try {
    const tenantId = await getTenantId()

    // Validate TAN if provided
    if (profile.tan) {
      const tanRes = validateTan(profile.tan)
      if (!tanRes.isValid) {
        return { success: false, error: tanRes.error }
      }
    }

    // Validate Deductor PAN if provided
    if (profile.pan) {
      const panRes = validatePan(profile.pan)
      if (!panRes.isValid) {
        return { success: false, error: panRes.error }
      }
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    })
    const { deductions, challans, profile: existingProfile } = getTdsStore(tenant?.settings)

    const updatedProfile: TdsProfile = {
      ...existingProfile,
      ...profile,
      tan: profile.tan ? profile.tan.toUpperCase().trim() : existingProfile.tan,
      pan: profile.pan ? profile.pan.toUpperCase().trim() : existingProfile.pan,
      responsiblePersonPan: profile.responsiblePersonPan
        ? profile.responsiblePersonPan.toUpperCase().trim()
        : existingProfile.responsiblePersonPan,
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        settings: {
          ...(typeof tenant?.settings === "object" && tenant?.settings !== null ? tenant.settings : {}),
          tdsDeductions: deductions,
          tdsChallans: challans,
          tdsProfile: updatedProfile,
        },
      },
    })

    revalidatePath("/finance/tds")
    return { success: true }
  } catch (err: any) {
    console.error("Error updating TDS profile:", err)
    return { success: false, error: err.message || "Failed to update Deductor profile." }
  }
}

/**
 * Generates the Form 26Q return payload for the selected quarter and fiscal year.
 */
export async function exportForm26QSummary(
  fiscalYear?: string,
  quarter?: IndianTaxQuarter
): Promise<{
  success: boolean
  form26QData?: {
    header: {
      tan: string
      pan: string
      deductorName: string
      deductorCategory: string
      fiscalYear: string
      quarter: string
      dueDate: string
      responsiblePerson: string
      designation: string
    }
    challansSummary: {
      totalChallansCount: number
      totalDepositedTax: number
      challans: TdsChallanRecord[]
    }
    deducteeAnnexure: {
      recordCount: number
      totalGrossAmount: number
      totalTdsDeducted: number
      records: Array<{
        serialNo: number
        deducteeCode: "01" | "02" // 01 = Company, 02 = Non-company
        pan: string
        name: string
        section: string
        paymentDate: string
        grossAmount: number
        tdsRate: number
        tdsAmount: number
        dateOfDeduction: string
        challanBSR: string
        challanNo: string
        reasonForNonDeduction: string
      }>
    }
  }
  error?: string
}> {
  try {
    const overview = await getTdsOverview(fiscalYear, quarter)
    const { profile, deductions, challans, fiscalYear: fy, quarter: q } = overview

    const annexureRecords = deductions.map((d, index) => {
      const isCompany = d.vendorType === "COMPANY"
      return {
        serialNo: index + 1,
        deducteeCode: (isCompany ? "01" : "02") as "01" | "02",
        pan: d.vendorPan || "PANNOTAVBL",
        name: d.vendorName,
        section: d.sectionCode,
        paymentDate: d.deductionDate.split("T")[0],
        grossAmount: d.grossAmount,
        tdsRate: d.tdsRate,
        tdsAmount: d.tdsAmount,
        dateOfDeduction: d.deductionDate.split("T")[0],
        challanBSR: d.challanBSR || "PENDING",
        challanNo: d.challanNo || "PENDING",
        reasonForNonDeduction: d.is206AAPenaltyApplied ? "Higher Rate (Sec 206AA)" : "",
      }
    })

    const totalGross = annexureRecords.reduce((sum, r) => sum + r.grossAmount, 0)
    const totalTds = annexureRecords.reduce((sum, r) => sum + r.tdsAmount, 0)
    const totalChallanAmt = challans.reduce((sum, c) => sum + c.totalAmount, 0)

    return {
      success: true,
      form26QData: {
        header: {
          tan: profile.tan || "TANNOTAVBL",
          pan: profile.pan || "PANNOTAVBL",
          deductorName: profile.deductorName,
          deductorCategory: profile.deductorCategory,
          fiscalYear: fy,
          quarter: q,
          dueDate: overview.telemetry.form26QDueDate.split("T")[0],
          responsiblePerson: profile.responsiblePersonName || "Director",
          designation: profile.responsiblePersonDesignation || "Principal Officer",
        },
        challansSummary: {
          totalChallansCount: challans.length,
          totalDepositedTax: totalChallanAmt,
          challans,
        },
        deducteeAnnexure: {
          recordCount: annexureRecords.length,
          totalGrossAmount: Math.round(totalGross * 100) / 100,
          totalTdsDeducted: Math.round(totalTds * 100) / 100,
          records: annexureRecords,
        },
      },
    }
  } catch (err: any) {
    console.error("Error exporting Form 26Q:", err)
    return { success: false, error: err.message || "Failed to generate Form 26Q return data." }
  }
}
