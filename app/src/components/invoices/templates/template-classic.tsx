"use client"

import React from "react"
import { TemplateProps, formatCurrency, formatDate, getInvoiceSummary } from "./template-common"

export function TemplateClassic({ invoice }: TemplateProps) {
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
        <div className="bg-white text-slate-900 font-serif p-8 max-w-4xl mx-auto rounded shadow-xs border-2 border-slate-800 print:border-2 print:shadow-none print:p-0 print:max-w-none">
            {/* Header / Letterhead */}
            <div className="text-center pb-4 border-b-2 border-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {companyLogo && <img src={companyLogo} alt={companyName} className="mb-2 h-14 max-w-[200px] object-contain" />}
                <h1 className="text-2xl font-bold tracking-wide uppercase text-slate-900">{companyName}</h1>
                <p className="text-xs text-slate-600 mt-1 font-sans">{companyAddress}</p>
                <div className="flex justify-center gap-4 text-xs font-sans text-slate-700 mt-1">
                    {companyGstin && <span><strong>{taxIdLabel}:</strong> {companyGstin}</span>}
                    {companyEmail && <span><strong>Email:</strong> {companyEmail}</span>}
                    {companyPhone && <span><strong>Tel:</strong> {companyPhone}</span>}
                </div>
            </div>

            {/* Document Title Banner */}
            <div className="text-center py-2 bg-slate-100 border-b-2 border-slate-800">
                <h2 className="text-base font-bold uppercase tracking-widest text-slate-900 font-sans">
                    {docTitle}
                </h2>
                {!isSingle && (
                    <p className="text-[10px] text-slate-500 font-sans uppercase">
                        (Issued under Section 31 of CGST Act)
                    </p>
                )}
            </div>

            {/* Invoice & Parties Grid */}
            <div className="grid grid-cols-2 border-b-2 border-slate-800 font-sans text-xs">
                {/* Left: Client Info */}
                <div className="p-3 border-r-2 border-slate-800 space-y-1">
                    <p className="font-bold text-slate-800 uppercase text-[10px] tracking-wider border-b pb-1">
                        Details of Receiver / Billed To:
                    </p>
                    <p className="font-bold text-slate-900 text-sm">{invoice.customer_name}</p>
                    {invoice.customer_email && <p className="text-slate-600">{invoice.customer_email}</p>}
                    {invoice.customer_gstin && (
                        <p className="text-slate-700 font-mono"><strong>{taxIdLabel}:</strong> {invoice.customer_gstin}</p>
                    )}
                    {!isSingle && <p className="text-slate-600"><strong>Place of Supply:</strong> {invoice.place_of_supply || "—"}</p>}
                </div>

                {/* Right: Invoice Reference Details */}
                <div className="p-3 space-y-1">
                    <p className="font-bold text-slate-800 uppercase text-[10px] tracking-wider border-b pb-1">
                        Invoice Particulars:
                    </p>
                    <div className="grid grid-cols-2 gap-1 text-slate-700">
                        <span className="font-semibold">Invoice No:</span>
                        <span className="font-mono font-bold text-slate-900">{invoice.invoice_number}</span>
                        <span className="font-semibold">Invoice Date:</span>
                        <span>{formatDate(invoice.invoice_date, invoice.locale)}</span>
                        {invoice.valid_until && (
                            <>
                                <span className="font-semibold">Payment Due:</span>
                                <span>{formatDate(invoice.valid_until, invoice.locale)}</span>
                            </>
                        )}
                        <span className="font-semibold">Status:</span>
                        <span className="font-bold">{invoice.status}</span>
                        <span className="font-semibold">{isSingle ? "Tax:" : "Supply Nature:"}</span>
                        <span>{isSingle ? taxLabel : isInterState ? "Inter-State (IGST)" : "Intra-State (CGST+SGST)"}</span>
                    </div>
                </div>
            </div>

            {/* Line Items Table with Traditional Double / Boxed Borders */}
            <div className="border-b-2 border-slate-800 font-sans text-xs">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-200 border-b border-slate-800 text-[11px] font-bold">
                        <tr>
                            <th className="p-2 border-r border-slate-800 w-10 text-center">S.N.</th>
                            <th className="p-2 border-r border-slate-800">Description of Goods / Services</th>
                            <th className="p-2 border-r border-slate-800 w-20 text-center">HSN/SAC</th>
                            <th className="p-2 border-r border-slate-800 w-16 text-right">Qty</th>
                            <th className="p-2 border-r border-slate-800 w-24 text-right">Rate</th>
                            <th className="p-2 border-r border-slate-800 w-20 text-right">Tax Rate</th>
                            <th className="p-2 text-right w-28">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="p-4 text-center text-slate-400 italic">No entries recorded</td>
                            </tr>
                        ) : (
                            items.map((li, idx) => {
                                const rate = (li.cgst_percent || 0) + (li.sgst_percent || 0) + (li.igst_percent || 0) + (li.vat_percent || 0) || li.tax_percent || 0
                                const rowTotal = li.qty * li.unit_price
                                return (
                                    <tr key={li.id || idx}>
                                        <td className="p-2 border-r border-slate-300 text-center text-slate-600">{idx + 1}</td>
                                        <td className="p-2 border-r border-slate-300">
                                            <span className="font-bold text-slate-900">{li.product_name}</span>
                                            {li.description && (
                                                <p className="text-[10px] text-slate-600 mt-0.5">{li.description}</p>
                                            )}
                                        </td>
                                        <td className="p-2 border-r border-slate-300 text-center font-mono">{li.hsn_sac || "—"}</td>
                                        <td className="p-2 border-r border-slate-300 text-right">{li.qty}</td>
                                        <td className="p-2 border-r border-slate-300 text-right font-mono">
                                            {formatCurrency(li.unit_price, invoice.currency_code)}
                                        </td>
                                        <td className="p-2 border-r border-slate-300 text-right">
                                            {li.is_exempt ? "Exempt" : `${rate}%`}
                                        </td>
                                        <td className="p-2 text-right font-mono font-bold">
                                            {formatCurrency(rowTotal, invoice.currency_code)}
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Calculations and Accounting Sub-Summary */}
            <div className="grid grid-cols-2 border-b-2 border-slate-800 font-sans text-xs">
                {/* Left Column: HSN Breakdown & Declarations */}
                <div className="p-3 border-r-2 border-slate-800 space-y-3">
                    {!isSingle && hsnSummary.length > 0 && (
                        <div>
                            <p className="font-bold text-[10px] uppercase text-slate-700 mb-1">HSN/SAC Statutory Breakdown</p>
                            <table className="w-full text-[10px] border border-slate-400 text-left">
                                <thead className="bg-slate-100 border-b border-slate-400">
                                    <tr>
                                        <th className="p-1 border-r border-slate-400 text-center">HSN</th>
                                        <th className="p-1 border-r border-slate-400 text-right">Taxable</th>
                                        <th className="p-1 text-right">Tax Amt</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-300 font-mono">
                                    {hsnSummary.map((h, i) => (
                                        <tr key={i}>
                                            <td className="p-1 border-r border-slate-300 text-center">{h.hsnSac}</td>
                                            <td className="p-1 border-r border-slate-300 text-right">{formatCurrency(h.taxableAmount, invoice.currency_code)}</td>
                                            <td className="p-1 text-right">{formatCurrency(h.totalTaxAmount, invoice.currency_code)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="text-[10px] text-slate-600 leading-tight">
                        <p className="font-bold uppercase text-slate-800">Declaration:</p>
                        <p className="mt-0.5 italic">
                            {invoice.declaration || "Certified that all particulars given herein are true and correct and that invoice value represents full commercial consideration."}
                        </p>
                    </div>
                </div>

                {/* Right Column: Final Financial Ledger */}
                <div className="p-3 space-y-1.5">
                    <div className="flex justify-between text-slate-700">
                        <span>Sub Total:</span>
                        <span className="font-mono">{formatCurrency(gstSummary.subtotal, invoice.currency_code)}</span>
                    </div>

                    {gstSummary.discountAmount > 0 && (
                        <div className="flex justify-between text-slate-700">
                            <span>Less: Discount:</span>
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
                            <div className="flex justify-between text-slate-700">
                                <span>Add: CGST:</span>
                                <span className="font-mono">{formatCurrency(gstSummary.cgstTotal, invoice.currency_code)}</span>
                            </div>
                            <div className="flex justify-between text-slate-700">
                                <span>Add: SGST:</span>
                                <span className="font-mono">{formatCurrency(gstSummary.sgstTotal, invoice.currency_code)}</span>
                            </div>
                        </>
                    ) : (
                        <div className="flex justify-between text-slate-700">
                            <span>Add: IGST:</span>
                            <span className="font-mono">{formatCurrency(gstSummary.igstTotal, invoice.currency_code)}</span>
                        </div>
                    )}

                    {/* Double underline accounting total */}
                    <div className="pt-2 border-t-2 border-slate-800 border-b-4 border-double border-slate-800 flex justify-between items-baseline py-1">
                        <span className="font-bold text-sm text-slate-900 uppercase">Grand Total:</span>
                        <span className="font-bold text-base font-mono text-slate-950">
                            {formatCurrency(gstSummary.grandTotal, invoice.currency_code)}
                        </span>
                    </div>

                    {invoice.terms_and_conditions && (
                        <div className="pt-2 text-[10px] text-slate-500">
                            <span className="font-semibold text-slate-700">Terms:</span> {invoice.terms_and_conditions}
                        </div>
                    )}
                </div>
            </div>

            {/* Classical Signature Block */}
            <div className="grid grid-cols-2 p-4 font-sans text-xs">
                <div className="text-[10px] text-slate-500 self-end">
                    <p>E. &amp; O.E. (Errors &amp; Omissions Excepted)</p>
                    <p>Computer-generated invoice. Registered under applicable tax laws.</p>
                </div>

                <div className="text-right space-y-10">
                    <p className="font-bold text-slate-800">For {companyName}</p>
                    <div>
                        <div className="inline-block border-t border-slate-800 pt-1 w-48 text-center">
                            <p className="font-bold text-slate-900">{invoice.signatory_name || "Authorized Signatory"}</p>
                            <p className="text-[10px] text-slate-600">{invoice.signatory_designation || "Authorized Representative"}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
