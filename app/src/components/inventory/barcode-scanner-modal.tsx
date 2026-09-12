"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Camera,
  CameraOff,
  Search,
  Barcode as BarcodeIcon,
  Zap,
  PlusCircle,
  MinusCircle,
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  Package,
  Warehouse,
  Volume2,
  VolumeX,
  RefreshCw,
  ArrowRight,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { getProductByBarcode, quickScanAdjustStock } from "@/app/actions/inventory"
import { formatCurrency } from "@/lib/utils"

// Web Audio API scan beep sound synthesizer
function playScanSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "sine"
    osc.frequency.setValueAtTime(880, ctx.currentTime) // A5
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1) // A6

    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.15)
  } catch (e) {
    // Audio context may be restricted before interaction
  }
}

export interface BarcodeScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onProductScanned?: (product: any) => void
  onStockUpdated?: () => void
  warehouses?: { id: string; name: string }[]
  mode?: "inventory" | "pos"
}

export function BarcodeScannerModal({
  isOpen,
  onClose,
  onProductScanned,
  onStockUpdated,
  warehouses = [],
  mode = "inventory",
}: BarcodeScannerModalProps) {
  const [manualCode, setManualCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [scannedProduct, setScannedProduct] = useState<any | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Quick Action form states
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("")
  const [actionQty, setActionQty] = useState<string>("1")
  const [actionReason, setActionReason] = useState<string>("Barcode scan adjustment")
  const [isSubmittingAction, setIsSubmittingAction] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Hardware scanner wedge detection state
  const bufferRef = useRef<{ keys: string[]; lastTime: number }>({ keys: [], lastTime: 0 })

  // Initialize selected warehouse
  useEffect(() => {
    if (warehouses.length > 0 && !selectedWarehouseId) {
      setSelectedWarehouseId(warehouses[0].id)
    }
  }, [warehouses, selectedWarehouseId])

  // Process code lookup
  const handleLookup = useCallback(async (code: string) => {
    const clean = code.trim()
    if (!clean) return

    setIsLoading(true)
    try {
      const res = await getProductByBarcode(clean)
      if (res.product) {
        if (soundEnabled) playScanSound()
        setScannedProduct(res.product)
        toast.success(`Found: ${res.product.name}`, {
          description: `SKU: ${res.product.sku || "N/A"} • Stock: ${res.product.stockQty} ${res.product.unit}`,
        })
        if (onProductScanned) {
          onProductScanned(res.product)
        }
      } else {
        toast.error("No product found", {
          description: `No item matching barcode / SKU "${clean}"`,
        })
      }
    } catch (err: any) {
      toast.error("Lookup failed", { description: err.message })
    } finally {
      setIsLoading(false)
    }
  }, [soundEnabled, onProductScanned])

  // Global Hardware Scanner Wedge Listener
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is actively typing in a standard input or textarea
      const target = e.target as HTMLElement
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return
      }

      const now = Date.now()
      const timeDiff = now - bufferRef.current.lastTime

      if (e.key === "Enter") {
        if (bufferRef.current.keys.length >= 3 && timeDiff < 100) {
          const barcode = bufferRef.current.keys.join("")
          bufferRef.current = { keys: [], lastTime: 0 }
          handleLookup(barcode)
        } else {
          bufferRef.current = { keys: [], lastTime: 0 }
        }
        return
      }

      // Barcode scanner sends chars rapidly (< 40ms interval)
      if (e.key.length === 1) {
        if (timeDiff > 100) {
          bufferRef.current.keys = [e.key]
        } else {
          bufferRef.current.keys.push(e.key)
        }
        bufferRef.current.lastTime = now
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, handleLookup])

  // Camera start / stop logic
  const startCamera = async () => {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraActive(true)

      // Start detection loop with BarcodeDetector if available
      if ("BarcodeDetector" in window) {
        const detector = new (window as any).BarcodeDetector({
          formats: ["code_128", "ean_13", "ean_8", "qr_code", "upc_a", "upc_e"],
        })
        const detectFrame = async () => {
          if (!streamRef.current || !videoRef.current) return
          try {
            const barcodes = await detector.detect(videoRef.current)
            if (barcodes.length > 0) {
              const rawValue = barcodes[0].rawValue
              if (rawValue) {
                stopCamera()
                handleLookup(rawValue)
                return
              }
            }
          } catch (e) {
            // Ignore continuous frame processing errors
          }
          if (cameraActive) {
            requestAnimationFrame(detectFrame)
          }
        }
        requestAnimationFrame(detectFrame)
      }
    } catch (err: any) {
      setCameraError(err.message || "Unable to access camera device.")
      setCameraActive(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  useEffect(() => {
    if (!isOpen) {
      stopCamera()
      setScannedProduct(null)
      setManualCode("")
    }
  }, [isOpen])

  // Handle Quick Stock In / Out / Audit
  const handleQuickAction = async (type: "IN" | "OUT") => {
    if (!scannedProduct) return
    const qty = parseFloat(actionQty)
    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid positive quantity")
      return
    }
    const whId = selectedWarehouseId || (warehouses[0]?.id)
    if (!whId) {
      toast.error("Please select a warehouse")
      return
    }

    setIsSubmittingAction(true)
    try {
      const res = await quickScanAdjustStock({
        productId: scannedProduct.id,
        warehouseId: whId,
        quantity: qty,
        type,
        reason: actionReason || `Barcode quick ${type.toLowerCase()}`,
      })

      if (res.success) {
        toast.success(`Stock ${type === "IN" ? "received" : "dispatched"} successfully!`, {
          description: `${qty} ${scannedProduct.unit} updated. New Total: ${res.newProductQty}`,
        })
        if (onStockUpdated) {
          onStockUpdated()
        }
        // Refresh scanned product telemetry
        handleLookup(scannedProduct.sku || scannedProduct.id)
      }
    } catch (err: any) {
      toast.error("Error executing adjustment", { description: err.message })
    } finally {
      setIsSubmittingAction(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                <BarcodeIcon className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Barcode & QR Scanner Desk
                </DialogTitle>
                <p className="text-xs text-slate-500">
                  Hardware wedge scanner auto-detection, camera scanning, and rapid stock operations.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-500"
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? "Sound enabled" : "Muted"}
              >
                {soundEnabled ? <Volume2 className="h-4 w-4 text-indigo-600" /> : <VolumeX className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Scanner Viewport / Search Section */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Scan with barcode gun or type SKU / Barcode..."
                  className="pl-9 bg-slate-50 dark:bg-slate-800 font-mono text-sm"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleLookup(manualCode)
                    }
                  }}
                  autoFocus
                />
              </div>
              <Button
                type="button"
                variant="default"
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-semibold text-xs"
                onClick={() => handleLookup(manualCode)}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Lookup
              </Button>
              <Button
                type="button"
                variant={cameraActive ? "destructive" : "outline"}
                className="gap-2 text-xs"
                onClick={cameraActive ? stopCamera : startCamera}
              >
                {cameraActive ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4 text-indigo-500" />}
                {cameraActive ? "Stop Camera" : "Use Camera"}
              </Button>
            </div>

            {/* Camera Viewfinder */}
            {cameraActive && (
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border-2 border-indigo-500 shadow-lg">
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                
                {/* Laser scan animation overlay */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <div className="w-64 h-36 border-2 border-dashed border-white/80 rounded-lg relative overflow-hidden">
                    <div className="w-full h-0.5 bg-red-500 shadow-[0_0_10px_#ef4444] animate-pulse top-1/2 absolute" />
                  </div>
                  <span className="text-[11px] font-semibold text-white/90 bg-black/60 px-3 py-1 rounded-full mt-3 backdrop-blur-sm">
                    Center barcode in box to scan
                  </span>
                </div>
              </div>
            )}

            {cameraError && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>Camera Notice: {cameraError}. Use hardware barcode scanner or manual search.</span>
              </div>
            )}
          </div>

          {/* Product Result Card */}
          {scannedProduct ? (
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 font-mono">
                      {scannedProduct.barcode || scannedProduct.sku || "NO CODE"}
                    </Badge>
                    <Badge variant={scannedProduct.stockQty > 0 ? "default" : "destructive"} className="text-xs">
                      {scannedProduct.stockQty > 0 ? `${scannedProduct.stockQty} ${scannedProduct.unit} In Stock` : "Out of Stock"}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {scannedProduct.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Category: <span className="font-semibold text-slate-700 dark:text-slate-300">{scannedProduct.category || "General"}</span> • Brand: <span className="font-semibold text-slate-700 dark:text-slate-300">{scannedProduct.brand || "N/A"}</span>
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xl font-black text-slate-900 dark:text-slate-50">
                    {formatCurrency(scannedProduct.unitPrice, scannedProduct.currency)}
                  </span>
                  <p className="text-[11px] text-slate-500">Unit Price</p>
                </div>
              </div>

              {/* Multi-Warehouse Stock Breakdown */}
              {scannedProduct.warehouseBreakdown && scannedProduct.warehouseBreakdown.length > 0 && (
                <div className="border-t border-slate-200 dark:border-slate-700/60 pt-3">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                    <Warehouse className="h-3.5 w-3.5 text-indigo-500" />
                    Facility Stock Breakdown
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {scannedProduct.warehouseBreakdown.map((wb: any) => (
                      <div
                        key={wb.warehouseId}
                        className={`p-2 rounded-lg border flex flex-col ${selectedWarehouseId === wb.warehouseId ? "bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"}`}
                        onClick={() => setSelectedWarehouseId(wb.warehouseId)}
                        role="button"
                      >
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{wb.warehouseName}</span>
                        <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                          {wb.quantity} {scannedProduct.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fast Warehouse Actions */}
              {mode === "inventory" && (
                <div className="border-t border-slate-200 dark:border-slate-700/60 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5 text-amber-500" />
                      Instant Stock Adjustment
                    </Label>
                    <span className="text-[11px] text-slate-500">Target Warehouse: {warehouses.find(w => w.id === selectedWarehouseId)?.name || "Default"}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-1">
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="Qty"
                        className="bg-white dark:bg-slate-800 text-sm font-semibold"
                        value={actionQty}
                        onChange={(e) => setActionQty(e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Input
                        placeholder="Reason / Reference (e.g. Supplier intake, Scrap)"
                        className="bg-white dark:bg-slate-800 text-xs"
                        value={actionReason}
                        onChange={(e) => setActionReason(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9"
                      onClick={() => handleQuickAction("IN")}
                      disabled={isSubmittingAction}
                    >
                      <PlusCircle className="h-4 w-4" />
                      Quick Stock In (+)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-semibold text-xs h-9"
                      onClick={() => handleQuickAction("OUT")}
                      disabled={isSubmittingAction}
                    >
                      <MinusCircle className="h-4 w-4" />
                      Quick Stock Out (-)
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/20">
              <Package className="h-10 w-10 text-slate-400 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Awaiting Barcode Input
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Scan any product with your USB/Bluetooth barcode scanner gun, switch on the camera, or type an SKU above to inspect stock and make adjustments.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
