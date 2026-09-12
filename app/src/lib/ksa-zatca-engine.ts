/**
 * ksa-zatca-engine.ts
 * Pure TypeScript Statutory Engine for Saudi Arabia (KSA) VAT (15%),
 * ZATCA E-Invoicing (Fatoora Phase 1 & 2), TLV Base64 QR Code, and Zakat Calculation.
 *
 * Statutory References:
 * - Royal Order No. (A/638) raising VAT to 15%
 * - ZATCA E-Invoicing Regulations (Resolution No. 19804)
 * - ZATCA TLV QR Code Encoding Specifications
 * - Zakat Regulations (Ministerial Resolution No. 2216)
 */

// ── Statutory Rates & Constants ────────────────────────────────────────────────

export const KSA_STANDARD_VAT_RATE = 15.0 // 15% Standard Rate
export const ZAKAT_RATE_HIJRI = 2.5 // 2.50% for 354-day lunar Hijri year
export const ZAKAT_RATE_GREGORIAN = 2.5775 // 2.5775% for 365-day solar Gregorian year

export type KsaInvoiceType = "STANDARD" | "SIMPLIFIED" // Standard (B2B) vs Simplified (B2C)

// ── ZATCA VAT Number Validator ────────────────────────────────────────────────

export interface KsaVatValidationResult {
  isValid: boolean
  formattedVatNumber: string
  error?: string
}

/**
 * Validates a Saudi Arabian VAT Identification Number per ZATCA:
 * - Exactly 15 digits
 * - Must start with '3'
 * - Must end with '3'
 * Pattern: ^3\d{13}3$
 */
export function validateKsaVatNumber(vatInput?: string | null): KsaVatValidationResult {
  if (!vatInput) {
    return {
      isValid: false,
      formattedVatNumber: "",
      error: "VAT number cannot be empty.",
    }
  }

  const clean = vatInput.replace(/[\s-]/g, "").trim()

  if (!/^\d+$/.test(clean)) {
    return {
      isValid: false,
      formattedVatNumber: clean,
      error: "VAT number must contain numeric digits only.",
    }
  }

  if (clean.length !== 15) {
    return {
      isValid: false,
      formattedVatNumber: clean,
      error: `KSA VAT number must be exactly 15 digits (currently ${clean.length}).`,
    }
  }

  if (!clean.startsWith("3")) {
    return {
      isValid: false,
      formattedVatNumber: clean,
      error: "KSA VAT number must start with digit '3'.",
    }
  }

  if (!clean.endsWith("3")) {
    return {
      isValid: false,
      formattedVatNumber: clean,
      error: "KSA VAT number must end with digit '3'.",
    }
  }

  return {
    isValid: true,
    formattedVatNumber: clean,
  }
}

// ── ZATCA TLV Base64 QR Code Encoding & Decoding ──────────────────────────────

export interface ZatcaTlvFields {
  sellerName: string // Tag 1 (اسم المورد)
  vatNumber: string // Tag 2 (الرقم الضريبي للمورد)
  invoiceTimestamp: string // Tag 3 (تاريخ ووقت الفاتورة) - ISO 8601 YYYY-MM-DDTHH:mm:ssZ
  invoiceTotal: number | string // Tag 4 (إجمالي الفاتورة مع الضريبة)
  vatTotal: number | string // Tag 5 (إجمالي ضريبة القيمة المضافة)
  xmlHash?: string // Tag 6 (Optional Phase 2 SHA-256 Hash)
  ecdsaSignature?: string // Tag 7 (Optional Phase 2 Digital Signature)
  ecdsaPublicKey?: string // Tag 8 (Optional Phase 2 Public Key)
  stampIdentifier?: string // Tag 9 (Optional Phase 2 Stamp Identifier)
}

export interface ZatcaDecodedTag {
  tag: number
  length: number
  value: string
  label: string
}

export interface ZatcaDecodedTlv {
  isValid: boolean
  tags: ZatcaDecodedTag[]
  sellerName?: string
  vatNumber?: string
  invoiceTimestamp?: string
  invoiceTotal?: number
  vatTotal?: number
  error?: string
}

const TAG_LABELS: Record<number, string> = {
  1: "Seller's Name (اسم المورد)",
  2: "Seller's VAT Number (الرقم الضريبي للمورد)",
  3: "Invoice Timestamp (تاريخ ووقت الفاتورة)",
  4: "Invoice Total with VAT (إجمالي الفاتورة مع الضريبة)",
  5: "VAT Total (إجمالي ضريبة القيمة المضافة)",
  6: "XML SHA-256 Hash (تشفير الفاتورة)",
  7: "Cryptographic Stamp (الختم الرقمي)",
  8: "Public Key (المفتاح العام)",
  9: "Stamp Identifier (معرف الختم الرقمي)",
}

/**
 * Encodes invoice fields into a ZATCA TLV (Tag-Length-Value) Base64 string.
 */
export function encodeZatcaTlv(fields: ZatcaTlvFields): string {
  const chunks: Buffer[] = []

  const appendTag = (tagNumber: number, valueStr: string) => {
    const valueBuffer = Buffer.from(valueStr, "utf8")
    const tagBuffer = Buffer.from([tagNumber])
    const lengthBuffer = Buffer.from([valueBuffer.length])
    chunks.push(tagBuffer, lengthBuffer, valueBuffer)
  }

  // Tag 1: Seller's Name
  appendTag(1, fields.sellerName)

  // Tag 2: Seller's VAT Registration Number
  appendTag(2, fields.vatNumber.replace(/[\s-]/g, ""))

  // Tag 3: Invoice Timestamp (ISO 8601)
  appendTag(3, fields.invoiceTimestamp)

  // Tag 4: Invoice Total (with VAT) formatted to 2 decimals
  const totalVal = typeof fields.invoiceTotal === "number" 
    ? fields.invoiceTotal.toFixed(2) 
    : parseFloat(fields.invoiceTotal || "0").toFixed(2)
  appendTag(4, totalVal)

  // Tag 5: Total VAT Amount formatted to 2 decimals
  const vatVal = typeof fields.vatTotal === "number" 
    ? fields.vatTotal.toFixed(2) 
    : parseFloat(fields.vatTotal || "0").toFixed(2)
  appendTag(5, vatVal)

  // Optional Phase 2 Tags
  if (fields.xmlHash) appendTag(6, fields.xmlHash)
  if (fields.ecdsaSignature) appendTag(7, fields.ecdsaSignature)
  if (fields.ecdsaPublicKey) appendTag(8, fields.ecdsaPublicKey)
  if (fields.stampIdentifier) appendTag(9, fields.stampIdentifier)

  const combined = Buffer.concat(chunks)
  return combined.toString("base64")
}

/**
 * Decodes a ZATCA TLV Base64 string back into structured tags and inspects values.
 */
export function decodeZatcaTlv(base64String: string): ZatcaDecodedTlv {
  try {
    const buffer = Buffer.from(base64String.trim(), "base64")
    if (buffer.length < 5) {
      return {
        isValid: false,
        tags: [],
        error: "Buffer too short to contain valid TLV data.",
      }
    }

    const tags: ZatcaDecodedTag[] = []
    let offset = 0

    let sellerName: string | undefined
    let vatNumber: string | undefined
    let invoiceTimestamp: string | undefined
    let invoiceTotal: number | undefined
    let vatTotal: number | undefined

    while (offset < buffer.length) {
      if (offset + 2 > buffer.length) break

      const tag = buffer[offset]
      const length = buffer[offset + 1]
      offset += 2

      if (offset + length > buffer.length) {
        return {
          isValid: false,
          tags,
          error: `Corrupted TLV payload: tag ${tag} declares length ${length}, but buffer truncated.`,
        }
      }

      const valueBuffer = buffer.subarray(offset, offset + length)
      const value = valueBuffer.toString("utf8")
      offset += length

      tags.push({
        tag,
        length,
        value,
        label: TAG_LABELS[tag] || `Tag ${tag}`,
      })

      if (tag === 1) sellerName = value
      else if (tag === 2) vatNumber = value
      else if (tag === 3) invoiceTimestamp = value
      else if (tag === 4) invoiceTotal = parseFloat(value)
      else if (tag === 5) vatTotal = parseFloat(value)
    }

    const hasAllMandatory = !!(sellerName && vatNumber && invoiceTimestamp && invoiceTotal !== undefined && vatTotal !== undefined)
    const vatValid = vatNumber ? validateKsaVatNumber(vatNumber).isValid : false

    return {
      isValid: hasAllMandatory && vatValid,
      tags,
      sellerName,
      vatNumber,
      invoiceTimestamp,
      invoiceTotal,
      vatTotal,
      error: !hasAllMandatory 
        ? "Missing one or more mandatory tags (1 to 5)."
        : !vatValid 
        ? "Seller VAT Number in Tag 2 does not meet 15-digit 3...3 statutory rules." 
        : undefined,
    }
  } catch (err: any) {
    return {
      isValid: false,
      tags: [],
      error: `Failed to decode Base64 TLV: ${err.message}`,
    }
  }
}

// ── ZATCA UBL 2.1 E-Invoicing XML Generator ───────────────────────────────────

export interface ZatcaXmlLineItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
  vatRate: number // usually 15.0 or 0.0
  vatAmount: number
  lineTotal: number
}

export interface ZatcaXmlPayload {
  invoiceNumber: string
  invoiceUuid: string
  invoiceDate: string // YYYY-MM-DD
  invoiceTime: string // HH:mm:ss
  invoiceType: KsaInvoiceType // STANDARD or SIMPLIFIED
  seller: {
    legalName: string
    vatNumber: string
    street: string
    buildingNumber?: string
    postalZone: string
    city: string
    district?: string
  }
  buyer?: {
    legalName: string
    vatNumber?: string | null
    street?: string
    city?: string
    district?: string
    postalZone?: string
  } | null
  subtotal: number
  vatAmount: number
  total: number
  items: ZatcaXmlLineItem[]
  tlvQrBase64?: string
}

/**
 * Generates official ZATCA-compliant UBL 2.1 XML document structure.
 */
export function generateZatcaUblXml(data: ZatcaXmlPayload): string {
  const subtypeCode = data.invoiceType === "STANDARD" ? "0100000" : "0200000"

  const escapeXml = (unsafe: string = "") =>
    unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;")

  let linesXml = ""
  data.items.forEach((item, index) => {
    linesXml += `
  <cac:InvoiceLine>
    <cbc:ID>${index + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="PCE">${item.quantity.toFixed(2)}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="SAR">${item.lineTotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="SAR">${item.vatAmount.toFixed(2)}</cbc:TaxAmount>
      <cbc:RoundingAmount currencyID="SAR">${(item.lineTotal + item.vatAmount).toFixed(2)}</cbc:RoundingAmount>
    </cac:TaxTotal>
    <cac:Item>
      <cbc:Name>${escapeXml(item.name)}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>${item.vatRate > 0 ? "S" : "Z"}</cbc:ID>
        <cbc:Percent>${item.vatRate.toFixed(2)}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="SAR">${item.unitPrice.toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`
  })

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
  <cbc:ID>${escapeXml(data.invoiceNumber)}</cbc:ID>
  <cbc:UUID>${escapeXml(data.invoiceUuid)}</cbc:UUID>
  <cbc:IssueDate>${data.invoiceDate}</cbc:IssueDate>
  <cbc:IssueTime>${data.invoiceTime}</cbc:IssueTime>
  <cbc:InvoiceTypeCode name="${subtypeCode}">388</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>SAR</cbc:TaxCurrencyCode>

  <!-- Accounting Supplier Party (المورد) -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="CRN">${escapeXml(data.seller.vatNumber)}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(data.seller.street)}</cbc:StreetName>
        <cbc:BuildingNumber>${escapeXml(data.seller.buildingNumber || "1234")}</cbc:BuildingNumber>
        <cbc:CitySubdivisionName>${escapeXml(data.seller.district || "Central")}</cbc:CitySubdivisionName>
        <cbc:CityName>${escapeXml(data.seller.city)}</cbc:CityName>
        <cbc:PostalZone>${escapeXml(data.seller.postalZone)}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>SA</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(data.seller.vatNumber)}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(data.seller.legalName)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <!-- Accounting Customer Party (العميل) -->
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(data.buyer?.street || "King Fahd Road")}</cbc:StreetName>
        <cbc:CityName>${escapeXml(data.buyer?.city || "Riyadh")}</cbc:CityName>
        <cbc:PostalZone>${escapeXml(data.buyer?.postalZone || "11564")}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>SA</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      ${
        data.buyer?.vatNumber
          ? `
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(data.buyer.vatNumber)}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>`
          : ""
      }
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(data.buyer?.legalName || "Walk-in Customer")}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <!-- Tax Total (إجمالي الضريبة) -->
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="SAR">${data.vatAmount.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="SAR">${data.subtotal.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="SAR">${data.vatAmount.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>15.00</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>

  <!-- Legal Monetary Total (المبالغ الإجمالية) -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="SAR">${data.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="SAR">${data.subtotal.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="SAR">${data.total.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="SAR">${data.total.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${linesXml}
</Invoice>`
}

// ── KSA VAT Return & Quarterly Tax Period ──────────────────────────────────────

export interface KsaTaxPeriod {
  year: number
  quarter: "Q1" | "Q2" | "Q3" | "Q4"
  quarterLabel: string // e.g. "Q3 2026 (Jul–Sep)"
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  dueDate: string // YYYY-MM-DD (Last day of the month following the period)
  periodKey: string // "2026-Q3"
}

export function getKsaVatPeriod(year: number, quarter: "Q1" | "Q2" | "Q3" | "Q4"): KsaTaxPeriod {
  let startDate = ""
  let endDate = ""
  let dueDate = ""
  let quarterLabel = ""

  switch (quarter) {
    case "Q1":
      startDate = `${year}-01-01`
      endDate = `${year}-03-31`
      dueDate = `${year}-04-30`
      quarterLabel = `Q1 ${year} (Jan–Mar)`
      break
    case "Q2":
      startDate = `${year}-04-01`
      endDate = `${year}-06-30`
      dueDate = `${year}-07-31`
      quarterLabel = `Q2 ${year} (Apr–Jun)`
      break
    case "Q3":
      startDate = `${year}-07-01`
      endDate = `${year}-09-30`
      dueDate = `${year}-10-31`
      quarterLabel = `Q3 ${year} (Jul–Sep)`
      break
    case "Q4":
      startDate = `${year}-10-01`
      endDate = `${year}-12-31`
      dueDate = `${year + 1}-01-31`
      quarterLabel = `Q4 ${year} (Oct–Dec)`
      break
  }

  return {
    year,
    quarter,
    quarterLabel,
    startDate,
    endDate,
    dueDate,
    periodKey: `${year}-${quarter}`,
  }
}

export interface RawKsaInvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  vatRate?: number | null
  vatAmount?: number | null
  lineTotal: number
}

export interface RawKsaInvoice {
  id: string
  invoiceNumber: string
  invoiceDate: string | Date
  type: string
  status: string
  subtotal: number
  taxAmount: number
  total: number
  contact?: {
    id?: string
    displayName?: string
    companyName?: string
    trn?: string | null // VAT Registration #
  } | null
  items: RawKsaInvoiceItem[]
}

export interface RawKsaBillItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  taxPercent: number
  taxAmount: number
  lineTotal: number
}

export interface RawKsaBill {
  id: string
  billNumber: string
  billDate: string | Date
  status: string
  subtotal: number
  taxAmount: number
  total: number
  notes?: string | null
  contact?: {
    id?: string
    displayName?: string
    companyName?: string
    trn?: string | null
  } | null
  items: RawKsaBillItem[]
}

export interface KsaVatReturnReport {
  period: KsaTaxPeriod
  taxpayerVatNumber: string
  taxpayerLegalName: string
  taxpayerAddress: string

  // VAT on Sales (Outward)
  salesStandardRated: {
    taxableAmount: number
    vatAmount: number
    adjustments: number
  }
  salesZeroRatedExports: {
    taxableAmount: number
  }
  salesExempt: {
    taxableAmount: number
  }
  totalSalesTaxable: number
  totalOutputVat: number

  // VAT on Expenses (Inward)
  purchasesStandardRated: {
    taxableAmount: number
    recoverableVat: number
    adjustments: number
  }
  purchasesImports: {
    taxableAmount: number
    recoverableVat: number
  }
  totalPurchasesTaxable: number
  totalRecoverableInputVat: number

  // Net VAT
  netVatDue: number // Positive: Payable to ZATCA, Negative: Refundable

  summary: {
    standardInvoicesCount: number
    simplifiedInvoicesCount: number
    billsCount: number
    exportCount: number
    complianceRate: number
  }
}

/**
 * Compiles the official KSA VAT Return declaration from outward invoices and inward bills.
 */
export function compileKsaVatReturn(params: {
  invoices: RawKsaInvoice[]
  bills: RawKsaBill[]
  taxpayerVatNumber: string
  taxpayerLegalName: string
  taxpayerAddress?: string
  year: number
  quarter: "Q1" | "Q2" | "Q3" | "Q4"
}): KsaVatReturnReport {
  const { invoices, bills, taxpayerVatNumber, taxpayerLegalName, taxpayerAddress, year, quarter } = params
  const period = getKsaVatPeriod(year, quarter)

  let salesStandardTaxable = 0
  let salesStandardVat = 0
  let salesZeroRatedTaxable = 0
  let salesExemptTaxable = 0

  let standardInvoicesCount = 0
  let simplifiedInvoicesCount = 0
  let exportCount = 0

  const validInvoices = invoices.filter((i) => i.status !== "CANCELLED" && i.type !== "PROFORMA")

  for (const inv of validInvoices) {
    const isExport = inv.type === "EXPORT" || (inv.contact?.displayName || "").toLowerCase().includes("export")
    const isExempt = inv.type === "EXEMPT" || (inv.contact?.displayName || "").toLowerCase().includes("exempt")
    const subtotal = Number(inv.subtotal || 0)
    const vat = Number(inv.taxAmount || 0)

    const buyerVat = (inv.contact?.trn || "").trim()
    const isB2B = validateKsaVatNumber(buyerVat).isValid

    if (isB2B) standardInvoicesCount++
    else simplifiedInvoicesCount++

    if (isExport) {
      salesZeroRatedTaxable += subtotal
      exportCount++
    } else if (isExempt) {
      salesExemptTaxable += subtotal
    } else {
      salesStandardTaxable += subtotal
      salesStandardVat += vat
    }
  }

  // Process Purchases
  let purchasesStandardTaxable = 0
  let purchasesStandardVat = 0
  let purchasesImportsTaxable = 0
  let purchasesImportsVat = 0

  const validBills = bills.filter((b) => b.status !== "VOID")

  for (const bill of validBills) {
    const notesLower = (bill.notes || "").toLowerCase()
    const isImport = notesLower.includes("import") || notesLower.includes("customs") || notesLower.includes("rcm")
    const bSubtotal = Number(bill.subtotal || 0)
    const bTax = Number(bill.taxAmount || 0)

    if (isImport) {
      purchasesImportsTaxable += bSubtotal
      purchasesImportsVat += bTax > 0 ? bTax : Math.round(bSubtotal * 0.15 * 100) / 100
    } else {
      purchasesStandardTaxable += bSubtotal
      purchasesStandardVat += bTax
    }
  }

  const totalSalesTaxable = Math.round((salesStandardTaxable + salesZeroRatedTaxable + salesExemptTaxable) * 100) / 100
  const totalOutputVat = Math.round(salesStandardVat * 100) / 100

  const totalPurchasesTaxable = Math.round((purchasesStandardTaxable + purchasesImportsTaxable) * 100) / 100
  const totalRecoverableInputVat = Math.round((purchasesStandardVat + purchasesImportsVat) * 100) / 100

  const netVatDue = Math.round((totalOutputVat - totalRecoverableInputVat) * 100) / 100

  const totalInvoices = standardInvoicesCount + simplifiedInvoicesCount
  const complianceRate = totalInvoices > 0 ? Math.round((standardInvoicesCount / totalInvoices) * 100) : 100

  return {
    period,
    taxpayerVatNumber: taxpayerVatNumber || "300123456789003",
    taxpayerLegalName: taxpayerLegalName || "Genesoft Technologies KSA LLC",
    taxpayerAddress: taxpayerAddress || "King Fahd Road, Riyadh, Saudi Arabia",
    salesStandardRated: {
      taxableAmount: Math.round(salesStandardTaxable * 100) / 100,
      vatAmount: totalOutputVat,
      adjustments: 0,
    },
    salesZeroRatedExports: {
      taxableAmount: Math.round(salesZeroRatedTaxable * 100) / 100,
    },
    salesExempt: {
      taxableAmount: Math.round(salesExemptTaxable * 100) / 100,
    },
    totalSalesTaxable,
    totalOutputVat,
    purchasesStandardRated: {
      taxableAmount: Math.round(purchasesStandardTaxable * 100) / 100,
      recoverableVat: Math.round(purchasesStandardVat * 100) / 100,
      adjustments: 0,
    },
    purchasesImports: {
      taxableAmount: Math.round(purchasesImportsTaxable * 100) / 100,
      recoverableVat: Math.round(purchasesImportsVat * 100) / 100,
    },
    totalPurchasesTaxable,
    totalRecoverableInputVat,
    netVatDue,
    summary: {
      standardInvoicesCount,
      simplifiedInvoicesCount,
      billsCount: validBills.length,
      exportCount,
      complianceRate,
    },
  }
}

// ── Zakat Calculation Engine ───────────────────────────────────────────────────

export interface ZakatCalculationInputs {
  calendarType: "HIJRI" | "GREGORIAN"
  paidUpCapital: number // رأس المال المدفوع
  retainedEarnings: number // الأرباح المبقاة
  statutoryReserves: number // الاحتياطي النظامي
  otherReserves?: number // احتياطيات أخرى
  longTermLiabilities: number // ديون طويلة الأجل
  provisions?: number // مخصصات خاضعة للوعاء
  adjustedNetProfit: number // صافي الربح المعدل للسنة
  netFixedAssets: number // صافي الأصول الثابتة (دفتري)
  longTermInvestments?: number // استثمارات خارجية طويلة الأجل
  constructionInProgress?: number // مشروعات قيد التنفيذ
  carriedForwardLosses?: number // خسائر مرحلة
}

export interface ZakatCalculationResult {
  calendarType: "HIJRI" | "GREGORIAN"
  zakatRate: number // 2.5% or 2.5775%
  totalAdditions: number // مجموع مكونات الوعاء الموجبة
  totalDeductions: number // مجموع حسومات الوعاء
  zakatBase: number // وعاء الزكاة
  adjustedNetProfit: number
  calculatedZakat: number // مقدار الزكاة المستحقة
  minimumZakatApplied: boolean
  effectiveRateLabel: string
}

/**
 * Calculates Zakat Base and Liability under Ministerial Resolution No. 2216.
 */
export function calculateZakatBase(inputs: ZakatCalculationInputs): ZakatCalculationResult {
  const {
    calendarType,
    paidUpCapital = 0,
    retainedEarnings = 0,
    statutoryReserves = 0,
    otherReserves = 0,
    longTermLiabilities = 0,
    provisions = 0,
    adjustedNetProfit = 0,
    netFixedAssets = 0,
    longTermInvestments = 0,
    constructionInProgress = 0,
    carriedForwardLosses = 0,
  } = inputs

  const totalAdditions =
    paidUpCapital +
    retainedEarnings +
    statutoryReserves +
    otherReserves +
    longTermLiabilities +
    provisions +
    (adjustedNetProfit > 0 ? adjustedNetProfit : 0)

  const totalDeductions =
    netFixedAssets +
    longTermInvestments +
    constructionInProgress +
    carriedForwardLosses

  const zakatBase = Math.max(0, totalAdditions - totalDeductions)
  const rate = calendarType === "HIJRI" ? ZAKAT_RATE_HIJRI : ZAKAT_RATE_GREGORIAN

  // If Zakat Base is lower than adjusted net profit, Zakat is assessed on adjusted net profit
  let taxableZakatableAmount = zakatBase
  let minimumZakatApplied = false

  if (zakatBase < adjustedNetProfit && adjustedNetProfit > 0) {
    taxableZakatableAmount = adjustedNetProfit
    minimumZakatApplied = true
  }

  const calculatedZakat = Math.round((taxableZakatableAmount * (rate / 100)) * 100) / 100

  return {
    calendarType,
    zakatRate: rate,
    totalAdditions: Math.round(totalAdditions * 100) / 100,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    zakatBase: Math.round(zakatBase * 100) / 100,
    adjustedNetProfit: Math.round(adjustedNetProfit * 100) / 100,
    calculatedZakat,
    minimumZakatApplied,
    effectiveRateLabel: calendarType === "HIJRI" ? "2.5% (Hijri)" : "2.5775% (Gregorian)",
  }
}

// ── Official Exporters (JSON & CSV) ────────────────────────────────────────────

export function formatKsaVatReturnJson(report: KsaVatReturnReport): object {
  return {
    authority: "ZATCA",
    form: "VAT_RETURN_DECLARATION",
    taxpayer: {
      vat_number: report.taxpayerVatNumber,
      legal_name: report.taxpayerLegalName,
      address: report.taxpayerAddress,
    },
    period: {
      key: report.period.periodKey,
      label: report.period.quarterLabel,
      start_date: report.period.startDate,
      end_date: report.period.endDate,
      due_date: report.period.dueDate,
    },
    vat_on_sales: {
      standard_rated_15_percent: report.salesStandardRated,
      zero_rated_exports: report.salesZeroRatedExports,
      exempt_sales: report.salesExempt,
      total_sales_taxable: report.totalSalesTaxable,
      total_output_vat: report.totalOutputVat,
    },
    vat_on_purchases: {
      standard_rated_15_percent: report.purchasesStandardRated,
      imports_subject_to_vat: report.purchasesImports,
      total_purchases_taxable: report.totalPurchasesTaxable,
      total_recoverable_input_vat: report.totalRecoverableInputVat,
    },
    net_vat_due: {
      amount: report.netVatDue,
      status: report.netVatDue >= 0 ? "PAYABLE_TO_ZATCA" : "REFUNDABLE_CREDIT",
    },
  }
}

export function formatKsaVatReturnCsv(report: KsaVatReturnReport): string {
  const lines: string[] = [
    `"ZATCA - KINGDOM OF SAUDI ARABIA VAT RETURN DECLARATION"`,
    `"Tax Registration Number (VAT #)","${report.taxpayerVatNumber}"`,
    `"Legal Name of Taxable Person","${report.taxpayerLegalName.replace(/"/g, '""')}"`,
    `"Tax Period","${report.period.quarterLabel}"`,
    `"Due Date","${report.period.dueDate}"`,
    `""`,
    `"VAT ON SALES (OUTPUTS)",,,`,
    `"Item Description","Taxable Amount (SAR)","Adjustment (SAR)","VAT Amount (SAR)"`,
    `"Standard Rated Sales (15%)",${report.salesStandardRated.taxableAmount.toFixed(2)},0.00,${report.salesStandardRated.vatAmount.toFixed(2)}`,
    `"Zero Rated Exports (0%)",${report.salesZeroRatedExports.taxableAmount.toFixed(2)},0.00,0.00`,
    `"Exempt Sales",${report.salesExempt.taxableAmount.toFixed(2)},0.00,0.00`,
    `"TOTAL SALES & OUTPUT VAT",${report.totalSalesTaxable.toFixed(2)},0.00,${report.totalOutputVat.toFixed(2)}`,
    `""`,
    `"VAT ON PURCHASES (INPUTS)",,,`,
    `"Standard Rated Domestic Purchases (15%)",${report.purchasesStandardRated.taxableAmount.toFixed(2)},0.00,${report.purchasesStandardRated.recoverableVat.toFixed(2)}`,
    `"Imports Subject to VAT Paid at Customs / RCM",${report.purchasesImports.taxableAmount.toFixed(2)},0.00,${report.purchasesImports.recoverableVat.toFixed(2)}`,
    `"TOTAL PURCHASES & RECOVERABLE VAT",${report.totalPurchasesTaxable.toFixed(2)},0.00,${report.totalRecoverableInputVat.toFixed(2)}`,
    `""`,
    `"NET VAT SUMMARY",,,`,
    `"Net VAT Payable / (Refundable Credit)",,,${report.netVatDue.toFixed(2)}`,
  ]

  return lines.join("\n")
}
