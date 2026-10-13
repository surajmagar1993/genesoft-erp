"use client"

import React from "react"
import { TemplateProps, formatCurrency, formatDate, getInvoiceSummary } from "./template-common"

export function TemplateMinimalist({ invoice }: TemplateProps) {
    const {
        items,
        gstSummary,
        companyName,
        companyGstin,
        companyAddress,
        companyEmail,
        isInterState,
        isSingle,
        taxLabel,
        taxIdLabel,
        docTitle: summaryDocTitle
    } = getInvoiceSummary(invoice)

    const isProforma = invoice.type === "PROFORMA"
    const docTitle = isProforma ? "Proforma" : "Invoice"

    return (
        <div className="bg-white text-zinc-900 font-sans p-10 max-w-4xl mx-auto border border-zinc-200 shadow-xs print:border-0 print:shadow-none print:p-0 print:max-w-none">
            {/* Header: Large Minimal Typography */}
            <div className="flex justify-between items-baseline pb-10 border-b border-zinc-100">
                <div>
                    <span className="text-xs uppercase tracking-widest text-zinc-400 font-medium">
                        {docTitle}
                    </span>
                    <h1 className="text-3xl font-light tracking-tight text-zinc-950 font-mono mt-1">
                        #{invoice.invoice_number}
                    </h1>
                </div>

                <div className="text-right">
                    <h2 className="text-base font-semibold text-zinc-900 tracking-tight">{companyName}</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">{companyAddress}</p>
                    {companyGstin && (
                        <p className="text-[11px] font-mono text-zinc-500 mt-1">{taxIdLabel}: {companyGstin}</p>
                    )}
                </div>
            </div>

            {/* Metadata Bar */}
            <div className="grid grid-cols-4 py-6 border-b border-zinc-100 text-xs">
                <div>
                    <span className="text-zinc-400 block uppercase text-[10px] tracking-wider">Date</span>
                    <span className="font-medium text-zinc-800 mt-1 block">{formatDate(invoice.invoice_date, invoice.locale)}</span>
                </div>
                <div>
                    <span className="text-zinc-400 block uppercase text-[10px] tracking-wider">Due</span>
                    <span className="font-medium text-zinc-800 mt-1 block">{formatDate(invoice.valid_until, invoice.locale)}</span>
                </div>
                <div>
                    <span className="text-zinc-400 block uppercase text-[10px] tracking-wider">Billed To</span>
                    <span className="font-semibold text-zinc-900 mt-1 block">{invoice.customer_name}</span>
                    {invoice.customer_gstin && (
                        <span className="text-[10px] font-mono text-zinc-500 block">{invoice.customer_gstin}</span>
                    )}
                </div>
                <div className="text-right">
                    <span className="text-zinc-400 block uppercase text-[10px] tracking-wider">Status</span>
                    <span className="font-mono text-xs uppercase tracking-wider font-semibold text-zinc-700 mt-1 block">
                        {invoice.status}
                    </span>
                </div>
            </div>

            {/* Line Items Table with Minimalist Lines */}
            <div className="my-8">
                <table className="w-full text-xs text-left">
                    <thead className="border-b border-zinc-200 text-zinc-400 uppercase text-[10px] tracking-wider">
                        <tr>
                            <th className="pb-3 font-medium">Description</th>
                            <th className="pb-3 text-center font-medium w-20">HSN</th>
                            <th className="pb-3 text-right font-medium w-16">Qty</th>
                            <th className="pb-3 text-right font-medium w-24">Rate</th>
                            <th className="pb-3 text-right font-medium w-20">{taxLabel}</th>
                            <th className="pb-3 text-right font-medium w-28">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-6 text-center text-zinc-300">No items</td>
                            </tr>
                        ) : (
                            items.map((li, idx) => {
                                const rate = (li.cgst_percent || 0) + (li.sgst_percent || 0) + (li.igst_percent || 0) + (li.vat_percent || 0) || li.tax_percent || 0
                                const rowTotal = li.qty * li.unit_price
                                return (
                                    <tr key={li.id || idx}>
                                        <td className="py-4 pr-4">
                                            <p className="font-medium text-zinc-900">{li.product_name}</p>
                                            {li.description && (
                                                <p className="text-[11px] text-zinc-400 mt-0.5 font-light">{li.description}</p>
                                            )}
                                        </td>
                                        <td className="py-4 text-center font-mono text-zinc-400 text-[11px]">{li.hsn_sac || "—"}</td>
                                        <td className="py-4 text-right text-zinc-700">{li.qty}</td>
                                        <td className="py-4 text-right font-mono text-zinc-600">
                                            {formatCurrency(li.unit_price, invoice.currency_code)}
                                        </td>
                                        <td className="py-4 text-right text-zinc-500 font-mono text-[11px]">
                                            {li.is_exempt ? "Exempt" : `${rate}%`}
                                        </td>
                                        <td className="py-4 text-right font-mono font-medium text-zinc-900">
                                            {formatCurrency(rowTotal, invoice.currency_code)}
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Totals Section */}
            <div className="flex justify-end pt-4 border-t border-zinc-100">
                <div className="w-64 space-y-2 text-xs">
                    <div className="flex justify-between text-zinc-500">
                        <span>Subtotal</span>
                        <span className="font-mono text-zinc-800">{formatCurrency(gstSummary.subtotal, invoice.currency_code)}</span>
                    </div>

                    {gstSummary.discountAmount > 0 && (
                        <div className="flex justify-between text-zinc-500">
                            <span>Discount</span>
                            <span className="font-mono text-zinc-800">- {formatCurrency(gstSummary.discountAmount, invoice.currency_code)}</span>
                        </div>
                    )}

                    {isSingle ? (
                        <div className="flex justify-between">
                            <span>{taxLabel}</span>
                            <span className="font-mono">{formatCurrency(gstSummary.vatTotal, invoice.currency_code)}</span>
                        </div>
                    ) : !isInterState  ? (
                        <>
                            <div className="flex justify-between text-zinc-500">
                                <span>CGST</span>
                                <span className="font-mono text-zinc-800">{formatCurrency(gstSummary.cgstTotal, invoice.currency_code)}</span>
                            </div>
                            <div className="flex justify-between text-zinc-500">
                                <span>SGST</span>
                                <span className="font-mono text-zinc-800">{formatCurrency(gstSummary.sgstTotal, invoice.currency_code)}</span>
                            </div>
                        </>
                    ) : (
                        <div className="flex justify-between text-zinc-500">
                            <span>IGST</span>
                            <span className="font-mono text-zinc-800">{formatCurrency(gstSummary.igstTotal, invoice.currency_code)}</span>
                        </div>
                    )}

                    <div className="pt-3 border-t border-zinc-900 flex justify-between items-baseline mt-2">
                        <span className="text-xs uppercase tracking-widest font-bold text-zinc-900">Total</span>
                        <span className="text-xl font-light font-mono text-zinc-950">
                            {formatCurrency(gstSummary.grandTotal, invoice.currency_code)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Subtle Footer */}
            <div className="mt-16 pt-6 border-t border-zinc-100 flex justify-between items-end text-[11px] text-zinc-400">
                <div className="max-w-md space-y-1">
                    <p className="text-zinc-600 font-medium">Notes &amp; Terms</p>
                    <p className="leading-relaxed font-light">
                        {invoice.terms_and_conditions || "Payment due as per contract schedule. Thank you for your business."}
                    </p>
                </div>

                <div className="text-right">
                    <p className="text-zinc-900 font-medium">{invoice.signatory_name || companyName}</p>
                    <p className="font-light">{invoice.signatory_designation || "Authorized Signatory"}</p>
                </div>
            </div>
        </div>
    )
}
