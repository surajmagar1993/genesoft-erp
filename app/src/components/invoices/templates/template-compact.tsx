"use client"

import React from "react"
import { TemplateProps, formatCurrency, formatDate, getInvoiceSummary } from "./template-common"

export function TemplateCompact({ invoice }: TemplateProps) {
    const {
        items,
        gstSummary,
        companyName,
        companyGstin,
        companyAddress,
        companyPhone,
        isInterState
    } = getInvoiceSummary(invoice)

    return (
        <div className="bg-white text-slate-900 font-mono text-xs p-6 max-w-md mx-auto border-2 border-dashed border-slate-300 rounded shadow-xs print:border-0 print:shadow-none print:p-0 print:max-w-none">
            {/* Top Store Header */}
            <div className="text-center pb-3 border-b-2 border-dashed border-slate-300 space-y-0.5">
                <h1 className="text-base font-bold uppercase tracking-wider text-slate-900">{companyName}</h1>
                <p className="text-[10px] text-slate-600">{companyAddress}</p>
                {companyPhone && <p className="text-[10px] text-slate-600">TEL: {companyPhone}</p>}
                {companyGstin && <p className="text-[10px] text-slate-800 font-bold">GSTIN: {companyGstin}</p>}
                <div className="pt-1">
                    <span className="inline-block border border-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase">
                        {invoice.type === "PROFORMA" ? "PROFORMA SLIP" : "TAX INVOICE / CASH MEMO"}
                    </span>
                </div>
            </div>

            {/* Slip Metadata */}
            <div className="py-2.5 border-b border-dashed border-slate-200 text-[11px] space-y-0.5">
                <div className="flex justify-between">
                    <span>INVOICE #:</span>
                    <span className="font-bold">{invoice.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                    <span>DATE:</span>
                    <span>{formatDate(invoice.invoice_date)}</span>
                </div>
                <div className="flex justify-between">
                    <span>CUSTOMER:</span>
                    <span className="truncate max-w-[180px] font-medium">{invoice.customer_name}</span>
                </div>
                {invoice.customer_gstin && (
                    <div className="flex justify-between">
                        <span>CUST GSTIN:</span>
                        <span>{invoice.customer_gstin}</span>
                    </div>
                )}
                <div className="flex justify-between">
                    <span>STATUS:</span>
                    <span className="font-bold">{invoice.status}</span>
                </div>
            </div>

            {/* Line Items List */}
            <div className="py-3 border-b-2 border-dashed border-slate-300 space-y-2">
                <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase border-b pb-1">
                    <span>ITEM / DESCRIPTION</span>
                    <span>TOTAL</span>
                </div>

                {items.length === 0 ? (
                    <p className="text-center py-2 text-slate-400">No items on slip</p>
                ) : (
                    items.map((li, idx) => {
                        const rowTotal = li.qty * li.unit_price
                        return (
                            <div key={li.id || idx} className="space-y-0.5">
                                <div className="flex justify-between font-semibold text-slate-900">
                                    <span className="truncate max-w-[200px]">{idx + 1}. {li.product_name}</span>
                                    <span>{formatCurrency(rowTotal, invoice.currency_code)}</span>
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-500">
                                    <span>
                                        {li.qty} x {formatCurrency(li.unit_price, invoice.currency_code)}
                                        {li.hsn_sac && ` [HSN:${li.hsn_sac}]`}
                                    </span>
                                    <span>GST {li.is_exempt ? "0%" : `${li.cgst_percent + li.sgst_percent + li.igst_percent || li.tax_percent}%`}</span>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Financial Summary */}
            <div className="py-3 border-b-2 border-dashed border-slate-300 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                    <span>SUBTOTAL:</span>
                    <span>{formatCurrency(gstSummary.subtotal, invoice.currency_code)}</span>
                </div>

                {gstSummary.discountAmount > 0 && (
                    <div className="flex justify-between text-slate-600">
                        <span>DISCOUNT:</span>
                        <span>- {formatCurrency(gstSummary.discountAmount, invoice.currency_code)}</span>
                    </div>
                )}

                {!isInterState ? (
                    <>
                        <div className="flex justify-between text-slate-600">
                            <span>CGST:</span>
                            <span>{formatCurrency(gstSummary.cgstTotal, invoice.currency_code)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                            <span>SGST:</span>
                            <span>{formatCurrency(gstSummary.sgstTotal, invoice.currency_code)}</span>
                        </div>
                    </>
                ) : (
                    <div className="flex justify-between text-slate-600">
                        <span>IGST:</span>
                        <span>{formatCurrency(gstSummary.igstTotal, invoice.currency_code)}</span>
                    </div>
                )}

                <div className="flex justify-between text-sm font-bold text-slate-950 pt-2 border-t border-slate-400">
                    <span>TOTAL PAYABLE:</span>
                    <span>{formatCurrency(gstSummary.grandTotal, invoice.currency_code)}</span>
                </div>
            </div>

            {/* Slip Footer / Barcode simulation */}
            <div className="pt-4 text-center space-y-2 text-[10px] text-slate-500">
                <div className="font-mono text-center tracking-widest text-xs py-1 border border-slate-300 rounded bg-slate-50">
                    * {invoice.invoice_number} *
                </div>
                <p>THANK YOU FOR YOUR PATRONAGE</p>
                <p className="text-[9px]">{invoice.declaration || "Goods once sold cannot be returned without original cash receipt."}</p>
                {invoice.signatory_name && (
                    <p className="pt-1 text-[9px] text-slate-400">Cashier: {invoice.signatory_name}</p>
                )}
            </div>
        </div>
    )
}
