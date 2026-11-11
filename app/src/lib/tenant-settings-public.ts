/**
 * tenants.settings also holds team access, invites, saved credentials, chat
 * history and more. Any signed-in member can call getTenantSettings, so only
 * these keys are sent to the browser.
 */
const SETTINGS_FOR_SCREENS = ["gstin", "state", "tax", "enable_multijurisdiction"] as const
const SUBSCRIPTION_FOR_SCREENS = ["billingCycle", "renewalDate", "intendedPlan", "scheduledDowngrade", "invoices"] as const

export function settingsForScreens(raw: unknown): Record<string, unknown> {
  const all = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const key of SETTINGS_FOR_SCREENS) if (all[key] !== undefined) out[key] = all[key]
  const sub = all.subscription
  if (sub && typeof sub === "object") {
    const picked: Record<string, unknown> = {}
    for (const key of SUBSCRIPTION_FOR_SCREENS) {
      const v = (sub as Record<string, unknown>)[key]
      if (v !== undefined) picked[key] = v
    }
    out.subscription = picked
  }
  return out
}
