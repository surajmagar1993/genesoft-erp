import Stripe from "stripe"

export const isStripeEnabled = !!process.env.STRIPE_SECRET_KEY;

export const stripe = isStripeEnabled 
  ? new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2024-11-20.acacia" as any,
      appInfo: {
        name: "Genesoft ERP",
        version: "1.0.0",
      },
    })
  : null;
