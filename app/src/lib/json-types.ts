/**
 * Shapes of JSON columns read across the app. Pure (safe in the browser).
 */

/** A postal address stored as JSON (fields vary by where it was entered). */
export type AddressJson = {
    line1?: string
    line2?: string
    street?: string
    city?: string
    state?: string
    pincode?: string
    zip?: string
    postalCode?: string
    country?: string
    [key: string]: unknown
} | null
