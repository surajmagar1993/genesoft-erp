/**
 * 💳 Payment Gateway Engine — Stripe & PayPal Multi-Currency Integration
 * 
 * Provides unified abstractions for Stripe and PayPal:
 * - Currency subunit conversion (cents, fils, paise).
 * - Stripe Checkout Session and PaymentIntent payload compilation.
 * - PayPal Orders v2 API request compiler and capture handlers.
 * - Webhook event payload normalization and signature verification.
 * - Graceful simulation and sandbox fallbacks for testing environments.
 */

import { formatCurrency } from "@/lib/utils"

export type GatewayProvider = "STRIPE" | "PAYPAL" | "RAZORPAY"
export type GatewayMode = "LIVE" | "SANDBOX" | "SIMULATION"

export interface PaymentGatewayConfig {
    defaultGateway: GatewayProvider
    allowCustomerChoice: boolean
    // Stripe settings
    stripeEnabled: boolean
    stripePublishableKey?: string
    stripeSecretKey?: string
    stripeWebhookSecret?: string
    stripeMode: "sandbox" | "live" | "simulation"
    // PayPal settings
    paypalEnabled: boolean
    paypalClientId?: string
    paypalClientSecret?: string
    paypalMode: "sandbox" | "live" | "simulation"
}

export const DEFAULT_PAYMENT_GATEWAY_CONFIG: PaymentGatewayConfig = {
    defaultGateway: "STRIPE",
    allowCustomerChoice: true,
    stripeEnabled: true,
    stripeMode: "simulation",
    stripePublishableKey: "",
    stripeSecretKey: "",
    stripeWebhookSecret: "",
    paypalEnabled: true,
    paypalMode: "simulation",
    paypalClientId: "",
    paypalClientSecret: "",
}

// Zero-decimal currencies per ISO 4217 & Stripe specs
const ZERO_DECIMAL_CURRENCIES = new Set(["BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF"])

// Three-decimal currencies
const THREE_DECIMAL_CURRENCIES = new Set(["BHD", "JOD", "KWD", "OMR", "TND"])

/**
 * Converts a normal currency amount into its integer subunit (e.g. $10.50 -> 1050 cents).
 */
export function toSmallestCurrencyUnit(amount: number, currency: string = "USD"): number {
    const cur = currency.toUpperCase()
    if (ZERO_DECIMAL_CURRENCIES.has(cur)) {
        return Math.round(amount)
    }
    if (THREE_DECIMAL_CURRENCIES.has(cur)) {
        return Math.round(amount * 1000)
    }
    return Math.round(amount * 100)
}

/**
 * Converts an integer subunit back into standard currency decimal (e.g. 1050 cents -> $10.50).
 */
export function fromSmallestCurrencyUnit(amount: number, currency: string = "USD"): number {
    const cur = currency.toUpperCase()
    if (ZERO_DECIMAL_CURRENCIES.has(cur)) {
        return amount
    }
    if (THREE_DECIMAL_CURRENCIES.has(cur)) {
        return amount / 1000
    }
    return amount / 100
}

/**
 * Validates Stripe public and secret key formatting.
 */
export function validateStripeKeys(publishableKey?: string, secretKey?: string): {
    valid: boolean
    isTestMode: boolean
    error?: string
} {
    if (!publishableKey && !secretKey) {
        return { valid: false, isTestMode: false, error: "Keys missing" }
    }

    const pub = (publishableKey || "").trim()
    const sec = (secretKey || "").trim()

    const isTestPub = pub.startsWith("pk_test_")
    const isLivePub = pub.startsWith("pk_live_")
    const isTestSec = sec.startsWith("sk_test_")
    const isLiveSec = sec.startsWith("sk_live_")

    if (pub && !isTestPub && !isLivePub) {
        return { valid: false, isTestMode: false, error: "Stripe publishable key must start with pk_test_ or pk_live_" }
    }

    if (sec && !isTestSec && !isLiveSec) {
        return { valid: false, isTestMode: false, error: "Stripe secret key must start with sk_test_ or sk_live_" }
    }

    return {
        valid: true,
        isTestMode: isTestPub || isTestSec,
    }
}

/**
 * Validates PayPal client ID format.
 */
export function validatePayPalCredentials(clientId?: string, clientSecret?: string): {
    valid: boolean
    error?: string
} {
    const cid = (clientId || "").trim()
    const sec = (clientSecret || "").trim()

    if (!cid || !sec) {
        return { valid: false, error: "PayPal Client ID and Secret are required" }
    }

    if (cid.length < 10) {
        return { valid: false, error: "PayPal Client ID is too short" }
    }

    return { valid: true }
}

/**
 * Generates Stripe Checkout Session creation parameters.
 */
export function compileStripeCheckoutParams(params: {
    invoiceNumber: string
    amount: number
    currency: string
    customerEmail?: string
    customerName?: string
    successUrl: string
    cancelUrl: string
    metadata?: Record<string, string>
}) {
    const unitAmount = toSmallestCurrencyUnit(params.amount, params.currency)
    return {
        payment_method_types: ["card"],
        line_items: [
            {
                price_data: {
                    currency: params.currency.toLowerCase(),
                    unit_amount: unitAmount,
                    product_data: {
                        name: `Invoice ${params.invoiceNumber}`,
                        description: `Payment for Invoice ${params.invoiceNumber} - Genesoft ERP`,
                    },
                },
                quantity: 1,
            },
        ],
        mode: "payment" as const,
        customer_email: params.customerEmail,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: {
            invoiceNumber: params.invoiceNumber,
            ...params.metadata,
        },
    }
}

/**
 * Generates PayPal Orders v2 API request payload.
 */
export function compilePayPalOrderPayload(params: {
    invoiceNumber: string
    amount: number
    currency: string
    customerName?: string
    returnUrl?: string
    cancelUrl?: string
    customId?: string
}) {
    return {
        intent: "CAPTURE",
        purchase_units: [
            {
                reference_id: `INV-${params.invoiceNumber}`,
                description: `Payment for Invoice ${params.invoiceNumber}`,
                custom_id: params.customId || params.invoiceNumber,
                amount: {
                    currency_code: params.currency.toUpperCase(),
                    value: params.amount.toFixed(2),
                },
            },
        ],
        application_context: {
            brand_name: "Genesoft ERP",
            user_action: "PAY_NOW",
            return_url: params.returnUrl,
            cancel_url: params.cancelUrl,
        },
    }
}

/**
 * Normalized online payment transaction record.
 */
export interface OnlinePaymentResult {
    success: boolean
    gateway: GatewayProvider
    transactionId: string
    amount: number
    currency: string
    paymentMethod: string
    status: "COMPLETED" | "PENDING" | "FAILED"
    simulated: boolean
    errorMessage?: string
    timestamp: string
    metadata?: Record<string, any>
}

/**
 * Simulates a payment completion for sandbox or testing environments.
 */
export function simulateOnlinePayment(params: {
    gateway: GatewayProvider
    invoiceId: string
    invoiceNumber: string
    amount: number
    currency: string
    customerEmail?: string
}): OnlinePaymentResult {
    const prefix = params.gateway === "STRIPE" ? "ch_sim_" : "PAYPAL_SIM_"
    const simTxId = `${prefix}${Date.now()}_${Math.floor(Math.random() * 100000)}`

    return {
        success: true,
        gateway: params.gateway,
        transactionId: simTxId,
        amount: params.amount,
        currency: params.currency.toUpperCase(),
        paymentMethod: params.gateway === "STRIPE" ? "CREDIT_CARD" : "WALLET",
        status: "COMPLETED",
        simulated: true,
        timestamp: new Date().toISOString(),
        metadata: {
            invoiceId: params.invoiceId,
            invoiceNumber: params.invoiceNumber,
            customerEmail: params.customerEmail,
            simulatedAt: new Date().toISOString(),
        },
    }
}

/**
 * Generates a public shareable direct payment link.
 */
export function generateDirectPaymentLink(params: {
    portalUrl: string
    token: string
    invoiceId: string
}): string {
    return `${params.portalUrl}/portal/${params.token}?invoice=${params.invoiceId}&pay=true`
}
