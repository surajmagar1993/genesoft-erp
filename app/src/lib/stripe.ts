import Stripe from "stripe"

export const isStripeEnabled = !!process.env.STRIPE_SECRET_KEY;

export const stripe = isStripeEnabled 
  ? new Stripe(process.env.STRIPE_SECRET_KEY!, {
      // Pinned to the API version this integration was written against (older than the SDK's default)
      apiVersion: "2024-11-20.acacia" as Stripe.StripeConfig["apiVersion"],
      appInfo: {
        name: "Genesoft ERP",
        version: "1.0.0",
      },
    })
  : null;
