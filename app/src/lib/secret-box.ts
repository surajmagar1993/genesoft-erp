import crypto from "crypto"

/**
 * At-rest encryption for tenant-stored credentials (gateway keys, WhatsApp
 * tokens, SMTP/IMAP passwords) using AES-256-GCM.
 *
 * The key comes from ENCRYPTION_KEY (any long random string, e.g. the output
 * of `openssl rand -base64 32`). Without it, values are stored as plaintext,
 * exactly as before. Plaintext values already in the database keep working
 * and are encrypted the next time they are saved.
 *
 * Changing or removing ENCRYPTION_KEY makes existing encrypted values
 * unreadable; openSecret then returns "" so the integration reads as
 * unconfigured instead of using a garbage credential.
 */

const PREFIX = "enc:v1:"

function getKey(): Buffer | null {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) return null
  return crypto.createHash("sha256").update(raw).digest()
}

export function isSealed(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(PREFIX)
}

/** Encrypts a secret for storage. Empty and already-encrypted values pass through. */
export function sealSecret<T extends string | null | undefined>(value: T): T {
  if (!value || isSealed(value)) return value
  const key = getKey()
  if (!key) return value

  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}` as T
}

/**
 * Shows only the ends of a secret for display ("abcd••••••••wxyz"). Empty stays empty,
 * so forms can treat a blank field as "keep the stored value".
 */
export function maskSecret(value: string | null | undefined): string {
  if (!value) return ""
  if (value.length < 8) return "••••••••"
  return `${value.substring(0, 4)}••••••••${value.substring(value.length - 4)}`
}

/** Decrypts a stored secret. Plaintext (legacy) values are returned unchanged. */
export function openSecret(value: string | null | undefined): string {
  if (!value) return ""
  if (!isSealed(value)) return value

  const key = getKey()
  if (!key) {
    console.error("openSecret: ENCRYPTION_KEY is not set; cannot read an encrypted credential")
    return ""
  }

  try {
    const [iv, tag, ciphertext] = value.slice(PREFIX.length).split(":")
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"))
    decipher.setAuthTag(Buffer.from(tag, "base64"))
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8")
  } catch {
    console.error("openSecret: failed to decrypt a credential (wrong ENCRYPTION_KEY?)")
    return ""
  }
}
