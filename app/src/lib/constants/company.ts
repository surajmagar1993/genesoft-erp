/**
 * Company information for PDF header and email.
 * Configure via env vars in .env.local
 */
export const COMPANY = {
  name: process.env.COMPANY_NAME ?? "Genesoft ERP",
  address: process.env.COMPANY_ADDRESS ?? "Mumbai, Maharashtra",
  gstin: process.env.COMPANY_GSTIN ?? "",
  state: process.env.COMPANY_STATE ?? "Maharashtra",
} as const
