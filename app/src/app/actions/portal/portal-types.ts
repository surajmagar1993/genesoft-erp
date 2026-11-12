// ============================================
// Customer Portal — Type Definitions
// ============================================

export interface PortalProfile {
  id: string
  displayName: string
  email: string | null
  phone: string | null
  companyName: string | null
  currencyCode: string
  balance: number
  creditLimit: number | null
  customerGroup: string | null
  // Tenant branding
  tenantName: string
  tenantLogoUrl: string | null
  tenantEmail: string | null
  tenantPhone: string | null
  tenantWebsite: string | null
}

export interface PortalInvoiceRecord {
  id: string
  invoiceNumber: string
  status: string
  invoiceDate: string
  dueDate: string | null
  subtotal: number
  taxAmount: number
  total: number
  currencyCode: string
  paidAmount: number
  balanceDue: number
}

export interface PortalPaymentRecord {
  id: string
  amount: number
  paymentDate: string
  paymentMethod: string
  reference: string | null
  currencyCode: string
  invoiceNumber: string | null
}

export interface PortalStatementEntry {
  id: string
  date: string
  description: string
  type: "INVOICE" | "PAYMENT" | "CREDIT_NOTE" | "ADJUSTMENT"
  debit: number
  credit: number
  runningBalance: number
  reference: string | null
}

export interface PortalTicketRecord {
  id: string
  subject: string
  category: string
  status: string
  priority: string
  createdAt: string
  updatedAt: string
  messageCount: number
  lastMessage: string | null
}

export interface PortalTicketMessageRecord {
  id: string
  senderName: string
  content: string
  isFromCustomer: boolean
  createdAt: string
}

export interface PortalTicketDetail extends PortalTicketRecord {
  messages: PortalTicketMessageRecord[]
}

export interface PortalDashboardData {
  profile: PortalProfile
  outstandingBalance: number
  totalInvoices: number
  overdueInvoices: number
  recentInvoices: PortalInvoiceRecord[]
  recentPayments: PortalPaymentRecord[]
  openTickets: number
}
