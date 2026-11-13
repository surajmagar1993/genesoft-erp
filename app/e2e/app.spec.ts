import { expect, test } from "@playwright/test"
import { collectErrors, ERROR_SCREEN } from "./helpers"

/**
 * Every app page, signed in as a test business. Runs only with E2E_EMAIL and
 * E2E_PASSWORD (a test account, never a real customer). Read-only: it opens
 * pages and never saves anything.
 */
const email = process.env.E2E_EMAIL
const password = process.env.E2E_PASSWORD
test.skip(!email || !password, "set E2E_EMAIL and E2E_PASSWORD to run the signed-in pages")

const PAGES = [
    "/reports", "/crm", "/crm/contacts", "/crm/contacts/new", "/crm/companies", "/crm/companies/new", "/crm/leads", "/crm/leads/new",
    "/crm/deals", "/crm/deals/new", "/crm/tasks", "/sales", "/sales/products", "/sales/products/new", "/sales/price-lists",
    "/sales/quotes", "/sales/quotes/new", "/sales/orders", "/sales/orders/new", "/sales/invoices", "/sales/invoices/new",
    "/sales/invoices/recurring", "/sales/invoices/recurring/new", "/sales/invoices/templates", "/sales/delivery-challans",
    "/sales/credit-notes", "/sales/rental", "/finance", "/finance/accounts", "/finance/accounts/new", "/finance/ledger",
    "/finance/expenses", "/finance/bills", "/finance/bills/new", "/finance/payments", "/finance/receivable", "/finance/payable",
    "/finance/reports", "/finance/tax-summary", "/finance/budgets", "/purchase", "/purchase/orders/new", "/purchase/vendors/new",
    "/purchase/rfq", "/purchase/rfq/new", "/inventory", "/inventory/warehouses/new", "/manufacturing", "/hr", "/hr/employees/new",
    "/hr/payroll", "/hr/performance", "/hr/recruitment", "/hr/portal", "/projects", "/projects/new", "/reports/builder",
    "/settings", "/settings/notifications", "/settings/workflows", "/support", "/workspace-settings",
]

test.describe.configure({ mode: "serial" })

test("every app page opens without errors", async ({ page }) => {
    test.setTimeout(PAGES.length * 20_000 + 60_000)
    await page.goto("/login")
    await page.getByLabel("Email address").fill(email!)
    await page.getByLabel("Password", { exact: true }).fill(password!)
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page).toHaveURL(/\/(reports|admin)/, { timeout: 30_000 })

    const problems: string[] = []
    for (const path of PAGES) {
        const errors = collectErrors(page)
        const res = await page.goto(path, { waitUntil: "load" })
        await page.waitForTimeout(800)
        const status = res?.status() ?? 0
        const text = await page.locator("body").innerText()
        if (status >= 400) problems.push(`${path}: HTTP ${status}`)
        if (ERROR_SCREEN.test(text)) problems.push(`${path}: error screen`)
        for (const e of errors) problems.push(`${path}: ${e}`)
        page.removeAllListeners("console")
        page.removeAllListeners("pageerror")
        page.removeAllListeners("response")
    }
    expect(problems).toEqual([])
})
