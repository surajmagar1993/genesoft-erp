"use client"

import React from "react"
import { TemplateProps, formatCurrency, formatDate, getInvoiceSummary } from "./template-common"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, ShieldCheck, Stamp, Building2, User, Calendar, Hash, MapPin } from "lucide-react"

export function TemplateModern({ invoice }: TemplateProps) {
    const {
        items,
        gstSummary,
        hsnSummary,
        companyName,
        companyLogo,
        companyGstin,
        companyAddress,
        companyPhone,
        companyEmail,
        isInterState,
        isSingle,
        taxLabel,
        taxIdLabel,
        docTitle: summaryDocTitle
    } = getInvoiceSummary(invoice)

    const isProforma = invoice.type === "PROFORMA"
    const docTitle = summaryDocTitle

    return (
        <div className="bg-white text-slate-900 font-sans p-8 max-w-4xl mx-auto rounded-xl shadow-xs border border-slate-200 print:border-0 print:shadow-none print:p-0 print:max-w-none">
            {/* Top Accent Ribbon */}
            <div className="h-2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-500 rounded-t-xl -mt-8 -mx-8 mb-6 print:rounded-none print:mt-0 print:mx-0" />

            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-200">
                <div>
                    <div className="flex items-center gap-2">
                        {companyLogo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={companyLogo} alt={companyName} className="h-11 max-w-[160px] object-contain" />
                        ) : (
                            <div className="h-9 w-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-xs">
                                {companyName.charAt(0)}
                            </div>
                        )}
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{companyName}</h1>
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3 text-slate-400" /> {companyAddress}
                            </p>
                        </div>
                    </div>
                    {companyGstin && (
                        <p className="text-xs font-mono text-slate-600 mt-2 bg-slate-100 px-2 py-0.5 rounded w-fit">
                            {taxIdLabel}: <span className="font-semibold text-slate-900">{companyGstin}</span>
                        </p>
                    )}
                </div>

                <div className="sm:text-right flex flex-col sm:items-end">
                    <div className="flex items-center gap-2">
                        <Badge className={`${isProforma ? "bg-amber-600" : "bg-indigo-600"} text-white hover:bg-indigo-700`}>
                            {docTitle}
                        </Badge>
                        <Badge variant="outline" className="border-slate-300 text-slate-700 text-xs">
                            {invoice.status}
                        </Badge>
                    </div>
                    <div className="mt-2 space-y-0.5">
                        <p className="text-sm font-bold font-mono text-indigo-950">
                            #{invoice.invoice_number}
                        </p>
                        <p className="text-xs text-slate-500">
                            Issued: <span className="font-medium text-slate-700">{formatDate(invoice.invoice_date, invoice.locale)}</span>
                        </p>
                        {invoice.valid_until && (
                            <p className="text-xs text-slate-500">
                                Due: <span className="font-medium text-slate-700">{formatDate(invoice.valid_until, invoice.locale)}</span>
                            </p>
                        )}
                        {!isSingle && invoice.place_of_supply && (
                            <p className="text-xs text-slate-500">
                                Place of Supply: <span className="font-medium text-slate-700">{invoice.place_of_supply}</span>
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Parties Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
                {/* Billed To */}
                <div className="p-4 rounded-lg bg-indigo-50/50 border border-indigo-100">
                    <p className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" /> Billed To (Client)
                    </p>
                    <p className="font-bold text-slate-900 text-sm">{invoice.customer_name}</p>
                    {invoice.customer_email && (
                        <p className="text-xs text-slate-600 mt-0.5">{invoice.customer_email}</p>
                    )}
                    {invoice.customer_gstin && (
                        <p className="text-xs font-mono text-slate-600 mt-1">
                            {taxIdLabel}: <span className="font-semibold text-slate-900">{invoice.customer_gstin}</span>
                        </p>
                    )}
                </div>

                {/* Shipped To / Dispatch */}
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                    <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" /> Shipped To / Supply Destination
                    </p>
                    <p className="font-medium text-slate-800 text-sm">{invoice.customer_name}</p>
                    {isSingle ? (
                        <p className="text-xs text-slate-500 mt-1">
                            Tax: <span className="font-medium text-slate-700">{taxLabel}</span>
                        </p>
                    ) : (
                        <>
                            <p className="text-xs text-slate-600 mt-0.5">
                                Place of Supply: {invoice.place_of_supply || "—"}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                Supply Nature: <span className="font-medium text-slate-700">{isInterState ? "Inter-State Supply (IGST)" : "Intra-State Supply (CGST + SGST)"}</span>
                            </p>
                        </>
                    )}
                </div>
            </div>

            {/* Line Items Table */}
            <div className="my-6 overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-indigo-900 text-white uppercase text-[10px] tracking-wider">
                        <tr>
                            <th className="py-2.5 px-3 w-10 text-center">#</th>
                            <th className="py-2.5 px-3">Item Description</th>
                            <th className="py-2.5 px-3 w-20 text-center">HSN/SAC</th>
                            <th className="py-2.5 px-3 w-16 text-right">Qty</th>
                            <th className="py-2.5 px-3 w-24 text-right">Rate</th>
                            <th className="py-2.5 px-3 w-20 text-right">{taxLabel} %</th>
                            <th className="py-2.5 px-3 w-28 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-4 text-center text-slate-400">No line items</td>
                            </tr>
                        ) : (
                            items.map((li, idx) => {
                                const rate = (li.cgst_percent || 0) + (li.sgst_percent || 0) + (li.igst_percent || 0) + (li.vat_percent || 0) || li.tax_percent || 0
                                const rowTotal = li.qty * li.unit_price
                                return (
                                    <tr key={li.id || idx} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-2.5 px-3 text-center text-slate-400">{idx + 1}</td>
                                        <td className="py-2.5 px-3 font-medium text-slate-900">
                                            {li.product_name}
                                            {li.description && (
                                                <p className="text-[11px] text-slate-500 font-normal mt-0.5">{li.description}</p>
                                            )}
                                        </td>
                                        <td className="py-2.5 px-3 text-center font-mono text-slate-600">{li.hsn_sac || "—"}</td>
                                        <td className="py-2.5 px-3 text-right font-medium text-slate-800">{li.qty}</td>
                                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                                            {formatCurrency(li.unit_price, invoice.currency_code)}
                                        </td>
                                        <td className="py-2.5 px-3 text-right text-slate-600">
                                            {li.is_exempt ? (
                                                <span className="text-emerald-600 font-semibold">Exempt</span>
                                            ) : (
                                                `${rate}%`
                                            )}
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-semibold text-slate-900 font-mono">
                                            {formatCurrency(rowTotal, invoice.currency_code)}
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Calculations & Totals Summary */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 my-6 pt-2">
                {/* Left side: HSN Summary table & Payment details */}
                <div className="w-full sm:w-7/12 space-y-4">
                    {!isSingle && hsnSummary.length > 0 && (
                        <div className="rounded border border-slate-200 overflow-hidden">
                            <div className="bg-slate-100 px-3 py-1.5 text-[10px] font-semibold text-slate-700 uppercase tracking-wider">
                                Tax Breakup Summary (HSN/SAC)
                            </div>
                            <table className="w-full text-[10px] text-left">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                    <tr>
                                        <th className="p-1.5 text-center">HSN</th>
                                        <th className="p-1.5 text-right">Taxable</th>
                                        {isInterState ? (
                                            <th className="p-1.5 text-right">IGST</th>
                                        ) : (
                                            <>
                                                <th className="p-1.5 text-right">CGST</th>
                                                <th className="p-1.5 text-right">SGST</th>
                                            </>
                                        )}
                                        <th className="p-1.5 text-right">Total Tax</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-mono">
                                    {hsnSummary.map((hsn, i) => (
                                        <tr key={i}>
                                            <td className="p-1.5 text-center">{hsn.hsnSac}</td>
                                            <td className="p-1.5 text-right">{formatCurrency(hsn.taxableAmount, invoice.currency_code)}</td>
                                            {isInterState ? (
                                                <td className="p-1.5 text-right">{formatCurrency(hsn.igstAmount, invoice.currency_code)}</td>
                                            ) : (
                                                <>
                                                    <td className="p-1.5 text-right">{formatCurrency(hsn.cgstAmount, invoice.currency_code)}</td>
                                                    <td className="p-1.5 text-right">{formatCurrency(hsn.sgstAmount, invoice.currency_code)}</td>
                                                </>
                                            )}
                                            <td className="p-1.5 text-right font-semibold">{formatCurrency(hsn.totalTaxAmount, invoice.currency_code)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {gstSummary.isTaxExempt && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800">
                            <p className="font-semibold">Statutory Tax Exemption Applied</p>
                            {gstSummary.taxExemptionReason && (
                                <p className="text-[11px] mt-0.5">Category: {gstSummary.taxExemptionReason}</p>
                            )}
                            {gstSummary.taxExemptionCertificate && (
                                <p className="text-[11px] mt-0.5 font-mono">Cert #: {gstSummary.taxExemptionCertificate}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Right side: Final Numbers */}
                <div className="w-full sm:w-5/12 bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                        <span>Taxable Subtotal</span>
                        <span className="font-mono">{formatCurrency(gstSummary.subtotal, invoice.currency_code)}</span>
                    </div>

                    {gstSummary.discountAmount > 0 && (
                        <div className="flex justify-between text-emerald-600 font-medium">
                            <span>Discount</span>
                            <span className="font-mono">- {formatCurrency(gstSummary.discountAmount, invoice.currency_code)}</span>
                        </div>
                    )}

                    {isSingle ? (
                        <div className="flex justify-between">
                            <span>{taxLabel}</span>
                            <span className="font-mono">{formatCurrency(gstSummary.vatTotal, invoice.currency_code)}</span>
                        </div>
                    ) : !isInterState  ? (
                        <>
                            <div className="flex justify-between text-slate-600">
                                <span>Central GST (CGST)</span>
                                <span className="font-mono">{formatCurrency(gstSummary.cgstTotal, invoice.currency_code)}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>State GST (SGST)</span>
                                <span className="font-mono">{formatCurrency(gstSummary.sgstTotal, invoice.currency_code)}</span>
                            </div>
                        </>
                    ) : (
                        <div className="flex justify-between text-slate-600">
                            <span>Integrated GST (IGST)</span>
                            <span className="font-mono">{formatCurrency(gstSummary.igstTotal, invoice.currency_code)}</span>
                        </div>
                    )}

                    <div className="pt-2 border-t border-slate-300 flex justify-between items-baseline">
                        <span className="text-sm font-bold text-slate-900">Grand Total</span>
                        <span className="text-base font-bold font-mono text-indigo-700">
                            {formatCurrency(gstSummary.grandTotal, invoice.currency_code)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Bottom Grid: Signatory + Terms */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 pt-4 border-t border-slate-200">
                <div className="space-y-2 text-xs text-slate-600">
                    <p className="font-semibold text-slate-900 uppercase text-[10px] tracking-wider">Terms &amp; Conditions</p>
                    <p className="text-[11px] leading-relaxed whitespace-pre-line text-slate-500">
                        {invoice.terms_and_conditions || "Payment due within 15 days of invoice date. All accounts are subject to commercial terms."}
                    </p>
                    <p className="text-[10px] italic text-slate-400 mt-2">
                        {invoice.declaration || "We declare that this invoice shows the actual price of the goods or services described and that all particulars are true and correct."}
                    </p>
                </div>

                <div className="flex flex-col items-center sm:items-end justify-center">
                    <div className="border border-dashed border-indigo-200 bg-indigo-50/40 rounded-lg p-3 text-center w-52">
                        <p className="text-[10px] font-semibold text-indigo-700">For {companyName}</p>
                        <div className="my-2 py-1">
                            <Badge variant="secondary" className="text-[9px] tracking-wide">
                                Computer-generated document
                            </Badge>
                        </div>
                        <p className="text-xs font-bold text-slate-900">{invoice.signatory_name || "Authorized Representative"}</p>
                        <p className="text-[10px] text-slate-500">{invoice.signatory_designation || "Authorized Signatory"}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
