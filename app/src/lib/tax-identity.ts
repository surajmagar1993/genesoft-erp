/**
 * Statutory exports must carry the business's real tax identity. Throws a
 * clear message instead of producing a return with a blank or made-up ID.
 */
export function requireTaxId(value: string | null | undefined, label: string): string {
    const id = (value || "").trim()
    if (!id) {
        throw new Error(`Add your ${label} in Settings → Organization before exporting this return.`)
    }
    return id
}
