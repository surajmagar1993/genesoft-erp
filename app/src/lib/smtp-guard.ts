import { lookup } from "node:dns/promises"
import { isIP } from "node:net"

const SMTP_PORTS = new Set([25, 465, 587, 2525])

export function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 6) {
    const a = address.toLowerCase()
    if (a === "::1" || a === "::") return true
    if (a.startsWith("fc") || a.startsWith("fd") || a.startsWith("fe80")) return true
    const mapped = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    return mapped ? isPrivateAddress(mapped[1]) : false
  }
  const [a, b] = address.split(".").map(Number)
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) ||           // link-local / cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224                               // multicast & reserved
  )
}

/**
 * Validates a tenant-supplied SMTP host/port before the server connects to it,
 * so the SMTP features cannot be used to probe internal networks.
 * Returns an error message, or null when the target is allowed.
 */
export async function checkSmtpTarget(host: string, port: number): Promise<string | null> {
  if (!SMTP_PORTS.has(port)) return "SMTP port must be 25, 465, 587 or 2525."
  try {
    const addresses = await lookup(host.trim(), { all: true })
    if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
      return "SMTP host must be a public mail server."
    }
  } catch {
    return "SMTP host could not be resolved."
  }
  return null
}

const IMAP_PORTS = new Set([143, 993])

/**
 * Validates a tenant-supplied IMAP host/port before the server connects to it.
 * Returns an error message, or null when the target is allowed.
 */
export async function checkImapTarget(host: string, port: number): Promise<string | null> {
  if (!IMAP_PORTS.has(port)) return "IMAP port must be 993 or 143."
  try {
    const addresses = await lookup(host.trim(), { all: true })
    if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
      return "IMAP host must be a public mail server."
    }
  } catch {
    return "IMAP host could not be resolved."
  }
  return null
}

/**
 * Validates a tenant-supplied webhook URL before the server calls it: https
 * only, and the host must resolve to public addresses.
 * Returns an error message, or null when the target is allowed.
 */
export async function checkWebhookTarget(rawUrl: string): Promise<string | null> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return "Webhook URL is not valid."
  }
  if (url.protocol !== "https:") return "Webhook URL must use https."
  try {
    const addresses = await lookup(url.hostname, { all: true })
    if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
      return "Webhook host must be a public server."
    }
  } catch {
    return "Webhook host could not be resolved."
  }
  return null
}
