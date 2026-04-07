/**
 * TaxInvoice.tsx
 * @react-pdf/renderer — GST-compliant Indian Tax Invoice.
 * Renders both intra-state (CGST+SGST) and inter-state (IGST) invoices.
 */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer"
import type { InvoiceDB, InvoiceLineItemDB } from "@/app/actions/sales/invoices"
import { computeInvoiceGstSummary, computeHsnSummary } from "@/lib/gst-engine"
import { COMPANY } from "@/lib/constants/company"
import { getCurrencySymbol } from "@/lib/utils"

// ─── Styles ──────────────────────────────────────────────────────────────────
const colors = {
  primary: "#1e40af",   // blue-800
  light: "#eff6ff",     // blue-50
  border: "#cbd5e1",    // slate-300
  muted: "#64748b",     // slate-500
  text: "#0f172a",      // slate-900
  white: "#ffffff",
}

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8,
    color: colors.text,
    padding: 32,
    lineHeight: 1.4,
  },
  // ── Header
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: `1.5 solid ${colors.primary}`,
  },
  companyName: { fontSize: 16, fontFamily: "Helvetica-Bold", color: colors.primary },
  companyAddress: { fontSize: 7.5, color: colors.muted, marginTop: 2 },
  companyGstin: { fontSize: 7.5, color: colors.muted },
  invoiceLabel: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
    textAlign: "right",
  },
  invoiceMeta: { fontSize: 8, textAlign: "right", color: colors.muted, marginTop: 4 },
  invoiceMetaValue: { color: colors.text, fontFamily: "Helvetica-Bold" },
  // ── Party Info
  partiesRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  partyBox: {
    flex: 1,
    border: `1 solid ${colors.border}`,
    borderRadius: 4,
    padding: 8,
  },
  partyLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  partyName: { fontSize: 9, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  partyDetail: { fontSize: 7.5, color: colors.muted, marginBottom: 1 },
  // ── Table
  table: { marginBottom: 12 },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRadius: 3,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottom: `0.5 solid ${colors.border}`,
  },
  tableRowAlt: { backgroundColor: colors.light },
  thText: { color: colors.white, fontFamily: "Helvetica-Bold", fontSize: 7 },
  tdText: { fontSize: 7.5 },
  // column widths (% of page width)
  colSr: { width: "4%" },
  colName: { width: "18%" },
  colHsn: { width: "8%" },
  colQty: { width: "5%", textAlign: "right" },
  colPrice: { width: "9%", textAlign: "right" },
  colTaxable: { width: "9%", textAlign: "right" },
  colGstPct: { width: "5%", textAlign: "right" },
  colGstAmt: { width: "8%", textAlign: "right" },
  colTotal: { width: "10%", textAlign: "right" },
  // ── Summary
  summarySection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 12,
  },
  gstBox: {
    flex: 1,
    border: `1 solid ${colors.border}`,
    borderRadius: 4,
    padding: 8,
  },
  gstBoxTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: colors.muted,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  gstRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  gstLabel: { fontSize: 7.5, color: colors.muted },
  gstValue: { fontSize: 7.5, fontFamily: "Helvetica-Bold" },
  totalsBox: {
    width: "42%",
    border: `1 solid ${colors.border}`,
    borderRadius: 4,
    padding: 8,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  totalLabel: { fontSize: 8, color: colors.muted },
  totalValue: { fontSize: 8, fontFamily: "Helvetica-Bold" },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.primary,
    padding: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  grandTotalLabel: { fontSize: 9, color: colors.white, fontFamily: "Helvetica-Bold" },
  grandTotalValue: { fontSize: 9, color: colors.white, fontFamily: "Helvetica-Bold" },
  // ── Amount in words
  amountWords: {
    fontSize: 7.5,
    color: colors.muted,
    fontStyle: "italic",
    marginBottom: 12,
    padding: 6,
    backgroundColor: colors.light,
    borderRadius: 3,
  },
  // ── HSN Summary Table
  hsnTable: { marginBottom: 16 },
  hsnHeader: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderBottom: `1 solid ${colors.border}`,
    paddingVertical: 4,
  },
  hsnRow: {
    flexDirection: "row",
    borderBottom: `0.5 solid ${colors.border}`,
    paddingVertical: 3,
  },
  hsnCol: { fontSize: 7, color: colors.muted },
  hsnColHsn: { width: "20%" },
  hsnColTaxable: { width: "20%", textAlign: "right" },
  hsnColRate: { width: "15%", textAlign: "right" },
  hsnColAmt: { width: "20%", textAlign: "right" },
  hsnColTotal: { width: "25%", textAlign: "right" },

  // ── Bank Details Box
  bankDetailsBox: {
    border: `1 solid ${colors.border}`,
    borderRadius: 4,
    padding: 8,
    marginBottom: 14,
    width: "60%",
  },
  bankRow: { flexDirection: "row", marginBottom: 2 },
  bankLabel: { fontSize: 7, width: "30%", color: colors.muted },
  bankValue: { fontSize: 7, fontFamily: "Helvetica-Bold" },
  // ── Notes / T&C
  sectionTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: colors.muted,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  sectionText: { fontSize: 7.5, color: colors.muted, marginBottom: 10 },
  // ── Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 32,
    right: 32,
    borderTop: `0.5 solid ${colors.border}`,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 7, color: colors.muted },
})

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number | null | undefined): string {
  if (n == null) return "0.00"
  return n.toFixed(2)
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen"]
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

function numToWords(n: number, currencyCode: string = "INR"): string {
  const amount = Math.floor(n)
  const paise = Math.round((n - amount) * 100)
  
  const currencyName = currencyCode === "INR" ? "Rupees" : (currencyCode === "USD" ? "Dollars" : currencyCode)
  const subCurrencyName = currencyCode === "INR" ? "Paise" : (currencyCode === "USD" ? "Cents" : "Sub-units")

  function chunk(num: number): string {
    if (num === 0) return ""
    if (num < 20) return ONES[num] + " "
    if (num < 100) return TENS[Math.floor(num / 10)] + " " + ONES[num % 10] + " "
    return ONES[Math.floor(num / 100)] + " Hundred " + chunk(num % 100)
  }

  function convert(num: number): string {
    if (num === 0) return "Zero"
    let result = ""
    const cr = Math.floor(num / 10000000); num %= 10000000
    const lk = Math.floor(num / 100000); num %= 100000
    const th = Math.floor(num / 1000); num %= 1000
    const hu = Math.floor(num / 100); num %= 100
    if (cr) result += chunk(cr) + "Crore "
    if (lk) result += chunk(lk) + "Lakh "
    if (th) result += chunk(th) + "Thousand "
    if (hu) result += ONES[hu] + " Hundred "
    if (num) result += chunk(num)
    return result.trim()
  }

  let words = convert(amount) + " " + currencyName
  if (paise > 0) words += " and " + convert(paise) + " " + subCurrencyName
  return words + " Only"
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface TaxInvoiceProps {
  invoice: InvoiceDB
}

export function TaxInvoice({ invoice }: TaxInvoiceProps) {
  const items: InvoiceLineItemDB[] = invoice.invoice_line_items ?? []
  const supplyType = invoice.supply_type ?? "intra"
  const isIntra = supplyType === "intra"

  // Tenant/Supplier info with fallback to COMPANY
  const tenant = invoice.tenants
  // Default parsing for address if it's JSON
  let addressObj: Record<string, string> = {}
  try {
    if (typeof tenant?.address === "string") {
      addressObj = JSON.parse(tenant.address)
    } else if (tenant?.address && typeof tenant.address === "object") {
      addressObj = tenant.address
    }
  } catch(e) {}

  const supplierName = tenant?.name || COMPANY.name
  const supplierAddress = addressObj.street || COMPANY.address
  const supplierGstin = invoice.supplier_gstin || COMPANY.gstin
  const supplierState = invoice.supplier_state || COMPANY.state

  const summary = computeInvoiceGstSummary(
    items.map((li) => ({
      qty: li.qty,
      unitPrice: li.unit_price,
      gstRate: li.tax_percent,
    })),
    supplyType,
    invoice.discount ?? 0,
    invoice.discount_type ?? "PERCENT"
  )

  const currencySymbol = getCurrencySymbol(invoice.currency_code)

  const hsnSummaryList = computeHsnSummary(
    items.map((li) => ({
      qty: li.qty,
      unitPrice: li.unit_price,
      gstRate: li.tax_percent,
      hsnSac: li.hsn_sac,
    })),
    supplyType
  )

  // Bank Info from tenant.settings
  const bank = tenant?.settings?.bank_details || {}
  const hasBank = bank.bank_name && bank.account_number

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.headerRow}>
          <View>
            <Text style={s.companyName}>{supplierName}</Text>
            {supplierAddress ? <Text style={s.companyAddress}>{supplierAddress}</Text> : null}
            {supplierGstin ? <Text style={s.companyGstin}>GSTIN: {supplierGstin}</Text> : null}
          </View>
          <View>
            <Text style={s.invoiceLabel}>TAX INVOICE</Text>
            <Text style={s.invoiceMeta}>
              <Text>No: </Text>
              <Text style={s.invoiceMetaValue}>{invoice.invoice_number}</Text>
            </Text>
            <Text style={s.invoiceMeta}>
              <Text>Date: </Text>
              <Text style={s.invoiceMetaValue}>{fmtDate(invoice.invoice_date)}</Text>
            </Text>
            {invoice.valid_until && (
              <Text style={s.invoiceMeta}>
                <Text>Valid Until: </Text>
                <Text style={s.invoiceMetaValue}>{fmtDate(invoice.valid_until)}</Text>
              </Text>
            )}
            {invoice.reference && (
              <Text style={s.invoiceMeta}>
                <Text>Ref: </Text>
                <Text style={s.invoiceMetaValue}>{invoice.reference}</Text>
              </Text>
            )}
          </View>
        </View>

        {/* ── Party Details ── */}
        <View style={s.partiesRow}>
          {/* Supplier */}
          <View style={s.partyBox}>
            <Text style={s.partyLabel}>From (Supplier)</Text>
            <Text style={s.partyName}>{supplierName}</Text>
            {supplierAddress ? <Text style={s.partyDetail}>{supplierAddress}</Text> : null}
            {supplierGstin ? <Text style={s.partyDetail}>GSTIN: {supplierGstin}</Text> : null}
            <Text style={s.partyDetail}>State: {supplierState}</Text>
          </View>
          {/* Customer */}
          <View style={s.partyBox}>
            <Text style={s.partyLabel}>Bill To (Customer)</Text>
            <Text style={s.partyName}>{invoice.customer_name}</Text>
            {invoice.customer_email && (
              <Text style={s.partyDetail}>{invoice.customer_email}</Text>
            )}
            {invoice.customer_gstin && (
              <Text style={s.partyDetail}>GSTIN: {invoice.customer_gstin}</Text>
            )}
            <Text style={s.partyDetail}>
              Place of Supply: {invoice.place_of_supply || "—"}
            </Text>
            <Text style={s.partyDetail}>
              Supply Type: {isIntra ? "Intra-State (CGST + SGST)" : "Inter-State (IGST)"}
            </Text>
          </View>
        </View>

        {/* ── Line Items Table ── */}
        <View style={s.table}>
          {/* Header */}
          <View style={s.tableHeaderRow}>
            <Text style={[s.thText, s.colSr]}>#</Text>
            <Text style={[s.thText, s.colName]}>Item / Description</Text>
            <Text style={[s.thText, s.colHsn]}>HSN/SAC</Text>
            <Text style={[s.thText, s.colQty]}>Qty</Text>
            <Text style={[s.thText, s.colPrice]}>Rate</Text>
            <Text style={[s.thText, s.colTaxable]}>Taxable</Text>
            {isIntra ? (
              <>
                <Text style={[s.thText, s.colGstPct]}>CGST%</Text>
                <Text style={[s.thText, s.colGstAmt]}>CGST{currencySymbol}</Text>
                <Text style={[s.thText, s.colGstPct]}>SGST%</Text>
                <Text style={[s.thText, s.colGstAmt]}>SGST{currencySymbol}</Text>
              </>
            ) : (
              <>
                <Text style={[s.thText, s.colGstPct]}>IGST%</Text>
                <Text style={[s.thText, s.colGstAmt]}>IGST{currencySymbol}</Text>
              </>
            )}
            <Text style={[s.thText, s.colTotal]}>Total ({currencySymbol})</Text>
          </View>

          {/* Rows */}
          {items.map((item, idx) => {
            const taxable = item.qty * item.unit_price
            const rowTotal = taxable + item.cgst_amount + item.sgst_amount + item.igst_amount
            return (
              <View
                key={item.id}
                style={[s.tableRow, idx % 2 === 1 ? s.tableRowAlt : {}]}
              >
                <Text style={[s.tdText, s.colSr]}>{idx + 1}</Text>
                <Text style={[s.tdText, s.colName]}>
                  {item.product_name}
                  {item.description ? `\n${item.description}` : ""}
                </Text>
                <Text style={[s.tdText, s.colHsn]}>{item.hsn_sac || "—"}</Text>
                <Text style={[s.tdText, s.colQty]}>{item.qty}</Text>
                <Text style={[s.tdText, s.colPrice]}>{fmt(item.unit_price)}</Text>
                <Text style={[s.tdText, s.colTaxable]}>{fmt(taxable)}</Text>
                {isIntra ? (
                  <>
                    <Text style={[s.tdText, s.colGstPct]}>{fmt(item.cgst_percent)}</Text>
                    <Text style={[s.tdText, s.colGstAmt]}>{fmt(item.cgst_amount)}</Text>
                    <Text style={[s.tdText, s.colGstPct]}>{fmt(item.sgst_percent)}</Text>
                    <Text style={[s.tdText, s.colGstAmt]}>{fmt(item.sgst_amount)}</Text>
                  </>
                ) : (
                  <>
                    <Text style={[s.tdText, s.colGstPct]}>{fmt(item.igst_percent)}</Text>
                    <Text style={[s.tdText, s.colGstAmt]}>{fmt(item.igst_amount)}</Text>
                  </>
                )}
                <Text style={[s.tdText, s.colTotal]}>{fmt(rowTotal)}</Text>
              </View>
            )
          })}
        </View>

        {/* ── GST Summary + Totals ── */}
        <View style={s.summarySection}>
          {/* GST breakdown box */}
          <View style={s.gstBox}>
            <Text style={s.gstBoxTitle}>GST Summary</Text>
            {isIntra ? (
              <>
                <View style={s.gstRow}>
                  <Text style={s.gstLabel}>CGST</Text>
                  <Text style={s.gstValue}>{currencySymbol}{fmt(summary.cgstTotal)}</Text>
                </View>
                <View style={s.gstRow}>
                  <Text style={s.gstLabel}>SGST</Text>
                  <Text style={s.gstValue}>{currencySymbol}{fmt(summary.sgstTotal)}</Text>
                </View>
              </>
            ) : (
              <View style={s.gstRow}>
                <Text style={s.gstLabel}>IGST</Text>
                <Text style={s.gstValue}>{currencySymbol}{fmt(summary.igstTotal)}</Text>
              </View>
            )}
            <View style={[s.gstRow, { marginTop: 4, paddingTop: 4, borderTop: `0.5 solid ${colors.border}` }]}>
              <Text style={s.gstLabel}>Total Tax</Text>
              <Text style={s.gstValue}>{currencySymbol}{fmt(summary.totalTax)}</Text>
            </View>
          </View>

          {/* Totals box */}
          <View style={s.totalsBox}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Subtotal (Taxable)</Text>
              <Text style={s.totalValue}>{currencySymbol}{fmt(summary.subtotal)}</Text>
            </View>
            {summary.discountAmount > 0 && (
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>
                  Discount
                  {invoice.discount_type === "PERCENT" ? ` (${invoice.discount}%)` : ""}
                </Text>
                <Text style={s.totalValue}>-{currencySymbol}{fmt(summary.discountAmount)}</Text>
              </View>
            )}
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total Tax</Text>
              <Text style={s.totalValue}>{currencySymbol}{fmt(summary.totalTax)}</Text>
            </View>
            <View style={s.grandTotalRow}>
              <Text style={s.grandTotalLabel}>Grand Total</Text>
              <Text style={s.grandTotalValue}>₹{fmt(summary.grandTotal)}</Text>
            </View>
          </View>
        </View>

        {/* ── Amount in Words ── */}
        <Text style={s.amountWords}>
          Amount in Words: {numToWords(summary.grandTotal, invoice.currency_code)}
        </Text>

        {/* ── HSN Summary Table ── */}
        <View style={s.hsnTable}>
          <Text style={[s.gstBoxTitle, { marginBottom: 4 }]}>HSN/SAC Summary</Text>
          <View style={s.hsnHeader}>
            <Text style={[s.hsnCol, s.hsnColHsn, { paddingLeft: 4 }]}>HSN/SAC</Text>
            <Text style={[s.hsnCol, s.hsnColTaxable]}>Taxable Value</Text>
            {isIntra ? (
              <>
                <Text style={[s.hsnCol, s.hsnColAmt]}>CGST</Text>
                <Text style={[s.hsnCol, s.hsnColAmt]}>SGST</Text>
              </>
            ) : (
              <Text style={[s.hsnCol, s.hsnColAmt]}>IGST</Text>
            )}
            <Text style={[s.hsnCol, s.hsnColTotal, { paddingRight: 4 }]}>Total Tax</Text>
          </View>
          {hsnSummaryList.map((h, i) => (
            <View key={i} style={s.hsnRow}>
              <Text style={[s.hsnCol, s.hsnColHsn, { paddingLeft: 4 }]}>{h.hsnSac}</Text>
              <Text style={[s.hsnCol, s.hsnColTaxable]}>{currencySymbol}{fmt(h.taxableAmount)}</Text>
              {isIntra ? (
                <>
                  <Text style={[s.hsnCol, s.hsnColAmt]}>{currencySymbol}{fmt(h.cgstAmount)}</Text>
                  <Text style={[s.hsnCol, s.hsnColAmt]}>{currencySymbol}{fmt(h.sgstAmount)}</Text>
                </>
              ) : (
                <Text style={[s.hsnCol, s.hsnColAmt]}>{currencySymbol}{fmt(h.igstAmount)}</Text>
              )}
              <Text style={[s.hsnCol, s.hsnColTotal, { paddingRight: 4 }]}>{currencySymbol}{fmt(h.totalTaxAmount)}</Text>
            </View>
          ))}
        </View>

        {/* ── Bank Details ── */}
        {hasBank && (
          <View style={s.bankDetailsBox}>
            <Text style={s.gstBoxTitle}>Bank Details for Payment</Text>
            <View style={s.bankRow}>
              <Text style={s.bankLabel}>Bank Name:</Text>
              <Text style={s.bankValue}>{bank.bank_name}</Text>
            </View>
            <View style={s.bankRow}>
              <Text style={s.bankLabel}>Account No:</Text>
              <Text style={s.bankValue}>{bank.account_number}</Text>
            </View>
            <View style={s.bankRow}>
              <Text style={s.bankLabel}>IFSC Code:</Text>
              <Text style={s.bankValue}>{bank.ifsc_code}</Text>
            </View>
            {bank.branch_name && (
              <View style={s.bankRow}>
                <Text style={s.bankLabel}>Branch:</Text>
                <Text style={s.bankValue}>{bank.branch_name}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Notes ── */}
        {invoice.notes ? (
          <>
            <Text style={s.sectionTitle}>Notes</Text>
            <Text style={s.sectionText}>{invoice.notes}</Text>
          </>
        ) : null}

        {/* ── Terms & Conditions ── */}
        {invoice.terms_and_conditions ? (
          <>
            <Text style={s.sectionTitle}>Terms & Conditions</Text>
            <Text style={s.sectionText}>{invoice.terms_and_conditions}</Text>
          </>
        ) : null}

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            This is a computer-generated invoice and does not require a physical signature.
          </Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          } />
        </View>

      </Page>
    </Document>
  )
}
