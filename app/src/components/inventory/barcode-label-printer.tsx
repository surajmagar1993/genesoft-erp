"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Printer, X, Plus, Minus, Settings2, Barcode as BarcodeIcon, QrCode as QrIcon, Check, Copy } from "lucide-react"
import { generateCode128Svg } from "@/lib/barcode/code128"
import { generateQrCodeSvg } from "@/lib/barcode/qrcode"
import { formatCurrency } from "@/lib/utils"

export interface LabelProduct {
  id: string
  name: string
  sku: string | null
  barcode?: string | null
  unitPrice: number
  currency: string
  category?: string | null
  brand?: string | null
}

interface BarcodeLabelPrinterProps {
  isOpen: boolean
  onClose: () => void
  products: LabelProduct[]
  companyName?: string
}

type SheetFormat = 
  | "a4-24" // 3 x 8 = 24 (70mm x 37mm)
  | "a4-30" // 3 x 10 = 30 (70mm x 29.7mm)
  | "a4-40" // 4 x 10 = 40 (52.5mm x 29.7mm)
  | "a4-65" // 5 x 13 = 65 (38mm x 21.2mm)
  | "thermal-50x25" // 50mm x 25mm
  | "thermal-50x30" // 50mm x 30mm
  | "thermal-38x25" // 38mm x 25mm

interface FormatMeta {
  name: string
  type: "a4" | "thermal"
  cols: number
  rows?: number
  labelWidthMm: number
  labelHeightMm: number
  barcodeWidth: number
  barcodeHeight: number
}

const FORMAT_CONFIGS: Record<SheetFormat, FormatMeta> = {
  "a4-24": {
    name: "A4 — 24 Labels (3×8, 70×37 mm)",
    type: "a4",
    cols: 3,
    rows: 8,
    labelWidthMm: 70,
    labelHeightMm: 37,
    barcodeWidth: 160,
    barcodeHeight: 40,
  },
  "a4-30": {
    name: "A4 — 30 Labels (3×10, 70×29.7 mm)",
    type: "a4",
    cols: 3,
    rows: 10,
    labelWidthMm: 70,
    labelHeightMm: 29.7,
    barcodeWidth: 150,
    barcodeHeight: 34,
  },
  "a4-40": {
    name: "A4 — 40 Labels (4×10, 52.5×29.7 mm)",
    type: "a4",
    cols: 4,
    rows: 10,
    labelWidthMm: 52.5,
    labelHeightMm: 29.7,
    barcodeWidth: 125,
    barcodeHeight: 32,
  },
  "a4-65": {
    name: "A4 — 65 Labels (5×13, 38×21.2 mm)",
    type: "a4",
    cols: 5,
    rows: 13,
    labelWidthMm: 38,
    labelHeightMm: 21.2,
    barcodeWidth: 100,
    barcodeHeight: 25,
  },
  "thermal-50x25": {
    name: "Thermal Roll — 50×25 mm (Shelf / Retail)",
    type: "thermal",
    cols: 1,
    labelWidthMm: 50,
    labelHeightMm: 25,
    barcodeWidth: 140,
    barcodeHeight: 32,
  },
  "thermal-50x30": {
    name: "Thermal Roll — 50×30 mm (Standard)",
    type: "thermal",
    cols: 1,
    labelWidthMm: 50,
    labelHeightMm: 30,
    barcodeWidth: 140,
    barcodeHeight: 38,
  },
  "thermal-38x25": {
    name: "Thermal Roll — 38×25 mm (Jewelry / Compact)",
    type: "thermal",
    cols: 1,
    labelWidthMm: 38,
    labelHeightMm: 25,
    barcodeWidth: 110,
    barcodeHeight: 28,
  },
}

export function BarcodeLabelPrinter({
  isOpen,
  onClose,
  products,
  companyName = "GENESOFT ERP",
}: BarcodeLabelPrinterProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    products.forEach((p) => {
      initial[p.id] = 1
    })
    return initial
  })

  const [format, setFormat] = useState<SheetFormat>("a4-24")
  const [barcodeType, setBarcodeType] = useState<"CODE128" | "QR">("CODE128")
  const [showCompany, setShowCompany] = useState(true)
  const [showTitle, setShowTitle] = useState(true)
  const [showPrice, setShowPrice] = useState(true)
  const [showCodeText, setShowCodeText] = useState(true)

  // Expand list of labels based on quantities
  const labelItems = useMemo(() => {
    const items: LabelProduct[] = []
    products.forEach((p) => {
      const count = quantities[p.id] || 0
      for (let i = 0; i < count; i++) {
        items.push(p)
      }
    })
    return items
  }, [products, quantities])

  const currentCfg = FORMAT_CONFIGS[format]

  const handlePrint = () => {
    window.print()
  }

  const updateQty = (id: string, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta),
    }))
  }

  const setAllQty = (qty: number) => {
    const updated: Record<string, number> = {}
    products.forEach((p) => {
      updated[p.id] = qty
    })
    setQuantities(updated)
  }

  return (
    <>
      {/* ── Print-Only Styles ── */}
      <style>{`
        @media print {

          @page {
            size: ${currentCfg.type === "a4" ? "A4 portrait" : `${currentCfg.labelWidthMm}mm ${currentCfg.labelHeightMm}mm`};
            margin: ${currentCfg.type === "a4" ? "8mm" : "0mm"};
          }
          body * {
            visibility: hidden !important;
          }
          #barcode-print-container,
          #barcode-print-container * {
            visibility: visible !important;
          }
          #barcode-print-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
          <DialogHeader className="p-6 pb-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                  <Printer className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Barcode & Label Printing Studio
                  </DialogTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Generate standard A4 adhesive sheets or direct thermal rolls for inventory & shelf tags.
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="px-3 py-1 font-semibold text-xs border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400">
                {labelItems.length} {labelItems.length === 1 ? "Label" : "Labels"} to Print
              </Badge>
            </div>
          </DialogHeader>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Top Toolbar: Format & Display Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Paper & Label Format
                  </Label>
                  <Select value={format} onValueChange={(val) => setFormat(val as SheetFormat)}>
                    <SelectTrigger className="mt-1 bg-white dark:bg-slate-800">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a4-24">A4 Sheet — 24 Labels (3×8, 70×37 mm)</SelectItem>
                      <SelectItem value="a4-30">A4 Sheet — 30 Labels (3×10, 70×29.7 mm)</SelectItem>
                      <SelectItem value="a4-40">A4 Sheet — 40 Labels (4×10, 52.5×29.7 mm)</SelectItem>
                      <SelectItem value="a4-65">A4 Sheet — 65 Labels (5×13, 38×21.2 mm)</SelectItem>
                      <SelectItem value="thermal-50x25">Thermal Roll — 50×25 mm (Shelf Tag)</SelectItem>
                      <SelectItem value="thermal-50x30">Thermal Roll — 50×30 mm (Standard)</SelectItem>
                      <SelectItem value="thermal-38x25">Thermal Roll — 38×25 mm (Compact)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Barcode Graphic:
                  </Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant={barcodeType === "CODE128" ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs gap-1.5"
                      onClick={() => setBarcodeType("CODE128")}
                    >
                      <BarcodeIcon className="h-3.5 w-3.5" />
                      1D Code-128
                    </Button>
                    <Button
                      type="button"
                      variant={barcodeType === "QR" ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs gap-1.5"
                      onClick={() => setBarcodeType("QR")}
                    >
                      <QrIcon className="h-3.5 w-3.5" />
                      2D QR Code
                    </Button>
                  </div>
                </div>
              </div>

              {/* Elements Toggles */}
              <div className="space-y-2.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Label Elements
                </Label>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span>Company Name</span>
                    <Switch checked={showCompany} onCheckedChange={setShowCompany} />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span>Product Title</span>
                    <Switch checked={showTitle} onCheckedChange={setShowTitle} />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span>Price / MRP</span>
                    <Switch checked={showPrice} onCheckedChange={setShowPrice} />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span>Code / SKU Text</span>
                    <Switch checked={showCodeText} onCheckedChange={setShowCodeText} />
                  </div>
                </div>
              </div>
            </div>

            {/* Product Quantities Configurator */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Items to Print ({products.length} products selected)
                </Label>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAllQty(1)}>
                    Set 1 All
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAllQty(5)}>
                    Set 5 All
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-rose-500 hover:text-rose-600" onClick={() => setAllQty(0)}>
                    Clear
                  </Button>
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto pr-1">
                {products.map((p) => {
                  const qty = quantities[p.id] || 0
                  const code = p.barcode || p.sku || p.id.slice(0, 8)
                  return (
                    <div key={p.id} className="py-2 flex items-center justify-between gap-4 text-xs">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {p.name}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          Code: {code} • {formatCurrency(p.unitPrice, p.currency)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-6 w-6 rounded"
                          onClick={() => updateQty(p.id, -1)}
                          disabled={qty <= 0}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-bold text-slate-900 dark:text-slate-100">
                          {qty}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-6 w-6 rounded"
                          onClick={() => updateQty(p.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Live Visual Print Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Visual Layout Preview ({currentCfg.name})
                </Label>
                <span className="text-[11px] text-slate-400">
                  {currentCfg.type === "a4" ? "Exact A4 proportions" : "Thermal strip preview"}
                </span>
              </div>

              <div className="p-6 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                <div
                  id="barcode-print-container"
                  className="bg-white mx-auto shadow-md p-4 transition-all"
                  style={{
                    width: currentCfg.type === "a4" ? "210mm" : `${currentCfg.labelWidthMm * 1.5}mm`,
                    minHeight: currentCfg.type === "a4" ? "297mm" : "auto",
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${currentCfg.cols}, 1fr)`,
                      gap: currentCfg.type === "a4" ? "2.5mm" : "4mm",
                    }}
                  >
                    {labelItems.map((item, idx) => {
                      const codeValue = item.barcode || item.sku || item.id.slice(0, 8)
                      const barcodeSvg = generateCode128Svg(codeValue, {
                        width: currentCfg.barcodeWidth,
                        height: currentCfg.barcodeHeight,
                        showText: showCodeText,
                        barColor: "#000000",
                        fontSize: 9,
                      })

                      return (
                        <div
                          key={`${item.id}-${idx}`}
                          className="border border-dashed border-slate-300 p-2 flex flex-col items-center justify-between text-center overflow-hidden bg-white text-black"
                          style={{
                            minHeight: `${currentCfg.labelHeightMm}mm`,
                            boxSizing: "border-box",
                          }}
                        >
                          {showCompany && (
                            <div className="text-[8px] font-black tracking-wider text-slate-700 uppercase leading-none mb-0.5">
                              {companyName}
                            </div>
                          )}

                          {showTitle && (
                            <div className="text-[10px] font-bold text-slate-900 leading-tight max-w-full truncate px-1">
                              {item.name}
                            </div>
                          )}

                          <div className="my-auto py-1 flex items-center justify-center max-w-full">
                            <div
                              dangerouslySetInnerHTML={{ __html: barcodeSvg }}
                              className="max-w-full flex items-center justify-center"
                            />
                          </div>

                          <div className="flex items-center justify-between w-full px-1 text-[9px] font-bold text-slate-900 border-t border-slate-100 pt-0.5">
                            {showCodeText && (
                              <span className="font-mono text-[8px] text-slate-500">
                                {codeValue}
                              </span>
                            )}
                            {showPrice && (
                              <span className="font-black ml-auto">
                                {formatCurrency(item.unitPrice, item.currency)}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <DialogFooter className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5"
                onClick={handlePrint}
                disabled={labelItems.length === 0}
              >
                <Printer className="h-4 w-4" />
                Print {labelItems.length} Labels
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
