import { describe, expect, it } from "vitest"
import { LEGAL_DEFS } from "@/lib/legal-content"
import { OWNER_TODO, parseInline, parseLegal } from "@/lib/legal-markdown"
import { PAGE_DEFS, textToValue } from "@/lib/site-cms-shared"
import { PLATFORM } from "@/lib/constants/platform"

const noImages = () => false

describe("legal page text", () => {
    it("every built-in legal page can be shown", () => {
        for (const d of LEGAL_DEFS) {
            expect(() => parseInline(d.summary), d.key).not.toThrow()
            expect(parseLegal(d.body).length, d.key).toBeGreaterThan(2)
        }
    })

    it("keeps the anchors other pages link to", () => {
        const ids = (key: string) => parseLegal(LEGAL_DEFS.find((d) => d.key === key)!.body).map((s) => s.id)
        expect(ids("legal:privacy")).toEqual(expect.arrayContaining(["retention", "website-forms", "cookies", "grievance"]))
        expect(ids("legal:refund-policy")).toContain("money-back")
    })

    it("only the draft-only rental terms still have owner notes", () => {
        for (const d of LEGAL_DEFS) expect(d.body.includes(OWNER_TODO), d.key).toBe(!!d.draftOnly)
    })

    it("parses headings, paragraphs, bullets, bold, links and tokens", () => {
        const [s] = parseLegal("## Hello {#hi}\nLine one\nline two\n\n- **a** item\n- [b](/terms)\n\nMail {email}.")
        expect(s.id).toBe("hi")
        expect(s.blocks[0]).toEqual({ t: "p", v: [{ t: "text", v: "Line one" }, { t: "br" }, { t: "text", v: "line two" }] })
        expect(s.blocks[1]).toMatchObject({ t: "ul", items: [[{ t: "bold" }, { t: "text", v: " item" }], [{ t: "link", href: "/terms" }]] })
        expect(s.blocks[2]).toMatchObject({ t: "p", v: [{ t: "text", v: "Mail " }, { t: "link", href: `mailto:${PLATFORM.email}` }, { t: "text", v: "." }] })
    })

    it("fills in company details and places code tables", () => {
        const [s] = parseLegal("## A\n{legalName}\n\n{cookieTable}")
        expect(s.blocks).toEqual([{ t: "p", v: [{ t: "text", v: PLATFORM.legalName }] }, { t: "table", name: "cookieTable" }])
    })

    it("refuses unsafe links, unknown tokens and text before the first heading", () => {
        expect(() => parseLegal("## A\n[x](javascript:alert(1))")).toThrow(/isn't allowed/)
        expect(() => parseLegal("## A\n[x](http://example.com)")).toThrow(/isn't allowed/)
        expect(() => parseLegal("## A\n{nope}")).toThrow(/Unknown word/)
        expect(() => parseLegal("Intro\n## A")).toThrow(/Start the text/)
        expect(() => parseLegal("")).toThrow(/at least one section/)
        expect(() => parseInline("**open")).toThrow(/isn't closed/)
    })

    it("gives duplicate headings their own anchors", () => {
        expect(parseLegal("## Contact\nx\n## Contact\ny").map((s) => s.id)).toEqual(["contact", "contact-2"])
    })

    it("the page editor checks legal text on save", () => {
        const def = PAGE_DEFS.find((p) => p.key === "legal:terms")!
        const body = def.fields.find((f) => f.name === "body")!
        expect(textToValue(body, "## Ok\nFine", noImages)).toBe("## Ok\nFine")
        expect(() => textToValue(body, "## Ok\n[x](ftp://a)", noImages)).toThrow(/Sections:/)
    })
})
