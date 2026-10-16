/** A workspace address: lowercase letters, digits and single hyphens, 3–40 long. Pure. */
export function cleanWorkspaceSlug(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/[\s_]+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40)
}
