"use server"

import { createHash } from "node:crypto"
import { headers } from "next/headers"
import { Resend } from "resend"
import { prisma } from "@/lib/prisma"
import { PLATFORM } from "@/lib/constants/platform"
import { clientIp } from "@/lib/platform-security"
import { toActionResult, type ActionResult } from "@/lib/action-result"

const TOPICS = ["Sales", "Support", "Billing", "Partnership", "Other"] as const
const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_WINDOW = 3

function escapeHtml(text: string): string {
    return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
}

/**
 * Website contact form: emails the enquiry to the Genesoft inbox with the
 * visitor as reply-to. Hidden field traps bots; each IP gets 3 messages per
 * 10 minutes. Only metadata is logged, never the message text.
 */
export async function sendContactMessage(input: {
    name: string
    email: string
    company?: string
    topic: string
    message: string
    website?: string // honeypot
}): Promise<ActionResult<{ sent: true }>> {
    return toActionResult(async () => {
        if (input.website) return { sent: true as const } // bot: pretend success

        const name = (input.name || "").trim()
        const email = (input.email || "").trim().toLowerCase()
        const company = (input.company || "").trim()
        const topic = TOPICS.includes(input.topic as (typeof TOPICS)[number]) ? input.topic : "Other"
        const message = (input.message || "").trim()

        if (name.length < 2 || name.length > 100) throw new Error("Please enter your name.")
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) throw new Error("Please enter a valid email address.")
        if (company.length > 150) throw new Error("Company name is too long.")
        if (message.length < 10) throw new Error("Please tell us a little more (at least 10 characters).")
        if (message.length > 5000) throw new Error("Your message is too long. Please keep it under 5,000 characters.")

        const ip = clientIp(await headers()) || "unknown"
        const ipTag = `ip=${createHash("sha256").update(ip).digest("hex").slice(0, 16)}`
        const recent = await prisma.systemLog.count({
            where: { path: "/contact", message: { contains: ipTag }, timestamp: { gte: new Date(Date.now() - WINDOW_MS) } },
        })
        if (recent >= MAX_PER_WINDOW) throw new Error("You've sent a few messages already. Please wait 10 minutes and try again.")

        const apiKey = process.env.RESEND_API_KEY
        const domain = process.env.RESEND_DOMAIN
        if (!apiKey || !domain) throw new Error(`Our form is unavailable right now. Please email us at ${PLATFORM.email}.`)

        const { error } = await new Resend(apiKey).emails.send({
            from: `Genesoft website <website@${domain}>`,
            to: [PLATFORM.email],
            replyTo: email,
            subject: `[${topic}] Website enquiry from ${name.replace(/[\r\n]+/g, " ")}`,
            text: `Name: ${name}\nEmail: ${email}\nCompany: ${company || "-"}\nTopic: ${topic}\n\n${message}`,
            html: `<p><strong>Name:</strong> ${escapeHtml(name)}<br><strong>Email:</strong> ${escapeHtml(email)}<br><strong>Company:</strong> ${escapeHtml(company || "-")}<br><strong>Topic:</strong> ${topic}</p><p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
        })
        if (error) throw new Error(`We couldn't send your message. Please email us at ${PLATFORM.email}.`)

        await prisma.systemLog.create({
            data: { level: "INFO", path: "/contact", message: `CONTACT_FORM ${ipTag} topic=${topic}` },
        })
        return { sent: true as const }
    })
}
