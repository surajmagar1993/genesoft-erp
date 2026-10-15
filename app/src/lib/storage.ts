import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * File storage (Supabase Storage) for uploads: tenant logos now, website
 * images and CVs later. Server only (never import it from a "use client"
 * file): it uses SUPABASE_SERVICE_ROLE_KEY, so every
 * caller must check who may upload first (e.g. getTenantAdminId()) and pick
 * the path itself; nothing from the browser chooses a bucket or path.
 * Buckets: "tenant-logos" (public read, one folder per tenant).
 */
export const STORAGE_NOT_CONFIGURED =
    "File uploads aren't set up on this server yet (SUPABASE_SERVICE_ROLE_KEY is missing). Ask the platform admin."

let client: SupabaseClient | null = null

export function storageConfigured(): boolean {
    return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

function storage() {
    if (!storageConfigured()) throw new Error(STORAGE_NOT_CONFIGURED)
    client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false, autoRefreshToken: false },
    })
    return client.storage
}

/** Uploads (or replaces) a file and returns its public URL. */
export async function uploadPublicFile(bucket: string, filePath: string, body: Buffer, contentType: string): Promise<string> {
    const s = storage()
    const { error } = await s.from(bucket).upload(filePath, body, { contentType, upsert: true, cacheControl: "31536000" })
    if (error) throw new Error(`Upload failed: ${error.message}`)
    return s.from(bucket).getPublicUrl(filePath).data.publicUrl
}

/** Deletes every file in a folder except `keep` (old versions of a logo). Never throws. */
export async function clearFolder(bucket: string, folder: string, keep?: string): Promise<void> {
    try {
        const s = storage()
        const { data } = await s.from(bucket).list(folder, { limit: 100 })
        const paths = (data || []).map((f) => `${folder}/${f.name}`).filter((p) => p !== keep)
        if (paths.length) await s.from(bucket).remove(paths)
    } catch (err) {
        console.error("clearFolder failed:", err)
    }
}

/** True when a URL points at a public file in our own storage bucket. */
export function isOwnStorageUrl(url: string, bucket: string): boolean {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL
    return !!base && url.startsWith(`${base.replace(/\/+$/, "")}/storage/v1/object/public/${bucket}/`)
}

/** Uploads a private file (no public URL). */
export async function uploadPrivateFile(bucket: string, filePath: string, body: Buffer, contentType: string): Promise<void> {
    const { error } = await storage().from(bucket).upload(filePath, body, { contentType, upsert: false })
    if (error) throw new Error(`Upload failed: ${error.message}`)
}

/** A short-lived download link for a private file (e.g. a CV), valid for `seconds`. */
export async function signedDownloadUrl(bucket: string, filePath: string, seconds = 300): Promise<string> {
    const { data, error } = await storage().from(bucket).createSignedUrl(filePath, seconds, { download: true })
    if (error || !data) throw new Error(`Couldn't create a download link: ${error?.message || "unknown error"}`)
    return data.signedUrl
}

/** Deletes files. Never throws. */
export async function removeFiles(bucket: string, paths: string[]): Promise<void> {
    try {
        if (paths.length) await storage().from(bucket).remove(paths)
    } catch (err) {
        console.error("removeFiles failed:", err)
    }
}

/** Image type from the file's own bytes (PNG, JPEG, WebP), or null. */
export function imageKind(buf: Buffer): { ext: "png" | "jpg" | "webp"; type: string } | null {
    if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { ext: "png", type: "image/png" }
    if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", type: "image/jpeg" }
    if (buf.length > 12 && buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP") return { ext: "webp", type: "image/webp" }
    return null
}

/** CV type from the file's own bytes (PDF, Word .docx, old .doc), or null. */
export function documentKind(buf: Buffer): { ext: "pdf" | "docx" | "doc"; type: string } | null {
    if (buf.toString("latin1", 0, 5) === "%PDF-") return { ext: "pdf", type: "application/pdf" }
    if (buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) return { ext: "docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }
    if (buf.length > 8 && buf.readUInt32BE(0) === 0xd0cf11e0 && buf.readUInt32BE(4) === 0xa1b11ae1) return { ext: "doc", type: "application/msword" }
    return null
}
