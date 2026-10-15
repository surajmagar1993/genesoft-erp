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
