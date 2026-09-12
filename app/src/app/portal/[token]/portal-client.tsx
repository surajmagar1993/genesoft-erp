"use client"

import { useState, useEffect, useCallback } from "react"
import {
  getPortalDashboard,
  getPortalInvoices,
  getPortalPayments,
  getPortalStatement,
  getPortalTickets,
  getPortalTicketDetail,
  createPortalTicket,
  addPortalTicketMessage,
  payPortalInvoice,
} from "@/app/actions/portal/portal"
import type {
  PortalDashboardData,
  PortalInvoiceRecord,
  PortalPaymentRecord,
  PortalStatementEntry,
  PortalTicketRecord,
  PortalTicketDetail,
} from "@/app/actions/portal/portal-types"

// ────────────────────────────────────────────
// Icons (inline SVG for standalone portal — no lucide dependency needed at runtime)
// ────────────────────────────────────────────

function IconHome({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  )
}

function IconFileText({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" />
    </svg>
  )
}

function IconCreditCard({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  )
}

function IconBookOpen({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 7v14" /><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
    </svg>
  )
}

function IconHeadphones({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
    </svg>
  )
}

function IconArrowLeft({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 19-7-7 7-7" /><path d="M19 12H5" />
    </svg>
  )
}

function IconSend({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
      <path d="m21.854 2.147-10.94 10.939" />
    </svg>
  )
}

function IconDownload({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  )
}

function IconPlus({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" /><path d="M12 5v14" />
    </svg>
  )
}

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

function formatCurrency(amount: number, code: string = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: code,
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function statusColor(status: string) {
  const map: Record<string, string> = {
    PAID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    SENT: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    VIEWED: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400",
    PARTIALLY_PAID: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    OVERDUE: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
    DRAFT: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    CANCELLED: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500",
    OPEN: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    IN_PROGRESS: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    RESOLVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    CLOSED: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500",
  }
  return map[status] || "bg-slate-100 text-slate-600"
}

type Tab = "overview" | "invoices" | "payments" | "statement" | "support"

// ────────────────────────────────────────────
// Main Portal Client
// ────────────────────────────────────────────

export function PortalClient({
  token,
  contactName,
  tenantName,
  tenantLogoUrl,
}: {
  token: string
  contactName: string
  tenantName: string
  tenantLogoUrl: string | null
}) {
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [dashData, setDashData] = useState<PortalDashboardData | null>(null)
  const [invoices, setInvoices] = useState<PortalInvoiceRecord[]>([])
  const [payments, setPayments] = useState<PortalPaymentRecord[]>([])
  const [statement, setStatement] = useState<PortalStatementEntry[]>([])
  const [tickets, setTickets] = useState<PortalTicketRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Ticket detail
  const [ticketDetail, setTicketDetail] = useState<PortalTicketDetail | null>(null)
  const [ticketReply, setTicketReply] = useState("")
  const [showNewTicket, setShowNewTicket] = useState(false)
  const [newTicket, setNewTicket] = useState({ subject: "", category: "general", message: "" })

  const loadTab = useCallback(
    async (tab: Tab) => {
      setLoading(true)
      try {
        switch (tab) {
          case "overview":
            setDashData(await getPortalDashboard(token))
            break
          case "invoices":
            setInvoices(await getPortalInvoices(token))
            break
          case "payments":
            setPayments(await getPortalPayments(token))
            break
          case "statement":
            setStatement(await getPortalStatement(token))
            break
          case "support":
            setTickets(await getPortalTickets(token))
            break
        }
      } finally {
        setLoading(false)
      }
    },
    [token]
  )

  useEffect(() => {
    loadTab(activeTab)
  }, [activeTab, loadTab])

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    setTicketDetail(null)
    setShowNewTicket(false)
  }

  const openTicket = async (ticketId: string) => {
    setLoading(true)
    const detail = await getPortalTicketDetail(token, ticketId)
    setTicketDetail(detail)
    setLoading(false)
  }

  const handleCreateTicket = async () => {
    if (!newTicket.subject.trim() || !newTicket.message.trim()) return
    setLoading(true)
    await createPortalTicket(token, newTicket)
    setNewTicket({ subject: "", category: "general", message: "" })
    setShowNewTicket(false)
    setTickets(await getPortalTickets(token))
    setLoading(false)
  }

  const handleReply = async () => {
    if (!ticketDetail || !ticketReply.trim()) return
    setLoading(true)
    await addPortalTicketMessage(token, ticketDetail.id, ticketReply)
    setTicketReply("")
    const updated = await getPortalTicketDetail(token, ticketDetail.id)
    setTicketDetail(updated)
    setLoading(false)
  }

  const currency = dashData?.profile.currencyCode || "INR"

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <IconHome className="w-4 h-4" /> },
    { id: "invoices", label: "Invoices", icon: <IconFileText className="w-4 h-4" /> },
    { id: "payments", label: "Payments", icon: <IconCreditCard className="w-4 h-4" /> },
    { id: "statement", label: "Statement", icon: <IconBookOpen className="w-4 h-4" /> },
    { id: "support", label: "Support", icon: <IconHeadphones className="w-4 h-4" /> },
  ]

  return (
    <>
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {tenantLogoUrl ? (
              <img src={tenantLogoUrl} alt={tenantName} className="h-8 w-8 rounded-lg object-contain bg-white dark:bg-slate-800 p-0.5" />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                {tenantName.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-sm font-semibold text-slate-900 dark:text-white">{tenantName}</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Customer Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-xs">
              {contactName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 hidden sm:inline">{contactName}</span>
          </div>
        </div>
      </header>

      {/* ── Tab Navigation ── */}
      <nav className="sticky top-[57px] z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-200 ${
                activeTab === tab.id
                  ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Content ── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === "overview" && dashData && <OverviewTab data={dashData} currency={currency} onNavigate={handleTabChange} />}
            {activeTab === "invoices" && (
              <InvoicesTab
                invoices={invoices}
                currency={currency}
                token={token}
                onRefresh={() => loadTab("invoices")}
              />
            )}
            {activeTab === "payments" && <PaymentsTab payments={payments} currency={currency} />}
            {activeTab === "statement" && <StatementTab entries={statement} currency={currency} />}
            {activeTab === "support" && !ticketDetail && !showNewTicket && (
              <SupportTab tickets={tickets} onOpen={openTicket} onNew={() => setShowNewTicket(true)} />
            )}
            {activeTab === "support" && showNewTicket && (
              <NewTicketForm
                data={newTicket}
                onChange={setNewTicket}
                onSubmit={handleCreateTicket}
                onCancel={() => setShowNewTicket(false)}
              />
            )}
            {activeTab === "support" && ticketDetail && (
              <TicketDetailView
                ticket={ticketDetail}
                reply={ticketReply}
                onReplyChange={setTicketReply}
                onSend={handleReply}
                onBack={() => setTicketDetail(null)}
              />
            )}
          </>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 dark:border-slate-800 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-center text-xs text-slate-400 dark:text-slate-600">
          Powered by {tenantName} • Customer Portal
        </div>
      </footer>
    </>
  )
}

// ════════════════════════════════════════════
// OVERVIEW TAB
// ════════════════════════════════════════════

function OverviewTab({
  data,
  currency,
  onNavigate,
}: {
  data: PortalDashboardData
  currency: string
  onNavigate: (tab: Tab) => void
}) {
  const cards = [
    {
      label: "Outstanding Balance",
      value: formatCurrency(data.outstandingBalance, currency),
      color: "from-indigo-500 to-blue-600",
      textColor: "text-white",
    },
    {
      label: "Total Invoices",
      value: data.totalInvoices.toString(),
      color: "from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900",
      textColor: "text-slate-900 dark:text-white",
    },
    {
      label: "Overdue Invoices",
      value: data.overdueInvoices.toString(),
      color: data.overdueInvoices > 0
        ? "from-red-500 to-rose-600"
        : "from-emerald-500 to-teal-600",
      textColor: "text-white",
    },
    {
      label: "Open Tickets",
      value: data.openTickets.toString(),
      color: "from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900",
      textColor: "text-slate-900 dark:text-white",
    },
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Welcome back, {data.profile.displayName}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Here&apos;s your account overview
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl bg-gradient-to-br ${card.color} p-5 shadow-sm`}
          >
            <p className={`text-xs font-medium ${card.textColor} opacity-80`}>{card.label}</p>
            <p className={`text-2xl font-bold mt-2 ${card.textColor}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Invoices */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-semibold text-slate-900 dark:text-white">Recent Invoices</h3>
          <button onClick={() => onNavigate("invoices")} className="text-sm text-indigo-500 hover:text-indigo-600 font-medium">
            View all →
          </button>
        </div>
        {data.recentInvoices.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No invoices yet</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.recentInvoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div>
                  <p className="font-medium text-sm text-slate-900 dark:text-white">{inv.invoiceNumber}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{formatDate(inv.invoiceDate)}</p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor(inv.status)}`}>
                    {inv.status.replace(/_/g, " ")}
                  </span>
                  <span className="font-semibold text-sm text-slate-900 dark:text-white">
                    {formatCurrency(inv.total, inv.currencyCode)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Payments */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-semibold text-slate-900 dark:text-white">Recent Payments</h3>
          <button onClick={() => onNavigate("payments")} className="text-sm text-indigo-500 hover:text-indigo-600 font-medium">
            View all →
          </button>
        </div>
        {data.recentPayments.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No payments recorded</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.recentPayments.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div>
                  <p className="font-medium text-sm text-slate-900 dark:text-white">{formatCurrency(p.amount, p.currencyCode)}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{p.paymentMethod.replace(/_/g, " ")} • {formatDate(p.paymentDate)}</p>
                </div>
                {p.invoiceNumber && (
                  <span className="text-xs text-slate-400">→ {p.invoiceNumber}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════
// INVOICES TAB
// ════════════════════════════════════════════

function InvoicesTab({
  invoices,
  currency,
  token,
  onRefresh,
}: {
  invoices: PortalInvoiceRecord[]
  currency: string
  token: string
  onRefresh?: () => void
}) {
  const [filter, setFilter] = useState<string>("ALL")
  const [payInvoice, setPayInvoice] = useState<PortalInvoiceRecord | null>(null)
  const [payGateway, setPayGateway] = useState<"STRIPE" | "PAYPAL">("STRIPE")
  const [paying, setPaying] = useState(false)
  const [paySuccessMsg, setPaySuccessMsg] = useState<string | null>(null)

  const filtered = filter === "ALL" ? invoices : invoices.filter((i) => i.status === filter)

  const statuses = ["ALL", "SENT", "VIEWED", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"]

  const handleExecutePayment = async () => {
    if (!payInvoice) return
    setPaying(true)
    try {
      const res = await payPortalInvoice(token, payInvoice.id, payGateway)
      if (res.success) {
        setPaySuccessMsg(res.message)
        onRefresh?.()
      } else {
        alert(res.error || res.message)
      }
    } catch (err: any) {
      alert(err.message || "Payment failed")
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Invoices</h2>
        <span className="text-sm text-slate-500">{invoices.length} total</span>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              filter === s
                ? "bg-indigo-500 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {s.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* Invoice List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <IconFileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No invoices found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inv) => (
            <div
              key={inv.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-white">{inv.invoiceNumber}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(inv.status)}`}>
                      {inv.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Issued {formatDate(inv.invoiceDate)}
                    {inv.dueDate && ` • Due ${formatDate(inv.dueDate)}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900 dark:text-white">{formatCurrency(inv.total, inv.currencyCode)}</p>
                  {inv.balanceDue > 0 && inv.status !== "PAID" && (
                    <p className="text-xs text-red-500 mt-0.5">
                      Due: {formatCurrency(inv.balanceDue, inv.currencyCode)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex gap-4 text-xs text-slate-500">
                  <span>Subtotal: {formatCurrency(inv.subtotal, inv.currencyCode)}</span>
                  <span>Tax: {formatCurrency(inv.taxAmount, inv.currencyCode)}</span>
                </div>
                <div className="flex items-center gap-3">
                  {inv.balanceDue > 0 && inv.status !== "PAID" && (
                    <button
                      type="button"
                      onClick={() => {
                        setPayInvoice(inv)
                        setPaySuccessMsg(null)
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all"
                    >
                      <IconCreditCard className="w-3.5 h-3.5" />
                      Pay Online
                    </button>
                  )}
                  <a
                    href={`/api/portal/invoice/${inv.id}?token=${token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium text-indigo-500 hover:text-indigo-600 transition-colors"
                  >
                    <IconDownload className="w-3.5 h-3.5" />
                    Download PDF
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Online Checkout Modal */}
      {payInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Online Invoice Settlement</h3>
                <p className="text-xs text-slate-500">Invoice: {payInvoice.invoiceNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setPayInvoice(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              {paySuccessMsg ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
                  <div className="w-10 h-10 mx-auto rounded-full bg-emerald-500 text-white flex items-center justify-center text-lg font-bold">
                    ✓
                  </div>
                  <h4 className="font-bold text-emerald-800 dark:text-emerald-300 text-sm">Payment Successful!</h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">{paySuccessMsg}</p>
                  <button
                    type="button"
                    onClick={() => setPayInvoice(null)}
                    className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"
                  >
                    Close & Return
                  </button>
                </div>
              ) : (
                <>
                  {/* Amount breakdown */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-slate-500">Total Outstanding Balance</p>
                      <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                        {formatCurrency(payInvoice.balanceDue, payInvoice.currencyCode)}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                      Instant Settlement
                    </span>
                  </div>

                  {/* Gateway selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Select Payment Method
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPayGateway("STRIPE")}
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                          payGateway === "STRIPE"
                            ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 shadow-sm"
                            : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <span className="text-xs font-bold">Credit / Debit Card</span>
                        <span className="text-[10px] text-slate-500 mt-1">Stripe, Apple/Google Pay</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPayGateway("PAYPAL")}
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                          payGateway === "PAYPAL"
                            ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 shadow-sm"
                            : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <span className="text-xs font-bold">PayPal</span>
                        <span className="text-[10px] text-slate-500 mt-1">Wallet & Pay in 4</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 text-center">
                    🔒 256-bit encrypted secure checkout. Your financial details never touch our servers.
                  </p>

                  <button
                    type="button"
                    disabled={paying}
                    onClick={handleExecutePayment}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    {paying ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Processing Settlement...
                      </>
                    ) : (
                      <>Pay {formatCurrency(payInvoice.balanceDue, payInvoice.currencyCode)} Now</>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════
// PAYMENTS TAB
// ════════════════════════════════════════════

function PaymentsTab({
  payments,
  currency,
}: {
  payments: PortalPaymentRecord[]
  currency: string
}) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Payment History</h2>
        <span className="text-sm text-slate-500">{payments.length} payments</span>
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <IconCreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No payments recorded</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Method</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Reference</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDate(p.paymentDate)}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(p.amount, p.currencyCode)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.paymentMethod.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-slate-500">{p.reference || "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{p.invoiceNumber || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════
// STATEMENT TAB
// ════════════════════════════════════════════

function StatementTab({
  entries,
  currency,
}: {
  entries: PortalStatementEntry[]
  currency: string
}) {
  const closingBalance = entries.length > 0 ? entries[entries.length - 1].runningBalance : 0

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Account Statement</h2>
        <div className="text-right">
          <p className="text-xs text-slate-500">Closing Balance</p>
          <p className={`text-lg font-bold ${closingBalance > 0 ? "text-red-500" : "text-emerald-500"}`}>
            {formatCurrency(Math.abs(closingBalance), currency)}
            <span className="text-xs font-normal ml-1">{closingBalance > 0 ? "DR" : closingBalance < 0 ? "CR" : ""}</span>
          </p>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <IconBookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No transactions found</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Debit</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Credit</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatDate(e.date)}</td>
                    <td className="px-4 py-3 text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            e.type === "INVOICE" ? "bg-blue-500" : e.type === "PAYMENT" ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                        />
                        {e.description}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-red-500 font-medium">
                      {e.debit > 0 ? formatCurrency(e.debit, currency) : ""}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-500 font-medium">
                      {e.credit > 0 ? formatCurrency(e.credit, currency) : ""}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(Math.abs(e.runningBalance), currency)}
                      <span className="text-xs font-normal text-slate-400 ml-1">
                        {e.runningBalance > 0 ? "DR" : e.runningBalance < 0 ? "CR" : ""}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════
// SUPPORT TAB
// ════════════════════════════════════════════

function SupportTab({
  tickets,
  onOpen,
  onNew,
}: {
  tickets: PortalTicketRecord[]
  onOpen: (id: string) => void
  onNew: () => void
}) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Support Tickets</h2>
        <button
          onClick={onNew}
          className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          <IconPlus className="w-4 h-4" />
          New Ticket
        </button>
      </div>

      {tickets.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <IconHeadphones className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No support tickets</p>
          <p className="text-xs mt-1">Create a new ticket if you need help</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <button
              key={t.id}
              onClick={() => onOpen(t.id)}
              className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-white">{t.subject}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(t.status)}`}>
                      {t.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {t.category.charAt(0).toUpperCase() + t.category.slice(1)} • {formatDate(t.createdAt)} • {t.messageCount} messages
                  </p>
                </div>
              </div>
              {t.lastMessage && (
                <p className="text-xs text-slate-400 mt-2 line-clamp-1">{t.lastMessage}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════
// NEW TICKET FORM
// ════════════════════════════════════════════

function NewTicketForm({
  data,
  onChange,
  onSubmit,
  onCancel,
}: {
  data: { subject: string; category: string; message: string }
  onChange: (d: { subject: string; category: string; message: string }) => void
  onSubmit: () => void
  onCancel: () => void
}) {
  const categories = [
    { value: "general", label: "General Inquiry" },
    { value: "billing", label: "Billing & Payments" },
    { value: "technical", label: "Technical Issue" },
    { value: "feedback", label: "Feedback" },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <IconArrowLeft className="w-4 h-4 text-slate-500" />
        </button>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">New Support Ticket</h2>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Subject</label>
          <input
            type="text"
            value={data.subject}
            onChange={(e) => onChange({ ...data, subject: e.target.value })}
            placeholder="Briefly describe your issue..."
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Category</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => onChange({ ...data, category: cat.value })}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  data.category === cat.value
                    ? "bg-indigo-500 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Message</label>
          <textarea
            value={data.message}
            onChange={(e) => onChange({ ...data, message: e.target.value })}
            placeholder="Describe your issue in detail..."
            rows={5}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={!data.subject.trim() || !data.message.trim()}
            className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            <IconSend className="w-3.5 h-3.5" />
            Submit Ticket
          </button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════
// TICKET DETAIL VIEW
// ════════════════════════════════════════════

function TicketDetailView({
  ticket,
  reply,
  onReplyChange,
  onSend,
  onBack,
}: {
  ticket: PortalTicketDetail
  reply: string
  onReplyChange: (v: string) => void
  onSend: () => void
  onBack: () => void
}) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <IconArrowLeft className="w-4 h-4 text-slate-500" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{ticket.subject}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(ticket.status)}`}>
              {ticket.status.replace(/_/g, " ")}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {ticket.category.charAt(0).toUpperCase() + ticket.category.slice(1)} • Opened {formatDate(ticket.createdAt)}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-4">
        {ticket.messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.isFromCustomer ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.isFromCustomer
                  ? "bg-indigo-500 text-white rounded-br-md"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-md"
              }`}
            >
              <p className={`text-xs font-medium mb-1 ${msg.isFromCustomer ? "text-indigo-100" : "text-slate-500"}`}>
                {msg.senderName}
              </p>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              <p className={`text-xs mt-2 ${msg.isFromCustomer ? "text-indigo-200" : "text-slate-400"}`}>
                {formatDate(msg.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Reply Box */}
      {ticket.status !== "CLOSED" && (
        <div className="flex gap-3 items-end">
          <textarea
            value={reply}
            onChange={(e) => onReplyChange(e.target.value)}
            placeholder="Type your reply..."
            rows={2}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
          />
          <button
            onClick={onSend}
            disabled={!reply.trim()}
            className="p-3 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors shadow-sm"
          >
            <IconSend className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
