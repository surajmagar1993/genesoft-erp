/**
 * Date helpers that give the same text on the server (UTC on Vercel) and in
 * the browser, so pages don't flicker or show React hydration errors.
 * Pure (safe in the browser).
 */

/** The platform's own time zone (the Super Admin console shows times in it). */
export const PLATFORM_TIME_ZONE = "Asia/Kolkata"

/**
 * A Date whose local fields are the wall-clock time in `timeZone`, for
 * date-fns `format()`: `format(inZone(x), "MMM d, yyyy (HH:mm)")` prints the
 * same India time on the server and in any browser.
 */
export function inZone(value: string | number | Date, timeZone: string = PLATFORM_TIME_ZONE): Date {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return d
    return new Date(d.toLocaleString("en-US", { timeZone }))
}
