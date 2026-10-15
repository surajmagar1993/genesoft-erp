import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"

/**
 * /og-image.png: the picture shown when a website link is shared (WhatsApp,
 * LinkedIn, X…), used by pageMeta() in src/lib/seo.ts. Built once at build
 * time; a fixed address so every page can point to it.
 */
export const dynamic = "force-static"

const size = { width: 1200, height: 630 }

export async function GET() {
    // White-lettered logo, for the dark background
    const logo = `data:image/png;base64,${(await readFile(join(process.cwd(), "public", "logo.png"))).toString("base64")}`
    return new ImageResponse(
        (
            <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#1C1A18", padding: "72px 80px", color: "#F6F3EE" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo} width={420} height={171} alt="" />
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div style={{ fontSize: 60, fontWeight: 700, lineHeight: 1.1, maxWidth: 980 }}>Technology that keeps your business moving.</div>
                    <div style={{ fontSize: 30, color: "#D9D4CC" }}>Software · Digital Marketing · IT Rentals · IT Support</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 26, color: "#A39E96" }}>
                    <span>Pune, India · Makers of Genesoft ERP</span>
                    <div style={{ width: 160, height: 10, borderRadius: 5, background: "#EF7F1A" }} />
                </div>
            </div>
        ),
        size,
    )
}
