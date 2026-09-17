"use client"

import React from "react"
import { TemplateProps, formatCurrency, formatDate, getInvoiceSummary } from "./template-common"
import { Sparkles, Building2, UserCheck, CheckCircle2 } from "lucide-react"

export function TemplateCreative({ invoice }: TemplateProps) {
    const {
        items,
        gstSummary,
        hsnSummary,
        companyName,
        companyGstin,
        companyAddress,
        companyEmail,
        isInterState
    } = getInvoiceSummary(invoice)

    const isProforma = invoice.type === "PROFORMA"

    return (
        <div className="bg-white text-slate-900 font-sans p-0 max-w-4xl mx-auto rounded-2xl shadow-md border border-purple-100 overflow-hidden print:border-0 print:shadow-none print:max-w-none">
            {/* Vibrant Hero Header Banner */}
            <div className="bg-gradient-to-r from-purple-700 via-violet-600 to-indigo-700 text-white p-8">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/20 backdrop-blur-xs text-white uppercase tracking-wider mb-2">
                            <Sparkles className="h-3 w-3" />
                            {isProforma ? "Proforma Estimate" : "Official Invoice"}
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">{companyName}</h1>
                        <p className="text-xs text-purple-100/90 mt-1 max-w-sm">{companyAddress}</p>
                        {companyGstin && (
                            <p className="text-xs font-mono text-purple-200 mt-1">GSTIN: {companyGstin}</p>
                        )}
                    </div>

                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 sm:text-right min-w-[200px]">
                        <p className="text-[10px] uppercase tracking-wider text-purple-200 font-semibold">Invoice Reference</p>
                        <p className="text-xl font-black font-mono text-white mt-0.5">#{invoice.invoice_number}</p>
                        <div className="mt-2 text-xs space-y-0.5 text-purple-100">
                            <p>Date: <span className="font-semibold text-white">{formatDate(invoice.invoice_date)}</span></p>
                            {invoice.valid_until && (
                                <p>Due: <span className="font-semibold text-white">{formatDate(invoice.valid_until)}</span></p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-8 space-y-8">
                {/* Client & Destination Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-purple-100 bg-purple-50/40 border-l-4 border-l-purple-600">
                        <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block mb-1">
                            Billed Directly To
                        </span>
                        <p className="text-base font-bold text-slate-900">{invoice.customer_name}</p>
                        {invoice.customer_email && (
                            <p className="text-xs text-slate-600 mt-0.5">{invoice.customer_email}</p>
                        )}
                        {invoice.customer_gstin && (
                            <p className="text-xs font-mono text-slate-600 mt-1">GSTIN: {invoice.customer_gstin}</p>
                        )}
                    </div>

                    <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 border-l-4 border-l-indigo-600">
                        <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block mb-1">
                            Supply Particulars
                        </span>
                        <p className="text-sm font-semibold text-slate-800">Place of Supply: {invoice.place_of_supply || "Standard Destination"}</p>
                        <p className="text-xs text-slate-600 mt-0.5">
                            Status: <span className="font-bold text-purple-700">{invoice.status}</span>
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            Jurisdiction: {isInterState ? "Inter-State IGST" : "Intra-State CGST + SGST"}
                        </p>
                    </div>
                </div>

                {/* Line Items Table */}
                <div className="rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-wider">
                            <tr>
                                <th className="py-3 px-3 w-10 text-center">#</th>
                                <th className="py-3 px-3">Description</th>
                                <th className="py-3 px-3 w-20 text-center">HSN</th>
                                <th className="py-3 px-3 w-16 text-right">Qty</th>
                                <th className="py-3 px-3 w-24 text-right">Price</th>
                                <th className="py-3 px-3 w-20 text-right">Tax</th>
                                <th className="py-3 px-3 w-28 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-6 text-center text-slate-400">No items available</td>
                                </tr>
                            ) : (
                                items.map((li, idx) => {
                                    const rate = (li.cgst_percent || 0) + (li.sgst_percent || 0) + (li.igst_percent || 0) || li.tax_percent || 0
                                    const rowTotal = li.qty * li.unit_price
                                    return (
                                        <tr key={li.id || idx} className={idx % 2 === 1 ? "bg-purple-50/20" : "bg-white"}>
                                            <td className="py-3 px-3 text-center text-slate-400">{idx + 1}</td>
                                            <td className="py-3 px-3">
                                                <p className="font-bold text-slate-900">{li.product_name}</p>
                                                {li.description && <p className="text-[11px] text-slate-500 mt-0.5">{li.description}</p>}
                                            </td>
                                            <td className="py-3 px-3 text-center font-mono text-slate-500">{li.hsn_sac || "—"}</td>
                                            <td className="py-3 px-3 text-right font-medium">{li.qty}</td>
                                            <td className="py-3 px-3 text-right font-mono text-slate-700">
                                                {formatCurrency(li.unit_price, invoice.currency_code)}
                                            </td>
                                            <td className="py-3 px-3 text-right text-purple-700 font-semibold">
                                                {li.is_exempt ? "0%" : `${rate}%`}
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                                                {formatCurrency(rowTotal, invoice.currency_code)}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Sub-Summary & Creative Grand Total Callout */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
                    <div className="w-full sm:w-1/2 space-y-3">
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                            <p className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">Payment Instructions</p>
                            <p className="text-slate-600">Please settle invoice balance using wire transfer or online gateway link.</p>
                            {invoice.declaration && (
                                <p className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-200 mt-2">
                                    {invoice.declaration}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="w-full sm:w-5/12 space-y-2">
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                            <div className="flex justify-between text-slate-600">
                                <span>Subtotal</span>
                                <span className="font-mono">{formatCurrency(gstSummary.subtotal, invoice.currency_code)}</span>
                            </div>

                            {gstSummary.discountAmount > 0 && (
                                <div className="flex justify-between text-purple-600 font-medium">
                                    <span>Discount</span>
                                    <span className="font-mono">- {formatCurrency(gstSummary.discountAmount, invoice.currency_code)}</span>
                                </div>
                            )}

                            {!isInterState ? (
                                <>
                                    <div className="flex justify-between text-slate-600">
                                        <span>CGST</span>
                                        <span className="font-mono">{formatCurrency(gstSummary.cgstTotal, invoice.currency_code)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-600">
                                        <span>SGST</span>
                                        <span className="font-mono">{formatCurrency(gstSummary.sgstTotal, invoice.currency_code)}</span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex justify-between text-slate-600">
                                    <span>IGST</span>
                                    <span className="font-mono">{formatCurrency(gstSummary.igstTotal, invoice.currency_code)}</span>
                                </div>
                            )}
                        </div>

                        {/* High-Impact Total Callout */}
                        <div className="p-4 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 text-white flex justify-between items-baseline shadow-sm">
                            <span className="text-xs uppercase font-bold tracking-wider text-purple-200">Amount Due</span>
                            <span className="text-xl font-black font-mono">
                                {formatCurrency(gstSummary.grandTotal, invoice.currency_code)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer Notes & Digital Seal */}
                <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
                    <div className="text-slate-500 text-center sm:text-left">
                        <p className="font-semibold text-slate-700">{companyName}</p>
                        <p className="text-[11px]">{companyEmail}</p>
                    </div>

                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold">
                        <UserCheck className="h-4 w-4" />
                        <span>Signed by: {invoice.signatory_name || "Authorized Officer"}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
