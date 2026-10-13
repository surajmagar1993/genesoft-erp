/**
 * Demo/sample data seeding for empty modules.
 * Off unless ENABLE_DEMO_SEED=true, so real tenants never get fake records
 * (sample bank accounts, invoices, mailboxes, etc.) just by opening a page.
 */
export function isDemoSeedEnabled(): boolean {
  return process.env.ENABLE_DEMO_SEED === "true"
}
