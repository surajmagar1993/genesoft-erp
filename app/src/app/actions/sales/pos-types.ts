// ============================================
// POS — Point of Sale Type Definitions
// ============================================

export interface POSProductItem {
  id: string
  name: string
  sku: string | null
  barcode?: string | null
  category: string | null
  unitPrice: number
  currency: string
  unit: string
  hsnSacCode: string | null
  stockQty: number
  imageUrl: string | null
  type: "PRODUCT" | "SERVICE"
}

export interface POSCartItem {
  productId: string
  name: string
  sku: string | null
  hsnSacCode: string | null
  unitPrice: number
  qty: number
  unit: string
  lineTotal: number
}

export interface POSTransactionData {
  contactId: string | null
  customerName: string
  customerPhone: string | null
  paymentMethod: "CASH" | "CARD" | "UPI" | "OTHER"
  items: POSCartItem[]
  subtotal: number
  taxAmount: number
  total: number
  amountReceived: number
  changeGiven: number
  sessionId: string | null
  notes: string | null
}

export interface POSSessionRecord {
  id: string
  openedBy: string
  openedAt: string
  closedAt: string | null
  openingCash: number
  closingCash: number | null
  totalSales: number
  totalTx: number
  status: string
  notes: string | null
}

export interface POSSaleResult {
  success: boolean
  invoiceId?: string
  invoiceNumber?: string
  error?: string
}
