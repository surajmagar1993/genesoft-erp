import { prisma } from "@/lib/prisma"
import { convertAmount } from "@/lib/exchange-rates"

/**
 * Profit and loss from the business documents, in the business's currency,
 * excluding tax (tax collected or paid isn't income or cost):
 *   revenue  = sales invoices (+ debit notes) − credit notes
 *   COGS     = bill lines for stock products
 *   operating = other bill lines + approved/paid expenses + payroll
 * Accrual basis: documents count on their own date, paid or not.
 * Server-only.
 */

export interface ProfitAndLoss {
    revenue: { sales: number; creditNotes: number; total: number }
    expenses: { cogs: number; bills: number; expenses: number; payroll: number; operating: number; total: number }
    grossProfit: number
    netProfit: number
    profitMargin: number
}

type Dated = { date: Date; amount: number }
type Num = { toString(): string } | number | string
type BillRow = { subtotal: Num; discount: Num | null; currencyCode: string | null; billDate: Date; items: { lineTotal: Num; taxAmount: Num; product: { type: string } | null }[] }
type PayrollRow = { totalGross: Num; periodYear: number; periodMonth: number }

const round2 = (n: number) => Math.round(n * 100) / 100

/** Invoices/bills count once issued; drafts, proformas and cancelled ones don't. */
const LIVE_INVOICE = ["SENT", "VIEWED", "PARTIALLY_PAID", "PAID", "OVERDUE"]
const LIVE_BILL = ["OPEN", "PARTIALLY_PAID", "PAID"]
const LIVE_CREDIT_NOTE = ["ISSUED", "APPLIED", "REFUNDED"]
const LIVE_EXPENSE = ["APPROVED", "PAID"]
const LIVE_PAYROLL = ["APPROVED", "PROCESSED", "PAID"]

/** All P&L lines between two dates (inclusive), as dated amounts in base currency. */
async function loadLines(tenantId: string, start: Date, end: Date) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { currencyCode: true } })
    if (!tenant) throw new Error("Tenant not found")
    const base = tenant.currencyCode
    const toBase = async (amount: number, currency: string | null | undefined) =>
        !currency || currency === base ? amount : (await convertAmount(amount, currency, base)).toNumber()

    const [invoices, creditNotes, bills, expenses, payrollRuns] = await Promise.all([
        prisma.invoice.findMany({
            where: { tenantId, type: { in: ["TAX_INVOICE", "DEBIT_NOTE", "CREDIT_NOTE"] }, status: { in: LIVE_INVOICE as never }, invoiceDate: { gte: start, lte: end } },
            select: { type: true, total: true, taxAmount: true, currencyCode: true, invoiceDate: true },
        }),
        prisma.creditNote.findMany({
            where: { tenantId, status: { in: LIVE_CREDIT_NOTE as never }, issueDate: { gte: start, lte: end } },
            select: { subtotal: true, currencyCode: true, issueDate: true },
        }),
        prisma.bill.findMany({
            where: { tenantId, status: { in: LIVE_BILL as never }, billDate: { gte: start, lte: end } },
            select: {
                subtotal: true, discount: true, currencyCode: true, billDate: true,
                items: { select: { lineTotal: true, taxAmount: true, product: { select: { type: true } } } },
            },
        }),
        prisma.expense.findMany({
            where: { tenantId, status: { in: LIVE_EXPENSE as never }, expenseDate: { gte: start, lte: end } },
            select: { amount: true, currencyCode: true, expenseDate: true },
        }),
        prisma.payrollRun.findMany({
            where: { tenantId, status: { in: LIVE_PAYROLL as never } },
            select: { totalGross: true, periodYear: true, periodMonth: true },
        }),
    ])

    const sales: Dated[] = []
    const credits: Dated[] = []
    for (const inv of invoices) {
        const net = await toBase(Number(inv.total) - Number(inv.taxAmount), inv.currencyCode)
        if (inv.type === "CREDIT_NOTE") credits.push({ date: inv.invoiceDate, amount: Math.abs(net) })
        else sales.push({ date: inv.invoiceDate, amount: net })
    }
    for (const cn of creditNotes) credits.push({ date: cn.issueDate, amount: await toBase(Number(cn.subtotal), cn.currencyCode) })

    const cogs: Dated[] = []
    const billCosts: Dated[] = []
    for (const bill of bills as BillRow[]) {
        // Bill net of discount, before tax, split by its product vs. other lines
        const net = await toBase(Number(bill.subtotal) - Number(bill.discount || 0), bill.currencyCode)
        const lines = bill.items.map((i: BillRow["items"][number]) => ({ amount: Math.max(0, Number(i.lineTotal) - Number(i.taxAmount)), stock: i.product?.type === "PRODUCT" }))
        const lineSum = lines.reduce((s, l) => s + l.amount, 0)
        const stockShare = lineSum > 0 ? lines.filter((l) => l.stock).reduce((s, l) => s + l.amount, 0) / lineSum : 0
        cogs.push({ date: bill.billDate, amount: net * stockShare })
        billCosts.push({ date: bill.billDate, amount: net * (1 - stockShare) })
    }

    const expenseCosts: Dated[] = []
    for (const e of expenses) expenseCosts.push({ date: e.expenseDate, amount: await toBase(Number(e.amount), e.currencyCode) })

    // Payroll is a cost of the month it covers (dated to that month's last day)
    const payroll: Dated[] = (payrollRuns as PayrollRow[])
        .map((r) => ({ date: new Date(Date.UTC(r.periodYear, r.periodMonth, 0, 12)), amount: Number(r.totalGross) }))
        .filter((r: Dated) => r.date >= start && r.date <= end)

    return { sales, credits, cogs, billCosts, expenseCosts, payroll }
}

function summarise(lines: Awaited<ReturnType<typeof loadLines>>, inRange: (d: Date) => boolean): ProfitAndLoss {
    const sum = (xs: Dated[]) => round2(xs.filter((x) => inRange(x.date)).reduce((s, x) => s + x.amount, 0))
    const sales = sum(lines.sales)
    const creditNotes = sum(lines.credits)
    const revenue = round2(sales - creditNotes)
    const cogs = sum(lines.cogs)
    const bills = sum(lines.billCosts)
    const expenses = sum(lines.expenseCosts)
    const payroll = sum(lines.payroll)
    const operating = round2(bills + expenses + payroll)
    const grossProfit = round2(revenue - cogs)
    const netProfit = round2(grossProfit - operating)
    return {
        revenue: { sales, creditNotes, total: revenue },
        expenses: { cogs, bills, expenses, payroll, operating, total: round2(cogs + operating) },
        grossProfit,
        netProfit,
        profitMargin: revenue > 0 ? Math.round((netProfit / revenue) * 1000) / 10 : 0,
    }
}

/** Dates as YYYY-MM-DD, both inclusive. */
export async function computeProfitAndLoss(tenantId: string, startDate: string, endDate: string): Promise<ProfitAndLoss> {
    const start = new Date(`${startDate}T00:00:00.000Z`)
    const end = new Date(`${endDate}T23:59:59.999Z`)
    const lines = await loadLines(tenantId, start, end)
    return summarise(lines, () => true)
}

/** The twelve months of a calendar year. */
export async function computeMonthlyProfitAndLoss(tenantId: string, year: number): Promise<ProfitAndLoss[]> {
    const lines = await loadLines(tenantId, new Date(Date.UTC(year, 0, 1)), new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)))
    return Array.from({ length: 12 }, (_, m) => summarise(lines, (d) => d.getUTCFullYear() === year && d.getUTCMonth() === m))
}
