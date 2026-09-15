"use server"

import { prisma } from "@/lib/prisma"
import { getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"
import {
  EWAY_BILL_CONSIGNMENT_THRESHOLD,
  EwaySupplyType,
  EwaySubSupplyCode,
  EwayDocType,
  EwayTransportModeCode,
  EwayVehicleTypeCode,
  EwayItemPayload,
  EwayBillInput,
  validateVehicleNumber,
  validateTransporterId,
  validatePinCode,
  calculateEwayBillValidity,
  generateEwayBillNumber,
  formatEwayBillQrPayload,
  buildNicBulkUploadJson,
} from "@/lib/eway-bill-engine"
import { COMPANY } from "@/lib/constants/company"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VehicleUpdateRecord {
  vehicleNo: string
  vehicleType: EwayVehicleTypeCode
  updatedAt: string
  reason: string
  fromPlace: string
  transDocNo?: string
}

export interface EwayBillRecord {
  id: string
  ewayBillNo: string
  invoiceId?: string | null
  invoiceNumber?: string | null
  supplyType: EwaySupplyType
  subSupplyType: EwaySubSupplyCode
  docType: EwayDocType
  docNo: string
  docDate: string // YYYY-MM-DD
  status: "ACTIVE" | "CANCELLED" | "EXPIRED"
  generatedAt: string // ISO
  validFrom: string // ISO
  validUntil: string // ISO
  validityDays: number
  approxDistanceKm: number
  isExpired: boolean
  hoursRemaining: number

  // Part A: Consignor & Consignee
  fromGstin: string
  fromTrdName: string
  fromAddr1: string
  fromAddr2?: string
  fromPlace: string
  fromPincode: number
  fromStateCode: number
  toGstin: string
  toTrdName: string
  toAddr1: string
  toAddr2?: string
  toPlace: string
  toPincode: number
  toStateCode: number

  // Value & Tax Breakdown
  totalValue: number
  cgstValue: number
  sgstValue: number
  igstValue: number
  cessValue: number
  totInvValue: number
  mainHsn: string
  itemList: EwayItemPayload[]

  // Part B: Transport Details
  transMode: EwayTransportModeCode
  vehicleNo?: string
  vehicleType: EwayVehicleTypeCode
  transporterId?: string
  transporterName?: string
  transDocNo?: string
  transDocDate?: string
  vehicleUpdateHistory: VehicleUpdateRecord[]

  // Cancellation Details
  cancelledAt?: string
  cancelReason?: string
  cancelRemark?: string

  qrPayload: string
}

export interface TransporterRecord {
  id: string
  name: string
  gstin: string
  phone?: string
  contactPerson?: string
}

export interface EwayTelemetry {
  activeInTransitCount: number
  totalValueInTransit: number
  expiringSoonCount: number
  cancelledCount: number
  totalBillsCount: number
}

export interface EligibleInvoiceCandidate {
  id: string
  invoiceNumber: string
  invoiceDate: string
  customerName: string
  customerGstin?: string
  total: number
  placeOfSupply: string
  supplyType: string
  hasEwayBill: boolean
  ewayBillNo?: string
}

export interface EwayOverviewData {
  telemetry: EwayTelemetry
  bills: EwayBillRecord[]
  eligibleInvoices: EligibleInvoiceCandidate[]
  transporters: TransporterRecord[]
}

// ── Store Helpers ─────────────────────────────────────────────────────────────

function getEwayStore(tenantSettings: any): {
  bills: EwayBillRecord[]
  transporters: TransporterRecord[]
} {
  const s = tenantSettings || {}
  const bills: EwayBillRecord[] = Array.isArray(s.ewayBills) ? s.ewayBills : []
  const transporters: TransporterRecord[] = Array.isArray(s.ewayTransporters)
    ? s.ewayTransporters
    : [
        {
          id: "trans-default-1",
          name: "VRL Logistics Ltd",
          gstin: "29AABCV1234F1Z1",
          phone: "+91 98220 12345",
          contactPerson: "Operations Desk",
        },
        {
          id: "trans-default-2",
          name: "Blue Dart Express",
          gstin: "27AAACB1234D1Z2",
          phone: "+91 99300 54321",
          contactPerson: "Surface Cargo Booking",
        },
      ]
  return { bills, transporters }
}

// ── Server Actions ────────────────────────────────────────────────────────────

/**
 * Fetches E-Way Bill overview metrics, registry, candidate invoices, and transporters.
 */
export async function getEwayBillsOverview(
  filterStatus?: "ALL" | "ACTIVE" | "CANCELLED" | "EXPIRED",
  search?: string
): Promise<EwayOverviewData> {
  const tenantId = await getTenantId()

  const [tenant, invoices] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    }),
    prisma.invoice.findMany({
      where: {
        tenantId,
        type: "TAX_INVOICE",
        status: { notIn: ["CANCELLED", "DRAFT"] },
      },
      include: {
        contact: true,
        items: true,
      },
      orderBy: { invoiceDate: "desc" },
      take: 50,
    }),
  ])

  const { bills: storedBills, transporters } = getEwayStore(tenant?.settings)

  // Recalculate dynamic expiry status on read
  const now = new Date()
  const refreshedBills: EwayBillRecord[] = storedBills.map((b) => {
    if (b.status === "CANCELLED") return b
    const until = new Date(b.validUntil)
    const isExpired = now.getTime() > until.getTime()
    const diffMs = until.getTime() - now.getTime()
    const hoursRemaining = Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10)
    return {
      ...b,
      isExpired,
      hoursRemaining,
      status: isExpired ? "EXPIRED" : "ACTIVE",
    }
  })

  // Map candidate eligible invoices (> 50,000 threshold check or all TAX_INVOICE)
  const existingEwbInvoiceMap = new Map<string, string>()
  refreshedBills.forEach((b) => {
    if (b.invoiceId && b.status === "ACTIVE") {
      existingEwbInvoiceMap.set(b.invoiceId, b.ewayBillNo)
    }
  })

  const eligibleInvoices: EligibleInvoiceCandidate[] = invoices.map((inv: any) => {
    const totalAmount = Number(inv.total || 0)
    const billTo = (inv.billTo as Record<string, any>) || {}
    const ewbNo = existingEwbInvoiceMap.get(inv.id) || billTo.ewayBillNo
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().split("T")[0] : "",
      customerName: billTo.name || inv.contact?.displayName || "Customer",
      customerGstin: billTo.gstin || inv.contact?.taxNumber || "",
      total: totalAmount,
      placeOfSupply: inv.placeOfSupply || "Maharashtra",
      supplyType: inv.placeOfSupply && inv.placeOfSupply !== COMPANY.state ? "Inter-State" : "Intra-State",
      hasEwayBill: !!ewbNo,
      ewayBillNo: ewbNo,
    }
  })

  // Filter bills
  let filtered = refreshedBills
  if (filterStatus && filterStatus !== "ALL") {
    filtered = filtered.filter((b) => b.status === filterStatus)
  }
  if (search && search.trim()) {
    const q = search.trim().toLowerCase()
    filtered = filtered.filter(
      (b) =>
        b.ewayBillNo.toLowerCase().includes(q) ||
        b.docNo.toLowerCase().includes(q) ||
        b.toTrdName.toLowerCase().includes(q) ||
        (b.vehicleNo && b.vehicleNo.toLowerCase().includes(q)) ||
        (b.transporterName && b.transporterName.toLowerCase().includes(q))
    )
  }

  // Telemetry computation
  const activeInTransit = refreshedBills.filter((b) => b.status === "ACTIVE")
  const activeInTransitCount = activeInTransit.length
  const totalValueInTransit = activeInTransit.reduce((sum, b) => sum + (b.totInvValue || 0), 0)
  const expiringSoonCount = activeInTransit.filter((b) => b.hoursRemaining <= 24).length
  const cancelledCount = refreshedBills.filter((b) => b.status === "CANCELLED").length
  const totalBillsCount = refreshedBills.length

  return {
    telemetry: {
      activeInTransitCount,
      totalValueInTransit,
      expiringSoonCount,
      cancelledCount,
      totalBillsCount,
    },
    bills: filtered,
    eligibleInvoices,
    transporters,
  }
}

/**
 * Generates an official Indian Statutory E-Way Bill (Part-A and Part-B).
 */
export async function generateEwayBill(payload: {
  invoiceId?: string
  supplyType: EwaySupplyType
  subSupplyType: EwaySubSupplyCode
  docType: EwayDocType
  docNo: string
  docDate: string
  fromGstin: string
  fromTrdName: string
  fromAddr1: string
  fromAddr2?: string
  fromPlace: string
  fromPincode: number
  fromStateCode: number
  toGstin: string
  toTrdName: string
  toAddr1: string
  toAddr2?: string
  toPlace: string
  toPincode: number
  toStateCode: number
  totalValue: number
  cgstValue: number
  sgstValue: number
  igstValue: number
  cessValue?: number
  transMode: EwayTransportModeCode
  transDistance: number
  transporterId?: string
  transporterName?: string
  transDocNo?: string
  transDocDate?: string
  vehicleNo?: string
  vehicleType?: EwayVehicleTypeCode
  itemList: EwayItemPayload[]
}): Promise<{ success: boolean; ewayBill?: EwayBillRecord; error?: string }> {
  const tenantId = await getTenantId()

  // 1. Validation Checks
  if (!payload.docNo.trim()) {
    return { success: false, error: "Document Number is required." }
  }
  const fromPinRes = validatePinCode(payload.fromPincode)
  if (!fromPinRes.isValid) {
    return { success: false, error: `From PIN Code: ${fromPinRes.error}` }
  }
  const toPinRes = validatePinCode(payload.toPincode)
  if (!toPinRes.isValid) {
    return { success: false, error: `To PIN Code: ${toPinRes.error}` }
  }

  if (payload.transMode === "1" && payload.vehicleNo) {
    const vRes = validateVehicleNumber(payload.vehicleNo)
    if (!vRes.isValid) {
      return { success: false, error: vRes.error }
    }
  }

  if (payload.transporterId) {
    const tRes = validateTransporterId(payload.transporterId)
    if (!tRes.isValid) {
      return { success: false, error: tRes.error }
    }
  }

  const generatedAt = new Date()
  const vehicleType = payload.vehicleType || "R"
  const validity = calculateEwayBillValidity(payload.transDistance, vehicleType, generatedAt)
  const ewayBillNo = generateEwayBillNumber(String(payload.fromStateCode))

  const cleanVehicleNo = payload.vehicleNo ? payload.vehicleNo.replace(/[\s-]/g, "").toUpperCase() : ""
  const totInvValue = Number(
    (
      payload.totalValue +
      payload.cgstValue +
      payload.sgstValue +
      payload.igstValue +
      (payload.cessValue || 0)
    ).toFixed(2)
  )

  const mainHsn = payload.itemList?.[0]?.hsnCode || "9999"

  const qrPayload = formatEwayBillQrPayload({
    ewayBillNo,
    docNo: payload.docNo,
    docDate: payload.docDate,
    genGstin: payload.fromGstin,
    fromGstin: payload.fromGstin,
    toGstin: payload.toGstin,
    totalValue: totInvValue,
    mainHsn,
  })

  const newBill: EwayBillRecord = {
    id: `ewb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ewayBillNo,
    invoiceId: payload.invoiceId || null,
    invoiceNumber: payload.docNo,
    supplyType: payload.supplyType,
    subSupplyType: payload.subSupplyType,
    docType: payload.docType,
    docNo: payload.docNo,
    docDate: payload.docDate,
    status: "ACTIVE",
    generatedAt: generatedAt.toISOString(),
    validFrom: validity.validFrom.toISOString(),
    validUntil: validity.validUntil.toISOString(),
    validityDays: validity.validityDays,
    approxDistanceKm: validity.approxDistanceKm,
    isExpired: false,
    hoursRemaining: validity.hoursRemaining,

    fromGstin: payload.fromGstin,
    fromTrdName: payload.fromTrdName,
    fromAddr1: payload.fromAddr1,
    fromAddr2: payload.fromAddr2,
    fromPlace: payload.fromPlace,
    fromPincode: Number(payload.fromPincode),
    fromStateCode: Number(payload.fromStateCode),

    toGstin: payload.toGstin,
    toTrdName: payload.toTrdName,
    toAddr1: payload.toAddr1,
    toAddr2: payload.toAddr2,
    toPlace: payload.toPlace,
    toPincode: Number(payload.toPincode),
    toStateCode: Number(payload.toStateCode),

    totalValue: Number(payload.totalValue.toFixed(2)),
    cgstValue: Number(payload.cgstValue.toFixed(2)),
    sgstValue: Number(payload.sgstValue.toFixed(2)),
    igstValue: Number(payload.igstValue.toFixed(2)),
    cessValue: Number((payload.cessValue || 0).toFixed(2)),
    totInvValue,
    mainHsn,
    itemList: payload.itemList,

    transMode: payload.transMode,
    vehicleNo: cleanVehicleNo,
    vehicleType,
    transporterId: payload.transporterId || "",
    transporterName: payload.transporterName || "",
    transDocNo: payload.transDocNo || "",
    transDocDate: payload.transDocDate || "",
    vehicleUpdateHistory: cleanVehicleNo
      ? [
          {
            vehicleNo: cleanVehicleNo,
            vehicleType,
            updatedAt: generatedAt.toISOString(),
            reason: "First Assignment at Dispatch",
            fromPlace: payload.fromPlace,
            transDocNo: payload.transDocNo,
          },
        ]
      : [],

    qrPayload,
  }

  // Persist to tenant settings
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  })
  const currentSettings = (tenant?.settings as Record<string, any>) || {}
  const currentBills: EwayBillRecord[] = Array.isArray(currentSettings.ewayBills) ? currentSettings.ewayBills : []

  const updatedBills = [newBill, ...currentBills]

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      settings: {
        ...currentSettings,
        ewayBills: updatedBills,
      },
    },
  })

  // If linked to invoice, tag the invoice with EWB Number
  if (payload.invoiceId) {
    try {
      const inv = await prisma.invoice.findUnique({
        where: { id: payload.invoiceId },
        select: { billTo: true, notes: true },
      })
      if (inv) {
        const billTo = (inv.billTo as Record<string, any>) || {}
        await prisma.invoice.update({
          where: { id: payload.invoiceId },
          data: {
            billTo: {
              ...billTo,
              ewayBillNo,
              ewayBillGeneratedAt: generatedAt.toISOString(),
              ewayBillValidUntil: validity.validUntil.toISOString(),
            },
          },
        })
      }
    } catch (e) {
      console.error("Failed to tag invoice with ewayBillNo:", e)
    }
  }

  revalidatePath("/sales/eway-bills")
  if (payload.invoiceId) {
    revalidatePath(`/sales/invoices/${payload.invoiceId}`)
  }

  return { success: true, ewayBill: newBill }
}

/**
 * Updates Part-B vehicle / transporter during transit (Rule 138(5)).
 */
export async function updateEwayBillVehicle(
  ewayBillId: string,
  payload: {
    vehicleNo: string
    vehicleType?: EwayVehicleTypeCode
    fromPlace: string
    reason: string // e.g. "Break Down", "Transshipment", "Others"
    transDocNo?: string
  }
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getTenantId()

  const vRes = validateVehicleNumber(payload.vehicleNo)
  if (!vRes.isValid) {
    return { success: false, error: vRes.error }
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  })
  const currentSettings = (tenant?.settings as Record<string, any>) || {}
  const currentBills: EwayBillRecord[] = Array.isArray(currentSettings.ewayBills) ? currentSettings.ewayBills : []

  const targetIndex = currentBills.findIndex((b) => b.id === ewayBillId || b.ewayBillNo === ewayBillId)
  if (targetIndex === -1) {
    return { success: false, error: "E-Way Bill record not found." }
  }

  const bill = currentBills[targetIndex]
  if (bill.status === "CANCELLED") {
    return { success: false, error: "Cannot update vehicle for a cancelled E-Way Bill." }
  }

  const cleanVehicleNo = payload.vehicleNo.replace(/[\s-]/g, "").toUpperCase()
  const historyEntry: VehicleUpdateRecord = {
    vehicleNo: cleanVehicleNo,
    vehicleType: payload.vehicleType || bill.vehicleType,
    updatedAt: new Date().toISOString(),
    reason: payload.reason,
    fromPlace: payload.fromPlace,
    transDocNo: payload.transDocNo,
  }

  const updatedBill: EwayBillRecord = {
    ...bill,
    vehicleNo: cleanVehicleNo,
    vehicleType: payload.vehicleType || bill.vehicleType,
    vehicleUpdateHistory: [historyEntry, ...(bill.vehicleUpdateHistory || [])],
  }

  currentBills[targetIndex] = updatedBill

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      settings: {
        ...currentSettings,
        ewayBills: currentBills,
      },
    },
  })

  revalidatePath("/sales/eway-bills")
  return { success: true }
}

/**
 * Cancels an E-Way Bill within the statutory 24-hour window (Rule 138(9)).
 */
export async function cancelEwayBill(
  ewayBillId: string,
  cancelReason: string,
  cancelRemark?: string
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getTenantId()

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  })
  const currentSettings = (tenant?.settings as Record<string, any>) || {}
  const currentBills: EwayBillRecord[] = Array.isArray(currentSettings.ewayBills) ? currentSettings.ewayBills : []

  const targetIndex = currentBills.findIndex((b) => b.id === ewayBillId || b.ewayBillNo === ewayBillId)
  if (targetIndex === -1) {
    return { success: false, error: "E-Way Bill not found." }
  }

  const bill = currentBills[targetIndex]
  if (bill.status === "CANCELLED") {
    return { success: false, error: "This E-Way Bill is already cancelled." }
  }

  // Statutory check: Must be within 24 hours of generation
  const generatedTime = new Date(bill.generatedAt).getTime()
  const now = Date.now()
  const elapsedHours = (now - generatedTime) / (1000 * 60 * 60)

  if (elapsedHours > 24) {
    return {
      success: false,
      error: `Statutory 24-hour cancellation window exceeded (${elapsedHours.toFixed(1)} hours elapsed). Per Rule 138(9), E-Way Bills cannot be cancelled after 24 hours.`,
    }
  }

  const updatedBill: EwayBillRecord = {
    ...bill,
    status: "CANCELLED",
    cancelledAt: new Date().toISOString(),
    cancelReason,
    cancelRemark: cancelRemark || "",
  }

  currentBills[targetIndex] = updatedBill

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      settings: {
        ...currentSettings,
        ewayBills: currentBills,
      },
    },
  })

  revalidatePath("/sales/eway-bills")
  if (bill.invoiceId) {
    revalidatePath(`/sales/invoices/${bill.invoiceId}`)
  }

  return { success: true }
}

/**
 * Exports selected E-Way Bills to official Government NIC Bulk Upload JSON format.
 */
export async function exportEwayBillNicJson(ids: string[]): Promise<{
  success: boolean
  jsonContent?: string
  filename?: string
  count?: number
  error?: string
}> {
  const tenantId = await getTenantId()
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  })
  const { bills } = getEwayStore(tenant?.settings)

  const selectedBills = ids.length === 0 ? bills : bills.filter((b) => ids.includes(b.id) || ids.includes(b.ewayBillNo))
  if (selectedBills.length === 0) {
    return { success: false, error: "No E-Way Bills selected for export." }
  }

  const nicPayload = buildNicBulkUploadJson(
    selectedBills.map((b) => ({
      supplyType: b.supplyType,
      subSupplyType: b.subSupplyType,
      docType: b.docType,
      docNo: b.docNo,
      docDate: b.docDate,
      fromGstin: b.fromGstin,
      fromTrdName: b.fromTrdName,
      fromAddr1: b.fromAddr1,
      fromAddr2: b.fromAddr2,
      fromPlace: b.fromPlace,
      fromPincode: b.fromPincode,
      fromStateCode: b.fromStateCode,
      toGstin: b.toGstin,
      toTrdName: b.toTrdName,
      toAddr1: b.toAddr1,
      toAddr2: b.toAddr2,
      toPlace: b.toPlace,
      toPincode: b.toPincode,
      toStateCode: b.toStateCode,
      totalValue: b.totalValue,
      cgstValue: b.cgstValue,
      sgstValue: b.sgstValue,
      igstValue: b.igstValue,
      cessValue: b.cessValue,
      transMode: b.transMode,
      transDistance: b.approxDistanceKm,
      transporterId: b.transporterId,
      transporterName: b.transporterName,
      transDocNo: b.transDocNo,
      transDocDate: b.transDocDate,
      vehicleNo: b.vehicleNo,
      vehicleType: b.vehicleType,
      itemList: b.itemList,
    }))
  )

  const jsonContent = JSON.stringify(nicPayload, null, 2)
  const filename = `EWAY_BILLS_NIC_BULK_${new Date().toISOString().split("T")[0]}.json`

  return {
    success: true,
    jsonContent,
    filename,
    count: selectedBills.length,
  }
}

/**
 * Saves or updates a transporter profile.
 */
export async function saveTransporter(
  transporter: Omit<TransporterRecord, "id"> & { id?: string }
): Promise<{ success: boolean; transporter?: TransporterRecord; error?: string }> {
  const tenantId = await getTenantId()

  const tRes = validateTransporterId(transporter.gstin)
  if (!tRes.isValid) {
    return { success: false, error: tRes.error }
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  })
  const currentSettings = (tenant?.settings as Record<string, any>) || {}
  const { transporters } = getEwayStore(tenant?.settings)

  let updatedList = [...transporters]
  const id = transporter.id || `trans-${Date.now()}`
  const existingIdx = updatedList.findIndex((t) => t.id === id)

  const savedRecord: TransporterRecord = {
    id,
    name: transporter.name.trim(),
    gstin: transporter.gstin.trim().toUpperCase(),
    phone: transporter.phone?.trim() || "",
    contactPerson: transporter.contactPerson?.trim() || "",
  }

  if (existingIdx >= 0) {
    updatedList[existingIdx] = savedRecord
  } else {
    updatedList.push(savedRecord)
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      settings: {
        ...currentSettings,
        ewayTransporters: updatedList,
      },
    },
  })

  revalidatePath("/sales/eway-bills")
  return { success: true, transporter: savedRecord }
}
