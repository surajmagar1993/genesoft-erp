import { NextRequest, NextResponse } from "next/server"
import { submitPublicForm } from "@/app/actions/crm/forms"

// Cross-Origin Resource Sharing (CORS) headers to allow embedded forms from any client website
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
}

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params
        if (!id) {
            return NextResponse.json(
                { success: false, error: "Form identifier is required" },
                { status: 400, headers: corsHeaders }
            )
        }

        let bodyData: Record<string, any> = {}
        let honeypotValue: string | undefined

        const contentType = req.headers.get("content-type") || ""

        if (contentType.includes("application/json")) {
            const json = await req.json()
            bodyData = json.data || json
            honeypotValue = json._hp_company || json.honeypot || bodyData._hp_company || bodyData.honeypot
        } else if (
            contentType.includes("application/x-www-form-urlencoded") ||
            contentType.includes("multipart/form-data")
        ) {
            const formData = await req.formData()
            const entries: Record<string, any> = {}
            for (const [key, val] of formData.entries()) {
                entries[key] = val.toString()
            }
            bodyData = entries
            honeypotValue = entries._hp_company || entries.honeypot
        } else {
            // Fallback try text/json
            try {
                const text = await req.text()
                bodyData = JSON.parse(text)
                honeypotValue = bodyData._hp_company || bodyData.honeypot
            } catch {
                bodyData = {}
            }
        }

        const ipAddress =
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            req.headers.get("x-real-ip") ||
            "unknown"

        const userAgent = req.headers.get("user-agent") || undefined
        const referer = req.headers.get("referer") || undefined

        const result = await submitPublicForm({
            formIdOrCode: id,
            data: bodyData,
            honeypot: honeypotValue,
            ipAddress,
            userAgent,
            referer,
        })

        if (!result.success) {
            return NextResponse.json(result, { status: 400, headers: corsHeaders })
        }

        return NextResponse.json(result, { status: 200, headers: corsHeaders })
    } catch (err: any) {
        console.error("Public Form Submission API error:", err)
        return NextResponse.json(
            {
                success: false,
                error: "Failed to process form submission",
                message: err.message || "Internal server error",
            },
            { status: 500, headers: corsHeaders }
        )
    }
}
