"use client"

import React, { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Check,
    CreditCard,
    Sparkles,
    Zap,
    Shield,
    Crown,
    ArrowRight,
    Calendar,
    Receipt,
    Printer,
    AlertTriangle,
    RotateCcw,
    CheckCircle2,
    Clock,
    Lock,
} from "lucide-react"
import {
    PlanTier,
    BillingCycle,
    PLAN_TIERS,
    getRegionalPricing,
    calculateSubscriptionProration,
    SaaSPlatformInvoice,
    formatSaaSInvoiceReceiptHtml,
    getTierRank,
} from "@/lib/saas-subscription-engine"
import {
    executePlanChange,
    getTenantSubscriptionDetails,
} from "@/app/actions/saas/subscription"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface BillingTabProps {
    settings: any
}

export default function BillingTab({ settings }: BillingTabProps) {
    const router = useRouter()
    const currentPlan: PlanTier = (settings?.plan as PlanTier) || "FREE"
    const currency = settings?.currency_code || settings?.currencyCode || "INR"
    const catalog = useMemo(() => getRegionalPricing(currency), [currency])

    // Subscription metadata from tenant settings
    const subSettings = settings?.settings?.subscription || {}
    const initialCycle: BillingCycle = subSettings?.billingCycle === "ANNUAL" ? "ANNUAL" : "MONTHLY"
    const [billingCycle, setBillingCycle] = useState<BillingCycle>(initialCycle)

    // Local subscription state
    const [scheduledDowngrade, setScheduledDowngrade] = useState(subSettings?.scheduledDowngrade || null)
    const [invoices, setInvoices] = useState<SaaSPlatformInvoice[]>(
        Array.isArray(subSettings?.invoices) ? subSettings.invoices : []
    )

    // Plan Change Modal State
    const [targetPlan, setTargetPlan] = useState<PlanTier | null>(null)
    const [isChangeModalOpen, setIsChangeModalOpen] = useState(false)
    const [downgradeImmediate, setDowngradeImmediate] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)

    // Receipt Modal State
    const [selectedInvoice, setSelectedInvoice] = useState<SaaSPlatformInvoice | null>(null)
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)

    // Calculate trial countdown
    const trialDaysRemaining = useMemo(() => {
        if (!settings?.isTrial || !settings?.trialEndsAt) return 0
        const diff = new Date(settings.trialEndsAt).getTime() - Date.now()
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
    }, [settings?.isTrial, settings?.trialEndsAt])

    // Real-time proration quote when targetPlan is selected
    const prorationQuote = useMemo(() => {
        if (!targetPlan) return null
        return calculateSubscriptionProration({
            currentPlan,
            targetPlan,
            currentBillingCycle: initialCycle,
            targetBillingCycle: billingCycle,
            currencyCode: currency,
            cycleEndDate: subSettings?.renewalDate || settings?.trialEndsAt,
        })
    }, [currentPlan, targetPlan, initialCycle, billingCycle, currency, subSettings?.renewalDate, settings?.trialEndsAt])

    // Trigger plan selection
    const handleOpenPlanChange = (tier: PlanTier) => {
        setTargetPlan(tier)
        setDowngradeImmediate(false)
        setIsChangeModalOpen(true)
    }

    // Execute plan change (Upgrade / Downgrade)
    const handleConfirmPlanChange = async () => {
        if (!targetPlan || !prorationQuote) return

        setIsProcessing(true)
        try {
            const res = await executePlanChange({
                targetPlan,
                billingCycle,
                immediate: prorationQuote.isDowngrade ? downgradeImmediate : true,
                paymentReference: `MANUAL-${Date.now()}`,
            })

            if (res.success) {
                toast.success(res.message)
                if (res.invoice) {
                    setInvoices((prev) => [res.invoice!, ...prev])
                }
                if (prorationQuote.isDowngrade && !downgradeImmediate) {
                    setScheduledDowngrade({
                        targetPlan,
                        effectiveDate: prorationQuote.nextBillingDate,
                    })
                } else {
                    setScheduledDowngrade(null)
                }
                setIsChangeModalOpen(false)
                router.refresh()
            } else {
                toast.error(res.error || "Failed to update plan")
            }
        } catch (err: any) {
            console.error(err)
            toast.error(err.message || "An unexpected error occurred")
        } finally {
            setIsProcessing(false)
        }
    }

    // Open Printable Receipt
    const handleViewReceipt = (inv: SaaSPlatformInvoice) => {
        setSelectedInvoice(inv)
        setIsReceiptModalOpen(true)
    }

    const printReceipt = () => {
        if (!selectedInvoice) return
        const win = window.open("", "_blank")
        if (win) {
            win.document.write(formatSaaSInvoiceReceiptHtml(selectedInvoice))
            win.document.close()
            win.focus()
            setTimeout(() => win.print(), 250)
        }
    }

    const tierKeys: PlanTier[] = ["FREE", "BASIC", "PRO", "ENTERPRISE"]

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Current Plan Summary Header */}
            <Card className="border-primary/20 bg-primary/5 relative overflow-hidden backdrop-blur-sm shadow-sm">
                <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12 pointer-events-none">
                    <CreditCard className="h-32 w-32" />
                </div>
                <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-2xl font-bold">
                                    Current Subscription:
                                </CardTitle>
                                <Badge
                                    variant="secondary"
                                    className="text-base font-bold font-mono px-3 py-1 bg-primary/20 text-primary border-primary/30"
                                >
                                    {PLAN_TIERS[currentPlan]?.name || currentPlan}
                                </Badge>
                                <Badge variant="outline" className="text-xs uppercase font-semibold">
                                    {initialCycle}
                                </Badge>
                            </div>

                            <CardDescription className="text-muted-foreground font-medium text-sm">
                                {settings?.isTrial ? (
                                    <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                                        <Clock className="h-4 w-4" />
                                        PRO Trial Active &bull; {trialDaysRemaining} days remaining (ends{" "}
                                        {settings.trialEndsAt ? new Date(settings.trialEndsAt).toLocaleDateString() : "soon"})
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Active Subscription &bull; Next renewal on{" "}
                                        {subSettings?.renewalDate
                                            ? new Date(subSettings.renewalDate).toLocaleDateString()
                                            : "Scheduled cycle"}
                                    </span>
                                )}
                            </CardDescription>
                        </div>

                        {/* Right Summary Badge */}
                        <div className="flex items-center gap-3">
                            {settings?.isTrial && (
                                <div className="text-right bg-card/60 p-2.5 rounded-lg border border-primary/20">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                                        Trial Days Left
                                    </p>
                                    <p className="text-2xl font-black text-primary leading-none mt-0.5">
                                        {trialDaysRemaining}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </CardHeader>

                {/* Scheduled Downgrade Notice Banner */}
                {scheduledDowngrade && (
                    <div className="mx-6 mb-6 p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <span>
                                <strong>Scheduled Downgrade:</strong> Your account will switch to{" "}
                                <strong>{scheduledDowngrade.targetPlan}</strong> on{" "}
                                {new Date(scheduledDowngrade.effectiveDate).toLocaleDateString()}. You will retain current features until then.
                            </span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs border-amber-300"
                            onClick={() => handleOpenPlanChange(currentPlan)}
                        >
                            Cancel Downgrade
                        </Button>
                    </div>
                )}
            </Card>

            {/* Billing Frequency Switcher with 20% Discount Badge */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 py-2">
                <div className="bg-muted p-1 rounded-xl flex items-center border border-border">
                    <button
                        type="button"
                        onClick={() => setBillingCycle("MONTHLY")}
                        className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                            billingCycle === "MONTHLY"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        Monthly Billing
                    </button>
                    <button
                        type="button"
                        onClick={() => setBillingCycle("ANNUAL")}
                        className={`px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                            billingCycle === "ANNUAL"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <span>Annual Billing</span>
                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] py-0">
                            Save 20%
                        </Badge>
                    </button>
                </div>
            </div>

            {/* 4 Plan Tier Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {tierKeys.map((tier) => {
                    const plan = PLAN_TIERS[tier]
                    const isCurrent = tier === currentPlan
                    const currentRank = getTierRank(currentPlan)
                    const thisRank = getTierRank(tier)
                    const isUpgrade = thisRank > currentRank
                    const isDowngrade = thisRank < currentRank

                    const price = billingCycle === "ANNUAL" ? catalog.annual[tier] : catalog.monthly[tier]
                    const priceLabel =
                        price === 0
                            ? `${catalog.symbol}0`
                            : billingCycle === "ANNUAL"
                            ? `${catalog.symbol}${price.toLocaleString()}/yr`
                            : `${catalog.symbol}${price.toLocaleString()}/mo`

                    const isPopular = tier === "PRO"

                    return (
                        <Card
                            key={tier}
                            className={`flex flex-col relative overflow-hidden transition-all duration-200 hover:shadow-lg ${
                                isCurrent
                                    ? "border-primary shadow-md ring-2 ring-primary/30"
                                    : isPopular
                                    ? "border-blue-500/50 shadow-md ring-1 ring-blue-500/30"
                                    : "border-border/60 hover:border-primary/40"
                            }`}
                        >
                            {isPopular && (
                                <div className="absolute top-0 right-0">
                                    <div className="bg-primary text-primary-foreground text-[10px] font-black uppercase px-6 py-1 rotate-45 translate-x-4 translate-y-2 shadow-sm">
                                        Popular
                                    </div>
                                </div>
                            )}

                            <CardHeader className="pb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                        {tier === "FREE" && <Zap className="h-5 w-5" />}
                                        {tier === "BASIC" && <Sparkles className="h-5 w-5" />}
                                        {tier === "PRO" && <Shield className="h-5 w-5" />}
                                        {tier === "ENTERPRISE" && <Crown className="h-5 w-5" />}
                                    </div>
                                    {plan.badge && (
                                        <Badge variant="outline" className="text-[10px] font-semibold">
                                            {plan.badge}
                                        </Badge>
                                    )}
                                </div>

                                <CardTitle className="text-lg font-bold">{plan.name}</CardTitle>
                                <div className="flex items-baseline gap-1 mt-2">
                                    <span className="text-3xl font-black tracking-tight">{priceLabel}</span>
                                </div>
                                <CardDescription className="text-xs mt-1 min-h-[36px] line-clamp-2">
                                    {plan.description}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="flex-1 space-y-4 pt-2">
                                <div className="h-px bg-border/60 w-full" />
                                <div className="space-y-2.5 text-xs">
                                    {plan.features.map((f) => (
                                        <div key={f} className="flex items-start gap-2.5">
                                            <div className="mt-0.5 rounded-full bg-emerald-500/10 p-0.5 shrink-0">
                                                <Check className="h-3 w-3 text-emerald-600 stroke-[3]" />
                                            </div>
                                            <span className="text-muted-foreground">{f}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>

                            <CardFooter className="pt-4 border-t border-border/40">
                                <Button
                                    className={`w-full font-bold text-xs h-10 ${
                                        isCurrent
                                            ? "bg-muted text-muted-foreground hover:bg-muted cursor-default"
                                            : isUpgrade
                                            ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                                    }`}
                                    variant={isCurrent ? "outline" : isUpgrade ? "default" : "secondary"}
                                    disabled={isCurrent}
                                    onClick={() => handleOpenPlanChange(tier)}
                                >
                                    {isCurrent
                                        ? "Current Plan"
                                        : isUpgrade
                                        ? `Upgrade to ${plan.name.split(" ")[0]}`
                                        : `Downgrade to ${plan.name.split(" ")[0]}`}
                                </Button>
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>

            {/* Platform Subscription Invoices Ledger */}
            <Card className="border-primary/10 shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/20 border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <Receipt className="h-5 w-5 text-primary" />
                                Platform Subscription Receipts & Invoices
                            </CardTitle>
                            <CardDescription className="text-xs mt-1">
                                Download official tax invoices and payment receipts for your ERP platform subscription.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Invoice #</TableHead>
                                <TableHead>Plan & Frequency</TableHead>
                                <TableHead>Billing Period</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right pr-6">Receipt</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices.length > 0 ? (
                                invoices.map((inv) => (
                                    <TableRow key={inv.invoiceNumber}>
                                        <TableCell className="font-mono text-xs font-bold text-foreground">
                                            {inv.invoiceNumber}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            <Badge variant="outline" className="text-[10px] font-bold">
                                                {inv.tier} &bull; {inv.billingCycle}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {new Date(inv.periodStart).toLocaleDateString()} &rarr;{" "}
                                            {new Date(inv.periodEnd).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-xs font-bold font-mono">
                                            {catalog.symbol}
                                            {inv.totalAmount.toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold"
                                            >
                                                {inv.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 text-xs gap-1.5"
                                                onClick={() => handleViewReceipt(inv)}
                                            >
                                                <Printer className="h-3.5 w-3.5" /> View Slip
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-xs">
                                        No subscription billing invoices recorded yet. Invoices appear automatically upon tier checkout.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* INTERACTIVE PLAN CHANGE & PRORATION MODAL */}
            <Dialog open={isChangeModalOpen} onOpenChange={setIsChangeModalOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {prorationQuote?.isUpgrade ? (
                                <>
                                    <Sparkles className="h-5 w-5 text-primary" />
                                    Confirm Plan Upgrade
                                </>
                            ) : (
                                <>
                                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                                    Confirm Plan Downgrade
                                </>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            Review pro-rata pricing and feature adjustments for your workspace.
                        </DialogDescription>
                    </DialogHeader>

                    {prorationQuote && targetPlan && (
                        <div className="space-y-5 py-2">
                            {/* Plan Transition Pill */}
                            <div className="p-3.5 rounded-xl border bg-muted/40 flex items-center justify-between">
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-muted-foreground">From</span>
                                    <div className="font-bold text-sm">{PLAN_TIERS[currentPlan].name}</div>
                                </div>
                                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                                <div className="text-right">
                                    <span className="text-[10px] font-bold uppercase text-muted-foreground">To</span>
                                    <div className="font-bold text-sm text-primary">
                                        {PLAN_TIERS[targetPlan].name} ({billingCycle})
                                    </div>
                                </div>
                            </div>

                            {/* Proration Financial Breakdown */}
                            <div className="border rounded-xl p-4 bg-card space-y-2.5 text-xs">
                                <div className="font-bold text-foreground text-xs uppercase tracking-wider">
                                    Proration Breakdown
                                </div>
                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span>Target Plan Fee ({billingCycle}):</span>
                                    <span className="font-mono font-semibold text-foreground">
                                        {prorationQuote.symbol}
                                        {prorationQuote.targetPlanGross.toFixed(2)}
                                    </span>
                                </div>
                                {prorationQuote.unusedCredit > 0 && (
                                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                                        <span>
                                            Unused Credit from Current Cycle ({prorationQuote.daysRemaining} days):
                                        </span>
                                        <span className="font-mono font-semibold">
                                            -{prorationQuote.symbol}
                                            {prorationQuote.unusedCredit.toFixed(2)}
                                        </span>
                                    </div>
                                )}
                                <div className="pt-2 border-t flex items-center justify-between text-sm font-bold text-foreground">
                                    <span>Total Payable Today:</span>
                                    <span className="text-lg font-black text-primary font-mono">
                                        {prorationQuote.symbol}
                                        {prorationQuote.netPayableToday.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            {/* Downgrade Timing Options */}
                            {prorationQuote.isDowngrade && (
                                <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 text-xs space-y-2">
                                    <div className="font-bold text-amber-900 dark:text-amber-200">
                                        When should the downgrade take effect?
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="downgradeOption"
                                            checked={!downgradeImmediate}
                                            onChange={() => setDowngradeImmediate(false)}
                                        />
                                        <span>
                                            <strong>At end of current cycle</strong> (Recommended &bull; Keep{" "}
                                            {PLAN_TIERS[currentPlan].name} until next renewal)
                                        </span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="downgradeOption"
                                            checked={downgradeImmediate}
                                            onChange={() => setDowngradeImmediate(true)}
                                        />
                                        <span>
                                            <strong>Switch immediately</strong> (Unused quota will be reset)
                                        </span>
                                    </label>
                                </div>
                            )}

                            {/* Feature Diff Info */}
                            {prorationQuote.unlockedFeatures.length > 0 && (
                                <div className="space-y-1.5 text-xs">
                                    <span className="font-bold text-emerald-600">New Capabilities Unlocked:</span>
                                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                                        {prorationQuote.unlockedFeatures.slice(0, 3).map((f) => (
                                            <li key={f}>{f}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {prorationQuote.reducedFeatures.length > 0 && (
                                <div className="space-y-1.5 text-xs">
                                    <span className="font-bold text-rose-600">Features Reduced or Removed:</span>
                                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                                        {prorationQuote.reducedFeatures.slice(0, 3).map((f) => (
                                            <li key={f}>{f}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setIsChangeModalOpen(false)}
                            disabled={isProcessing}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmPlanChange}
                            disabled={isProcessing}
                            className="gap-2 font-bold"
                        >
                            {isProcessing ? (
                                <>
                                    <RotateCcw className="h-4 w-4 animate-spin" />
                                    Updating Subscription...
                                </>
                            ) : (
                                <>
                                    <Check className="h-4 w-4" />
                                    Confirm & Activate
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* PRINTABLE RECEIPT MODAL */}
            <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Receipt className="h-5 w-5 text-primary" />
                            Platform Subscription Tax Invoice
                        </DialogTitle>
                        <DialogDescription>
                            Official payment receipt for your records and compliance.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedInvoice && (
                        <div className="space-y-4 py-2 text-xs">
                            <div className="border rounded-xl p-5 bg-card space-y-4">
                                <div className="flex justify-between items-start border-b pb-3">
                                    <div>
                                        <h3 className="font-bold text-base">Genesoft Cloud ERP</h3>
                                        <p className="text-muted-foreground">Genesoft Technologies Private Limited</p>
                                        <p className="text-muted-foreground">Tax ID / GSTIN: 29AABCU9603R1ZM</p>
                                    </div>
                                    <div className="text-right">
                                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                            {selectedInvoice.status}
                                        </Badge>
                                        <div className="font-mono font-bold mt-1 text-sm">{selectedInvoice.invoiceNumber}</div>
                                        <div className="text-muted-foreground">{new Date(selectedInvoice.issueDate).toLocaleDateString()}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="font-bold uppercase text-[10px] text-muted-foreground">Billed To</span>
                                        <div className="font-semibold text-sm">{selectedInvoice.tenantName}</div>
                                        <div className="text-muted-foreground font-mono text-[11px]">{selectedInvoice.tenantId}</div>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-bold uppercase text-[10px] text-muted-foreground">Coverage</span>
                                        <div className="font-semibold text-sm">
                                            {PLAN_TIERS[selectedInvoice.tier].name} ({selectedInvoice.billingCycle})
                                        </div>
                                        <div className="text-muted-foreground">
                                            {new Date(selectedInvoice.periodStart).toLocaleDateString()} &rarr;{" "}
                                            {new Date(selectedInvoice.periodEnd).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t pt-3 space-y-1.5">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Taxable Subtotal:</span>
                                        <span className="font-mono font-semibold">
                                            {catalog.symbol}{selectedInvoice.subtotal.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Tax ({selectedInvoice.taxPercent}%):</span>
                                        <span className="font-mono font-semibold">
                                            {catalog.symbol}{selectedInvoice.taxAmount.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm font-bold border-t pt-2">
                                        <span>Total Amount:</span>
                                        <span className="font-mono text-primary text-base">
                                            {catalog.symbol}{selectedInvoice.totalAmount.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setIsReceiptModalOpen(false)}>
                            Close
                        </Button>
                        <Button onClick={printReceipt} className="gap-2 font-bold">
                            <Printer className="h-4 w-4" /> Print Receipt
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
