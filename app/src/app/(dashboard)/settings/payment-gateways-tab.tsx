"use client"

import React, { useState, useTransition } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
    CreditCard,
    CheckCircle2,
    AlertCircle,
    Copy,
    RefreshCw,
    Shield,
    Sparkles,
    Globe,
    Zap,
    ExternalLink,
    Lock,
} from "lucide-react"
import {
    PaymentGatewayConfig,
    GatewayProvider,
} from "@/lib/payment-gateway-engine"
import {
    saveTenantPaymentGateways,
    testPaymentGatewayConnection,
} from "@/app/actions/finance/gateways"
import { toast } from "sonner"

interface PaymentGatewaysTabProps {
    initialConfig: PaymentGatewayConfig
    appUrl: string
}

export default function PaymentGatewaysTab({
    initialConfig,
    appUrl,
}: PaymentGatewaysTabProps) {
    const [config, setConfig] = useState<PaymentGatewayConfig>(initialConfig)
    const [isSaving, startSaving] = useTransition()
    const [testingStripe, setTestingStripe] = useState(false)
    const [testingPayPal, setTestingPayPal] = useState(false)

    const stripeWebhookUrl = `${appUrl || "https://erp.genesoft.ai"}/api/webhooks/stripe`
    const paypalWebhookUrl = `${appUrl || "https://erp.genesoft.ai"}/api/webhooks/paypal`

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text)
        toast.success(`${label} copied to clipboard!`)
    }

    const handleSave = () => {
        startSaving(async () => {
            const res = await saveTenantPaymentGateways(config)
            if (res.success) {
                toast.success(res.message)
            } else {
                toast.error(res.error || res.message)
            }
        })
    }

    const handleTestGateway = async (gateway: "STRIPE" | "PAYPAL") => {
        if (gateway === "STRIPE") setTestingStripe(true)
        if (gateway === "PAYPAL") setTestingPayPal(true)

        try {
            const res = await testPaymentGatewayConnection(gateway)
            if (res.success) {
                toast.success(res.message)
            } else {
                toast.error(res.message)
            }
        } catch (err: any) {
            toast.error(err.message || "Connection test failed")
        } finally {
            if (gateway === "STRIPE") setTestingStripe(false)
            if (gateway === "PAYPAL") setTestingPayPal(false)
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Top Telemetry Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-border/60 bg-gradient-to-br from-indigo-500/10 via-background to-background">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-semibold">Stripe Status</p>
                            <p className="text-lg font-bold mt-1 flex items-center gap-1.5">
                                {config.stripeEnabled ? (
                                    <span className="text-emerald-600 flex items-center gap-1">
                                        <CheckCircle2 className="w-4 h-4" /> Active
                                    </span>
                                ) : (
                                    <span className="text-muted-foreground">Disabled</span>
                                )}
                            </p>
                        </div>
                        <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-500">
                            <CreditCard className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60 bg-gradient-to-br from-blue-500/10 via-background to-background">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-semibold">PayPal Status</p>
                            <p className="text-lg font-bold mt-1 flex items-center gap-1.5">
                                {config.paypalEnabled ? (
                                    <span className="text-emerald-600 flex items-center gap-1">
                                        <CheckCircle2 className="w-4 h-4" /> Active
                                    </span>
                                ) : (
                                    <span className="text-muted-foreground">Disabled</span>
                                )}
                            </p>
                        </div>
                        <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500">
                            <Globe className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60 bg-gradient-to-br from-amber-500/10 via-background to-background">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-semibold">Default Gateway</p>
                            <p className="text-lg font-bold mt-1 text-foreground">{config.defaultGateway}</p>
                        </div>
                        <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-500">
                            <Zap className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60 bg-gradient-to-br from-purple-500/10 via-background to-background">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-semibold">Supported Currencies</p>
                            <p className="text-sm font-semibold mt-1 text-foreground">USD, GBP, EUR, AED, SAR, AUD</p>
                        </div>
                        <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-500">
                            <Shield className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Configuration Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Stripe Configuration Card */}
                <Card className="border-border/60 shadow-sm relative overflow-hidden">
                    <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 to-purple-600" />
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 font-bold text-sm">
                                    Stripe
                                </div>
                                <div>
                                    <CardTitle className="text-base font-semibold">Stripe Payments</CardTitle>
                                    <CardDescription className="text-xs">
                                        Accept Credit Cards, Debit Cards, Apple Pay & Google Pay
                                    </CardDescription>
                                </div>
                            </div>
                            <Switch
                                checked={config.stripeEnabled}
                                onCheckedChange={(val) => setConfig({ ...config, stripeEnabled: val })}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold">Operation Mode</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {(["simulation", "sandbox", "live"] as const).map((m) => (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => setConfig({ ...config, stripeMode: m })}
                                        className={`py-1.5 px-3 rounded-lg text-xs font-medium border text-center transition-all ${
                                            config.stripeMode === m
                                                ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 font-semibold"
                                                : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                                        }`}
                                    >
                                        {m === "simulation" ? "Sandbox Simulation" : m === "sandbox" ? "Stripe Test Mode" : "Live Production"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold">Publishable Key</Label>
                            <Input
                                value={config.stripePublishableKey || ""}
                                onChange={(e) => setConfig({ ...config, stripePublishableKey: e.target.value })}
                                placeholder="pk_test_51P..."
                                className="font-mono text-xs"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold">Secret Key</Label>
                            <Input
                                type="password"
                                value={config.stripeSecretKey || ""}
                                onChange={(e) => setConfig({ ...config, stripeSecretKey: e.target.value })}
                                placeholder="sk_test_51P..."
                                className="font-mono text-xs"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold">Webhook Signing Secret</Label>
                            <Input
                                type="password"
                                value={config.stripeWebhookSecret || ""}
                                onChange={(e) => setConfig({ ...config, stripeWebhookSecret: e.target.value })}
                                placeholder="whsec_..."
                                className="font-mono text-xs"
                            />
                        </div>

                        {/* Webhook Endpoint Display */}
                        <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-muted-foreground">Stripe Webhook URL</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs gap-1 px-2"
                                    onClick={() => handleCopy(stripeWebhookUrl, "Stripe Webhook URL")}
                                >
                                    <Copy className="w-3 h-3" /> Copy
                                </Button>
                            </div>
                            <p className="font-mono text-xs text-foreground truncate">{stripeWebhookUrl}</p>
                        </div>
                    </CardContent>
                    <CardFooter className="border-t bg-muted/10 p-3 flex justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={testingStripe}
                            onClick={() => handleTestGateway("STRIPE")}
                            className="gap-1.5 text-xs"
                        >
                            {testingStripe ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                            Test Stripe Connection
                        </Button>
                    </CardFooter>
                </Card>

                {/* 2. PayPal Configuration Card */}
                <Card className="border-border/60 shadow-sm relative overflow-hidden">
                    <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 to-cyan-500" />
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 font-bold text-sm">
                                    PayPal
                                </div>
                                <div>
                                    <CardTitle className="text-base font-semibold">PayPal Commerce</CardTitle>
                                    <CardDescription className="text-xs">
                                        Accept PayPal Wallet, Pay in 4, and International Bank Accounts
                                    </CardDescription>
                                </div>
                            </div>
                            <Switch
                                checked={config.paypalEnabled}
                                onCheckedChange={(val) => setConfig({ ...config, paypalEnabled: val })}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold">Operation Mode</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {(["simulation", "sandbox", "live"] as const).map((m) => (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => setConfig({ ...config, paypalMode: m })}
                                        className={`py-1.5 px-3 rounded-lg text-xs font-medium border text-center transition-all ${
                                            config.paypalMode === m
                                                ? "border-blue-500 bg-blue-500/10 text-blue-600 font-semibold"
                                                : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                                        }`}
                                    >
                                        {m === "simulation" ? "Sandbox Simulation" : m === "sandbox" ? "PayPal Sandbox" : "Live Production"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold">PayPal Client ID</Label>
                            <Input
                                value={config.paypalClientId || ""}
                                onChange={(e) => setConfig({ ...config, paypalClientId: e.target.value })}
                                placeholder="AbC123XyZ..."
                                className="font-mono text-xs"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold">PayPal Client Secret</Label>
                            <Input
                                type="password"
                                value={config.paypalClientSecret || ""}
                                onChange={(e) => setConfig({ ...config, paypalClientSecret: e.target.value })}
                                placeholder="••••••••"
                                className="font-mono text-xs"
                            />
                        </div>

                        {/* Webhook Endpoint Display */}
                        <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1.5 mt-6">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-muted-foreground">PayPal Webhook URL</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs gap-1 px-2"
                                    onClick={() => handleCopy(paypalWebhookUrl, "PayPal Webhook URL")}
                                >
                                    <Copy className="w-3 h-3" /> Copy
                                </Button>
                            </div>
                            <p className="font-mono text-xs text-foreground truncate">{paypalWebhookUrl}</p>
                        </div>
                    </CardContent>
                    <CardFooter className="border-t bg-muted/10 p-3 flex justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={testingPayPal}
                            onClick={() => handleTestGateway("PAYPAL")}
                            className="gap-1.5 text-xs"
                        >
                            {testingPayPal ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                            Test PayPal Connection
                        </Button>
                    </CardFooter>
                </Card>
            </div>

            {/* General Checkout Preferences */}
            <Card className="border-border/60 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base font-semibold">Checkout Preferences & Routing</CardTitle>
                    <CardDescription className="text-xs">
                        Configure customer portal behavior and default gateway priority.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold">Default Online Payment Gateway</Label>
                            <select
                                value={config.defaultGateway}
                                onChange={(e) => setConfig({ ...config, defaultGateway: e.target.value as GatewayProvider })}
                                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                            >
                                <option value="STRIPE">Stripe (Credit Card, Apple Pay, Google Pay)</option>
                                <option value="PAYPAL">PayPal Commerce</option>
                                <option value="RAZORPAY">Razorpay (India Domestic)</option>
                            </select>
                        </div>

                        <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/10">
                            <div>
                                <Label className="text-xs font-semibold">Customer Gateway Choice</Label>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    Allow clients to choose between Card (Stripe) and PayPal in the portal.
                                </p>
                            </div>
                            <Switch
                                checked={config.allowCustomerChoice}
                                onCheckedChange={(val) => setConfig({ ...config, allowCustomerChoice: val })}
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="border-t bg-muted/10 p-4 flex justify-end">
                    <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                        {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                        Save Gateway Settings
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
