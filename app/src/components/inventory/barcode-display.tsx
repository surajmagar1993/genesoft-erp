"use client"

import { useState, useEffect, useMemo } from "react"
import { generateCode128Svg } from "@/lib/barcode/code128"
import { generateQrCodeSvg, generateQrCodeDataUrl } from "@/lib/barcode/qrcode"
import { Button } from "@/components/ui/button"
import { Copy, Check, Download, ZoomIn, QrCode as QrIcon, Barcode as BarcodeIcon } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export interface BarcodeDisplayProps {
  value: string
  type?: "CODE128" | "QR"
  format?: "CODE128" | "QR"
  width?: number
  height?: number
  showText?: boolean
  showValue?: boolean
  showActions?: boolean
  allowCopy?: boolean
  allowZoom?: boolean
  className?: string
  altText?: string
}

export function BarcodeDisplay({
  value,
  type = "CODE128",
  format,
  width = 180,
  height = 55,
  showText = true,
  showValue,
  showActions = false,
  allowCopy = false,
  allowZoom = false,
  className = "",
  altText,
}: BarcodeDisplayProps) {
  const effectiveType = format || type
  const effectiveShowText = showValue !== undefined ? showValue : showText
  const hasActions = showActions || allowCopy || allowZoom
  const [copied, setCopied] = useState(false)
  const [svgContent, setSvgContent] = useState<string>("")
  const [isZoomOpen, setIsZoomOpen] = useState(false)

  const cleanValue = (value || "").trim()

  useEffect(() => {
    let isMounted = true
    if (!cleanValue) {
      setSvgContent("")
      return
    }

    if (effectiveType === "CODE128") {
      const svg = generateCode128Svg(cleanValue, {
        width,
        height,
        showText: effectiveShowText,
        barColor: "currentColor",
        fontSize: 10,
      })
      if (isMounted) setSvgContent(svg)
    } else {
      generateQrCodeSvg(cleanValue, {
        width: Math.min(width, height * 2),
        margin: 1,
        color: { dark: "#0f172a", light: "#ffffff" },
      }).then((svg) => {
        if (isMounted) setSvgContent(svg)
      })
    }

    return () => {
      isMounted = false
    }
  }, [cleanValue, type, width, height, showText])

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!cleanValue) return
    navigator.clipboard.writeText(cleanValue)
    setCopied(true)
    toast.success("Barcode copied to clipboard", { description: cleanValue })
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadSvg = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!svgContent) return
    const blob = new Blob([svgContent], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `barcode-${cleanValue || "code"}.svg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success("Downloaded SVG barcode")
  }

  if (!cleanValue) {
    return (
      <div className={`text-xs text-muted-foreground italic flex items-center gap-1.5 ${className}`}>
        <BarcodeIcon className="h-3.5 w-3.5 opacity-50" />
        <span>No code</span>
      </div>
    )
  }

  return (
    <div className={`inline-flex flex-col items-center gap-1 group ${className}`}>
      <div
        className="cursor-pointer transition-transform hover:scale-[1.02] flex items-center justify-center overflow-hidden rounded bg-white p-1 text-slate-900 shadow-sm border border-slate-200 dark:border-slate-800"
        onClick={() => setIsZoomOpen(true)}
        title="Click to view full barcode"
      >
        <div
          dangerouslySetInnerHTML={{ __html: svgContent }}
          className="flex items-center justify-center max-w-full"
        />
      </div>

      {hasActions && (
        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={handleCopy}
            title="Copy barcode value"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={handleDownloadSvg}
            title="Download vector SVG"
          >
            <Download className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={() => setIsZoomOpen(true)}
            title="Enlarge barcode"
          >
            <ZoomIn className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Enlarged Dialog Modal */}
      <Dialog open={isZoomOpen} onOpenChange={setIsZoomOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              {type === "QR" ? <QrIcon className="h-5 w-5 text-indigo-500" /> : <BarcodeIcon className="h-5 w-5 text-indigo-500" />}
              <span>{type === "QR" ? "QR Code" : "Code-128 Barcode"}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 my-2">
            <div
              dangerouslySetInnerHTML={{
                __html:
                  type === "CODE128"
                    ? generateCode128Svg(cleanValue, {
                        width: 320,
                        height: 100,
                        showText: true,
                        barColor: "#0f172a",
                        fontSize: 14,
                      })
                    : svgContent,
              }}
              className="flex items-center justify-center p-2"
            />
            {altText && (
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-3 text-center">
                {altText}
              </p>
            )}
            <p className="text-xs font-mono text-slate-500 mt-1">{cleanValue}</p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy Code"}
            </Button>
            <Button variant="default" size="sm" onClick={handleDownloadSvg} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white">
              <Download className="h-3.5 w-3.5" />
              Download SVG
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
