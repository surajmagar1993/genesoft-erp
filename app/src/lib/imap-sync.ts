import { ImapFlow } from "imapflow"
import { simpleParser, type AddressObject } from "mailparser"
import { prisma } from "@/lib/prisma"
import { openSecret } from "@/lib/secret-box"
import { checkImapTarget } from "@/lib/smtp-guard"

const MAX_MESSAGES_PER_SYNC = 50
const FIRST_SYNC_DAYS = 7

type MailboxAccount = {
    id: string
    tenantId: string
    email: string
    imapHost: string | null
    imapPort: number | null
    imapUser: string | null
    imapPassword: string | null
    imapSecure: boolean
    lastSyncedAt: Date | null
}

function firstAddress(field: AddressObject | AddressObject[] | undefined): { address: string; name: string | null } | null {
    const list = Array.isArray(field) ? field : field ? [field] : []
    for (const group of list) {
        const entry = group.value.find((v) => v.address)
        if (entry?.address) return { address: entry.address.toLowerCase(), name: entry.name || null }
    }
    return null
}

/**
 * Pulls new messages from the mailbox's IMAP INBOX into email_messages as
 * INBOUND mail. Fetches what arrived since the last sync (or the last 7
 * days the first time), at most 50 per run, skips messages already stored
 * (by Message-ID), and links each one to a contact by sender address.
 */
export async function syncImapMailbox(account: MailboxAccount): Promise<{ syncedCount: number }> {
    if (!account.imapHost || !account.imapUser || !account.imapPassword) {
        throw new Error("IMAP host, user and password are required to sync this mailbox.")
    }
    const port = account.imapPort ?? 993
    const blocked = await checkImapTarget(account.imapHost, port)
    if (blocked) throw new Error(blocked)

    const client = new ImapFlow({
        host: account.imapHost,
        port,
        secure: account.imapSecure,
        auth: { user: account.imapUser, pass: openSecret(account.imapPassword) },
        logger: false,
        socketTimeout: 30_000,
    })

    const since = account.lastSyncedAt ?? new Date(Date.now() - FIRST_SYNC_DAYS * 24 * 60 * 60 * 1000)
    let syncedCount = 0

    await client.connect()
    try {
        const lock = await client.getMailboxLock("INBOX")
        try {
            const found = await client.search({ since }, { uid: true })
            const uids = (found || []).slice(-MAX_MESSAGES_PER_SYNC)
            if (uids.length > 0) {
                for await (const msg of client.fetch(uids, { source: true, uid: true }, { uid: true })) {
                    if (!msg.source) continue
                    const parsed = await simpleParser(msg.source)
                    const messageId = parsed.messageId || `uid-${account.id}-${msg.uid}`

                    const exists = await prisma.emailMessage.count({
                        where: { tenantId: account.tenantId, emailAccountId: account.id, messageId },
                    })
                    if (exists) continue

                    const from = firstAddress(parsed.from)
                    if (!from) continue
                    const to = firstAddress(parsed.to)
                    const contact = await prisma.contact.findFirst({
                        where: { tenantId: account.tenantId, email: { equals: from.address, mode: "insensitive" } },
                        select: { id: true },
                    })
                    const references = Array.isArray(parsed.references) ? parsed.references : parsed.references ? [parsed.references] : []

                    await prisma.emailMessage.create({
                        data: {
                            tenantId: account.tenantId,
                            emailAccountId: account.id,
                            direction: "INBOUND",
                            status: "DELIVERED",
                            fromEmail: from.address,
                            fromName: from.name,
                            toEmail: to?.address ?? account.email,
                            toName: to?.name ?? null,
                            subject: parsed.subject || "(no subject)",
                            // The inbox renders bodies as text; the HTML is kept only as received
                            bodyHtml: typeof parsed.html === "string" ? parsed.html : "",
                            bodyText: parsed.text || null,
                            messageId,
                            inReplyTo: parsed.inReplyTo || null,
                            threadId: references[0] || parsed.inReplyTo || messageId,
                            isRead: false,
                            sentAt: parsed.date ?? new Date(),
                            deliveredAt: new Date(),
                            contactId: contact?.id ?? null,
                        },
                    })
                    syncedCount++
                }
            }
        } finally {
            lock.release()
        }
    } finally {
        await client.logout().catch(() => client.close())
    }

    await prisma.emailAccount.updateMany({
        where: { id: account.id, tenantId: account.tenantId },
        data: { lastSyncedAt: new Date() },
    })

    return { syncedCount }
}
