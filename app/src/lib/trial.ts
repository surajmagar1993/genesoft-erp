/** A trial counts only until its end date; an expired one keeps isTrial=true until the plan changes. Safe in the browser. */
export function trialActive(isTrial: boolean | null | undefined, trialEndsAt: Date | string | null | undefined, now = Date.now()): boolean {
    return !!isTrial && !!trialEndsAt && new Date(trialEndsAt).getTime() > now
}
