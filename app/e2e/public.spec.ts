import { expect, test } from "@playwright/test"
import { collectErrors, ERROR_SCREEN } from "./helpers"

/** The public website and sign-in pages: load, no errors, no sideways scrolling on a phone. */
const PAGES = [
    "/", "/services", "/services/software-development", "/services/it-rentals", "/portfolio", "/about", "/careers", "/contact",
    "/erp", "/erp/pricing", "/privacy", "/terms", "/refund-policy", "/delivery-policy", "/cookie-policy", "/dpa",
    "/login", "/register", "/forgot-password",
]

for (const path of PAGES) {
    test(`public page ${path}`, async ({ page }) => {
        const errors = collectErrors(page)
        const res = await page.goto(path, { waitUntil: "load" })
        expect(res?.status(), "HTTP status").toBeLessThan(400)
        await expect(page.locator("h1").first()).toBeVisible()
        await expect(page.locator("body")).not.toContainText(ERROR_SCREEN)
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        expect(overflow, "page scrolls sideways").toBeLessThanOrEqual(1)
        expect(errors).toEqual([])
    })
}

test("old links redirect and unknown pages are 404", async ({ request }) => {
    const pricing = await request.get("/pricing", { maxRedirects: 0 })
    expect([301, 307, 308]).toContain(pricing.status())
    expect((await request.get("/no-such-page-xyz")).status()).toBe(404)
})

test("signed-out visitors are sent to sign in from the app", async ({ page }) => {
    await page.goto("/sales/invoices")
    await expect(page).toHaveURL(/\/login/)
})
