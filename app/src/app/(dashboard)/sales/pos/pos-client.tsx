"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  getPOSProducts,
  searchPOSProducts,
  createPOSSale,
  getActivePOSSession,
  openPOSSession,
  closePOSSession,
  searchPOSCustomers,
  quickCreateWalkInContact,
} from "@/app/actions/sales/pos"
import type {
  POSProductItem,
  POSCartItem,
  POSSessionRecord,
  POSSaleResult,
} from "@/app/actions/sales/pos-types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Receipt,
  CreditCard,
  Banknote,
  Smartphone,
  User,
  UserPlus,
  X,
  CheckCircle2,
  Clock,
  Package,
  Monitor,
  Printer,
  ScanLine,
} from "lucide-react"
import { BarcodeScannerModal } from "@/components/inventory/barcode-scanner-modal"
import { toast } from "sonner"

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

function formatCurrency(amount: number, code = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: code,
    minimumFractionDigits: 2,
  }).format(amount)
}

// ────────────────────────────────────────────
// Main POS Client
// ────────────────────────────────────────────

export function POSClient() {
  // Products
  const [products, setProducts] = useState<POSProductItem[]>([])
  const [filteredProducts, setFilteredProducts] = useState<POSProductItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("ALL")
  const [loading, setLoading] = useState(true)

  // Cart
  const [cart, setCart] = useState<POSCartItem[]>([])

  // Customer
  const [customerName, setCustomerName] = useState("Walk-In Customer")
  const [customerPhone, setCustomerPhone] = useState("")
  const [contactId, setContactId] = useState<string | null>(null)
  const [customerSearch, setCustomerSearch] = useState("")
  const [customerResults, setCustomerResults] = useState<
    { id: string; displayName: string; phone: string | null; email: string | null }[]
  >([])
  const [showCustomerDialog, setShowCustomerDialog] = useState(false)

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "UPI" | "OTHER">("CASH")
  const [amountReceived, setAmountReceived] = useState<string>("")
  const [showCheckout, setShowCheckout] = useState(false)

  // Session
  const [session, setSession] = useState<POSSessionRecord | null>(null)
  const [showSessionDialog, setShowSessionDialog] = useState(false)
  const [sessionOpeningCash, setSessionOpeningCash] = useState("")
  const [sessionStaffName, setSessionStaffName] = useState("")
  const [showCloseSession, setShowCloseSession] = useState(false)
  const [closingCash, setClosingCash] = useState("")

  const [showReceipt, setShowReceipt] = useState(false)
  const [lastSale, setLastSale] = useState<POSSaleResult | null>(null)
  const [lastTotal, setLastTotal] = useState(0)
  const [showScannerModal, setShowScannerModal] = useState(false)

  const searchRef = useRef<HTMLInputElement>(null)
  const posBufferRef = useRef<{ keys: string[]; lastTime: number }>({ keys: [], lastTime: 0 })

  // ── Load products & session ──
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      const [prods, activeSession] = await Promise.all([
        getPOSProducts(),
        getActivePOSSession(),
      ])
      setProducts(prods)
      setFilteredProducts(prods)
      setSession(activeSession)
      if (!activeSession) setShowSessionDialog(true)
      setLoading(false)
    }
    init()
  }, [])

  // ── Categories ──
  const categories = ["ALL", ...Array.from(new Set(products.map((p) => p.category || "Uncategorized")))]

  // ── Search & Filter ──
  useEffect(() => {
    let result = products
    if (selectedCategory !== "ALL") {
      result = result.filter((p) => (p.category || "Uncategorized") === selectedCategory)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q)
      )
    }
    setFilteredProducts(result)
  }, [searchQuery, selectedCategory, products])

  // ── Cart Operations ──
  const addToCart = useCallback((product: POSProductItem) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id)
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, qty: item.qty + 1, lineTotal: (item.qty + 1) * item.unitPrice }
            : item
        )
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          hsnSacCode: product.hsnSacCode,
          unitPrice: product.unitPrice,
          qty: 1,
          unit: product.unit,
          lineTotal: product.unitPrice,
        },
      ]
    })
  }, [])

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId
            ? { ...item, qty: Math.max(0, item.qty + delta), lineTotal: Math.max(0, item.qty + delta) * item.unitPrice }
            : item
        )
        .filter((item) => item.qty > 0)
    )
  }

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId))
  }

  const clearCart = () => {
    setCart([])
    setCustomerName("Walk-In Customer")
    setCustomerPhone("")
    setContactId(null)
    setAmountReceived("")
    setPaymentMethod("CASH")
  }

  // ── Totals ──
  const subtotal = cart.reduce((s, item) => s + item.lineTotal, 0)
  const taxAmount = 0 // GST computed in full invoice flow; POS uses simple totals
  const total = subtotal + taxAmount

  // ── Customer Search ──
  const handleCustomerSearch = async (q: string) => {
    setCustomerSearch(q)
    if (q.trim().length >= 2) {
      const results = await searchPOSCustomers(q)
      setCustomerResults(results)
    } else {
      setCustomerResults([])
    }
  }

  const selectCustomer = (c: { id: string; displayName: string; phone: string | null }) => {
    setContactId(c.id)
    setCustomerName(c.displayName)
    setCustomerPhone(c.phone || "")
    setShowCustomerDialog(false)
    setCustomerSearch("")
    setCustomerResults([])
  }

  const createWalkIn = async () => {
    if (!customerName.trim()) return
    const contact = await quickCreateWalkInContact(customerName, customerPhone || undefined)
    setContactId(contact.id)
    setShowCustomerDialog(false)
  }

  // ── Open Session ──
  const handleOpenSession = async () => {
    if (!sessionStaffName.trim()) return
    const s = await openPOSSession(
      parseFloat(sessionOpeningCash) || 0,
      sessionStaffName
    )
    setSession(s)
    setShowSessionDialog(false)
  }

  // ── Close Session ──
  const handleCloseSession = async () => {
    if (!session) return
    await closePOSSession(session.id, parseFloat(closingCash) || 0)
    setSession(null)
    setShowCloseSession(false)
    setShowSessionDialog(true)
  }

  // ── Complete Sale ──
  const handleCompleteSale = async () => {
    if (cart.length === 0) return

    const result = await createPOSSale({
      contactId,
      customerName,
      customerPhone: customerPhone || null,
      paymentMethod,
      items: cart,
      subtotal,
      taxAmount,
      total,
      amountReceived: parseFloat(amountReceived) || total,
      changeGiven: Math.max(0, (parseFloat(amountReceived) || total) - total),
      sessionId: session?.id || null,
      notes: null,
    })

    setLastSale(result)
    setLastTotal(total)
    setShowCheckout(false)
    setShowReceipt(true)

    if (result.success && session) {
      setSession({
        ...session,
        totalSales: session.totalSales + total,
        totalTx: session.totalTx + 1,
      })
    }

    clearCart()
  }

  // ── Keyboard shortcut: focus search on / ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInputFocused = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")

      if (e.key === "/" && !isInputFocused) {
        e.preventDefault()
        searchRef.current?.focus()
        return
      }
      if (e.key === "F9") {
        e.preventDefault()
        if (cart.length > 0) setShowCheckout(true)
        return
      }

      // Barcode Scanner Wedge Auto-Detection (< 80ms keystroke intervals)
      const now = Date.now()
      const timeDiff = now - posBufferRef.current.lastTime

      if (e.key === "Enter") {
        if (posBufferRef.current.keys.length >= 3 && timeDiff < 80) {
          const barcode = posBufferRef.current.keys.join("").trim().toLowerCase()
          posBufferRef.current = { keys: [], lastTime: 0 }
          
          const matched = products.find(
            (p) =>
              (p as any).barcode?.toLowerCase() === barcode ||
              p.sku?.toLowerCase() === barcode ||
              p.id.toLowerCase() === barcode
          )
          if (matched) {
            addToCart(matched)
            toast.success(`Scanned & Added: ${matched.name}`)
          } else {
            toast.error(`Barcode not found: ${barcode}`)
          }
        } else {
          posBufferRef.current = { keys: [], lastTime: 0 }
        }
        return
      }

      if (e.key.length === 1 && !isInputFocused) {
        if (timeDiff > 80) {
          posBufferRef.current.keys = [e.key]
        } else {
          posBufferRef.current.keys.push(e.key)
        }
        posBufferRef.current.lastTime = now
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [cart, products, addToCart])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] -m-6 -mt-2">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 dark:bg-black text-white border-b border-slate-700">
        <div className="flex items-center gap-3">
          <Monitor className="w-5 h-5 text-indigo-400" />
          <span className="font-bold text-sm">POS Terminal</span>
          {session && (
            <Badge variant="outline" className="border-emerald-500 text-emerald-400 text-xs">
              <Clock className="w-3 h-3 mr-1" />
              {session.openedBy} • {session.totalTx} sales • {formatCurrency(session.totalSales)}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {session && (
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white text-xs"
              onClick={() => setShowCloseSession(true)}
            >
              Close Shift
            </Button>
          )}
        </div>
      </div>

      {/* ── Main Split ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ════ LEFT: Product Grid ════ */}
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
          {/* Search & Scanner */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                ref={searchRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Search products or scan barcode... (press "/" to focus)'
                className="pl-9 bg-white dark:bg-slate-900"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 h-9 text-xs font-semibold text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
              onClick={() => setShowScannerModal(true)}
              title="Open Barcode Scanner"
            >
              <ScanLine className="h-4 w-4" />
              <span className="hidden sm:inline">Scan Barcode</span>
            </Button>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-1 px-3 py-2 overflow-x-auto scrollbar-hide border-b border-slate-200 dark:border-slate-800">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-indigo-500 text-white shadow-sm"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto p-3">
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Package className="w-12 h-12 mb-3 opacity-30" />
                <p>No products found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="group text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-lg transition-all duration-200 active:scale-[0.97]"
                  >
                    {product.imageUrl ? (
                      <div className="w-full h-16 rounded-lg bg-slate-100 dark:bg-slate-800 mb-2 overflow-hidden">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-16 rounded-lg bg-gradient-to-br from-indigo-50 to-slate-100 dark:from-indigo-950 dark:to-slate-800 mb-2 flex items-center justify-center">
                        <Package className="w-6 h-6 text-indigo-300 dark:text-indigo-700" />
                      </div>
                    )}
                    <p className="font-medium text-xs text-slate-900 dark:text-white truncate">
                      {product.name}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400">
                        {formatCurrency(product.unitPrice)}
                      </span>
                      {product.type === "PRODUCT" && (
                        <span className="text-[10px] text-slate-400">
                          {product.stockQty} in stock
                        </span>
                      )}
                    </div>
                    {product.sku && (
                      <p className="text-[10px] text-slate-400 mt-0.5">{product.sku}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ════ RIGHT: Cart & Checkout ════ */}
        <div className="w-[380px] flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
          {/* Cart Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-indigo-500" />
              <span className="font-semibold text-sm text-slate-900 dark:text-white">
                Cart ({cart.length})
              </span>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-red-500 hover:text-red-600 font-medium"
              >
                Clear
              </button>
            )}
          </div>

          {/* Customer */}
          <button
            onClick={() => setShowCustomerDialog(true)}
            className="flex items-center gap-2 mx-3 mt-3 px-3 py-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 transition-colors text-left"
          >
            <User className="w-4 h-4 text-slate-400" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{customerName}</p>
              {customerPhone && (
                <p className="text-[10px] text-slate-400">{customerPhone}</p>
              )}
            </div>
            <UserPlus className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto px-3 py-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-300 dark:text-slate-600">
                <ShoppingCart className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-xs">Tap products to add</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {formatCurrency(item.unitPrice)} × {item.qty}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQty(item.productId, -1)}
                        className="w-6 h-6 rounded-md bg-slate-200 dark:bg-slate-700 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-slate-900 dark:text-white">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => updateQty(item.productId, 1)}
                        className="w-6 h-6 rounded-md bg-slate-200 dark:bg-slate-700 flex items-center justify-center hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="w-6 h-6 rounded-md flex items-center justify-center text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white w-16 text-right">
                      {formatCurrency(item.lineTotal)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals & Checkout */}
          <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm font-bold text-slate-900 dark:text-white">
              <span>Total</span>
              <span className="text-lg">{formatCurrency(total)}</span>
            </div>

            {/* Payment Method Quick Select */}
            <div className="flex gap-1.5 pt-1">
              {[
                { id: "CASH" as const, icon: Banknote, label: "Cash" },
                { id: "CARD" as const, icon: CreditCard, label: "Card" },
                { id: "UPI" as const, icon: Smartphone, label: "UPI" },
              ].map((pm) => (
                <button
                  key={pm.id}
                  onClick={() => setPaymentMethod(pm.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                    paymentMethod === pm.id
                      ? "bg-indigo-500 text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <pm.icon className="w-3.5 h-3.5" />
                  {pm.label}
                </button>
              ))}
            </div>

            <Button
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 text-sm"
              disabled={cart.length === 0}
              onClick={() => setShowCheckout(true)}
            >
              <Receipt className="w-4 h-4 mr-2" />
              Charge {formatCurrency(total)}
              <span className="ml-2 text-[10px] opacity-70">[F9]</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ════ DIALOGS ════ */}

      {/* Session Open Dialog */}
      <Dialog open={showSessionDialog} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5 text-indigo-500" />
              Open POS Shift
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Staff Name</label>
              <Input
                value={sessionStaffName}
                onChange={(e) => setSessionStaffName(e.target.value)}
                placeholder="Enter your name..."
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Opening Cash</label>
              <Input
                type="number"
                value={sessionOpeningCash}
                onChange={(e) => setSessionOpeningCash(e.target.value)}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleOpenSession}
              disabled={!sessionStaffName.trim()}
              className="w-full bg-indigo-500 hover:bg-indigo-600"
            >
              Start Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Session Dialog */}
      <Dialog open={showCloseSession} onOpenChange={setShowCloseSession}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Close POS Shift</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {session && (
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Staff</span><span className="font-medium">{session.openedBy}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Total Sales</span><span className="font-bold text-emerald-500">{formatCurrency(session.totalSales)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Transactions</span><span className="font-medium">{session.totalTx}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Opening Cash</span><span className="font-medium">{formatCurrency(session.openingCash)}</span></div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Closing Cash Count</label>
              <Input
                type="number"
                value={closingCash}
                onChange={(e) => setClosingCash(e.target.value)}
                placeholder="Count cash in drawer..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseSession(false)}>Cancel</Button>
            <Button onClick={handleCloseSession} className="bg-red-500 hover:bg-red-600 text-white">
              Close Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Selection Dialog */}
      <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={customerSearch}
              onChange={(e) => handleCustomerSearch(e.target.value)}
              placeholder="Search by name, phone, or email..."
            />

            {customerResults.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-1">
                {customerResults.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectCustomer(c)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <p className="text-sm font-medium">{c.displayName}</p>
                    <p className="text-xs text-slate-400">{c.phone || c.email || ""}</p>
                  </button>
                ))}
              </div>
            )}

            <div className="border-t pt-3 space-y-3">
              <p className="text-xs font-medium text-slate-500 uppercase">Quick Walk-In</p>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer name"
              />
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Phone (optional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomerDialog(false)}>Cancel</Button>
            <Button onClick={createWalkIn} className="bg-indigo-500 hover:bg-indigo-600 text-white">
              <UserPlus className="w-4 h-4 mr-2" />
              Use Walk-In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout Confirmation Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Sale</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-5 text-center text-white">
              <p className="text-xs opacity-80">Total Amount</p>
              <p className="text-3xl font-bold mt-1">{formatCurrency(total)}</p>
              <p className="text-xs opacity-70 mt-1">{cart.length} items • {customerName}</p>
            </div>

            <div className="flex gap-2">
              {[
                { id: "CASH" as const, icon: Banknote, label: "Cash" },
                { id: "CARD" as const, icon: CreditCard, label: "Card" },
                { id: "UPI" as const, icon: Smartphone, label: "UPI" },
              ].map((pm) => (
                <button
                  key={pm.id}
                  onClick={() => setPaymentMethod(pm.id)}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-medium transition-all ${
                    paymentMethod === pm.id
                      ? "bg-indigo-500 text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <pm.icon className="w-5 h-5" />
                  {pm.label}
                </button>
              ))}
            </div>

            {paymentMethod === "CASH" && (
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Amount Received</label>
                <Input
                  type="number"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder={total.toFixed(2)}
                  className="mt-1 text-lg font-bold"
                />
                {parseFloat(amountReceived) > total && (
                  <p className="text-sm text-emerald-500 font-bold mt-1">
                    Change: {formatCurrency(parseFloat(amountReceived) - total)}
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckout(false)}>Cancel</Button>
            <Button
              onClick={handleCompleteSale}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="sm:max-w-sm">
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Sale Complete!</h3>
            {lastSale?.invoiceNumber && (
              <p className="text-sm text-slate-500 mt-1">Invoice: {lastSale.invoiceNumber}</p>
            )}
            <p className="text-2xl font-bold text-emerald-500 mt-3">{formatCurrency(lastTotal)}</p>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="outline"
              onClick={() => setShowReceipt(false)}
              className="w-full"
            >
              New Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        mode="pos"
        onProductScanned={(scanned) => {
          const matched = products.find((p) => p.id === scanned.id)
          if (matched) {
            addToCart(matched)
            setShowScannerModal(false)
            toast.success(`Scanned: ${matched.name}`)
          }
        }}
      />
    </div>
  )
}
