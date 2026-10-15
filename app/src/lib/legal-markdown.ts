/**
 * The small text format the legal pages are edited in (Super Admin → Website
 * → Pages → Legal). Pure (safe in the browser): the editor validates with it
 * and the public pages render its result as React elements, never as HTML.
 *
 *   ## Section heading {#anchor}     starts a section (the {#anchor} is optional)
 *   A paragraph. A single line break stays a line break.
 *                                    (blank line = new paragraph)
 *   - a bullet point
 *   **bold**   [link text](/privacy)   [text](https://…)   [text](mailto:…)
 *   {legalName} {brandName} {productName} {email} {phone} {address} {jurisdiction} {website}
 *   {cookieTable} / {subprocessorTable}   on a line of their own: a table kept in the code
 */
import { PLATFORM } from "@/lib/constants/platform"

export type Inline =
    | { t: "text"; v: string }
    | { t: "bold"; v: Inline[] }
    | { t: "link"; href: string; v: Inline[] }
    | { t: "br" }

export type Block = { t: "p"; v: Inline[] } | { t: "ul"; items: Inline[][] } | { t: "table"; name: LegalTable }

export interface LegalDocSection {
    id: string
    title: string
    blocks: Block[]
}

export const LEGAL_TABLES = ["cookieTable", "subprocessorTable"] as const
export type LegalTable = (typeof LEGAL_TABLES)[number]

/** Words in {braces} that are replaced with the company's details. */
export const LEGAL_TOKENS: Record<string, string> = {
    legalName: PLATFORM.legalName,
    brandName: PLATFORM.brandName,
    productName: PLATFORM.productName,
    phone: PLATFORM.phone,
    address: `${PLATFORM.address.line1}, ${PLATFORM.address.line2}, ${PLATFORM.address.country}`,
    jurisdiction: PLATFORM.jurisdiction,
}

/** Tokens that become links rather than plain text. */
const LINK_TOKENS: Record<string, { href: string; text: string }> = {
    email: { href: `mailto:${PLATFORM.email}`, text: PLATFORM.email },
    website: { href: PLATFORM.website, text: PLATFORM.website.replace(/^https?:\/\//, "") },
}

/** Text the owner still has to fill in. A legal page containing it can be saved as a draft but not published. */
export const OWNER_TODO = "[OWNER:"

export function isAllowedLegalHref(href: string): boolean {
    return /^\/[\w\-/#.?=&]*$/.test(href) || /^#[\w-]+$/.test(href) || /^https:\/\/[^\s]+$/.test(href) || /^mailto:[^\s@]+@[^\s@]+$/.test(href)
}

function slugId(text: string): string {
    return (
        text
            .toLowerCase()
            .replace(/[^\w\s-]/g, "")
            .trim()
            .replace(/[\s_]+/g, "-")
            .slice(0, 60) || "section"
    )
}

/** Inline text → pieces. Throws a readable error on a bad link or unknown {token}. */
export function parseInline(src: string): Inline[] {
    const out: Inline[] = []
    let buf = ""
    const flush = () => {
        if (buf) out.push({ t: "text", v: buf })
        buf = ""
    }
    let i = 0
    while (i < src.length) {
        const rest = src.slice(i)
        if (rest.startsWith("**")) {
            const end = src.indexOf("**", i + 2)
            if (end < 0) throw new Error(`A "**" for bold text isn't closed: "${src.slice(i, i + 40)}…"`)
            flush()
            out.push({ t: "bold", v: parseInline(src.slice(i + 2, end)) })
            i = end + 2
            continue
        }
        const link = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(rest)
        if (link) {
            const href = link[2].replace(/\{(\w+)\}/g, (m, name: string) => LINK_TOKENS[name]?.href.replace(/^mailto:/, "") ?? LEGAL_TOKENS[name] ?? m)
            if (!isAllowedLegalHref(href)) throw new Error(`The link "${link[2]}" isn't allowed. Use /page, #section, https://… or mailto:…`)
            flush()
            out.push({ t: "link", href, v: parseInline(link[1]) })
            i += link[0].length
            continue
        }
        const token = /^\{(\w+)\}/.exec(rest)
        if (token) {
            const name = token[1]
            if (LINK_TOKENS[name]) {
                flush()
                out.push({ t: "link", href: LINK_TOKENS[name].href, v: [{ t: "text", v: LINK_TOKENS[name].text }] })
            } else if (name in LEGAL_TOKENS) {
                buf += LEGAL_TOKENS[name]
            } else if ((LEGAL_TABLES as readonly string[]).includes(name)) {
                throw new Error(`{${name}} must be on a line of its own.`)
            } else {
                throw new Error(`Unknown word in braces: {${name}}.`)
            }
            i += token[0].length
            continue
        }
        if (src[i] === "\n") {
            flush()
            out.push({ t: "br" })
            i++
            continue
        }
        buf += src[i]
        i++
    }
    flush()
    return out
}

/** The whole page text → numbered sections. Throws a readable error when it can't be shown. */
export function parseLegal(src: string): LegalDocSection[] {
    const sections: LegalDocSection[] = []
    const ids = new Set<string>()
    let cur: LegalDocSection | null = null
    let para: string[] = []
    let list: string[] | null = null

    const endPara = () => {
        if (para.length && cur) cur.blocks.push({ t: "p", v: parseInline(para.join("\n")) })
        para = []
    }
    const endList = () => {
        if (list && cur) cur.blocks.push({ t: "ul", items: list.map(parseInline) })
        list = null
    }

    for (const raw of src.replace(/\r\n/g, "\n").split("\n")) {
        const line = raw.trimEnd()
        const heading = /^##\s+(.+?)(?:\s+\{#([\w-]+)\})?\s*$/.exec(line)
        if (heading) {
            endPara()
            endList()
            let id = heading[2] || slugId(heading[1])
            for (let n = 2; ids.has(id); n++) id = `${heading[2] || slugId(heading[1])}-${n}`
            ids.add(id)
            cur = { id, title: heading[1].trim(), blocks: [] }
            sections.push(cur)
            continue
        }
        if (!line.trim()) {
            endPara()
            endList()
            continue
        }
        if (!cur) throw new Error(`Start the text with a section heading ("## Heading"). Found: "${line.slice(0, 40)}"`)
        const table = /^\{(\w+)\}$/.exec(line.trim())
        if (table && (LEGAL_TABLES as readonly string[]).includes(table[1])) {
            endPara()
            endList()
            cur.blocks.push({ t: "table", name: table[1] as LegalTable })
            continue
        }
        const bullet = /^\s*[-*]\s+(.*)$/.exec(line)
        if (bullet) {
            endPara()
            list ??= []
            list.push(bullet[1])
            continue
        }
        if (list) {
            // A line straight after a bullet continues that bullet
            list[list.length - 1] += ` ${line.trim()}`
            continue
        }
        para.push(line.trim())
    }
    endPara()
    endList()
    if (!sections.length) throw new Error('Add at least one section ("## Heading").')
    return sections
}
