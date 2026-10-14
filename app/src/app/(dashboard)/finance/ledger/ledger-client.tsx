"use client"

import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { BookOpen, CheckCircle2, AlertTriangle, RefreshCw, Plus, Trash2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RequireRole } from "@/components/auth/role-context"
import { unwrap } from "@/lib/action-result"
import type { AccountLedger, AccountTotal, BalanceSheet, TrialBalance } from "@/lib/accounting-reports"
import {
    getAccountLedger,
    getBalanceSheet,
    getTrialBalance,
    rebuildLedgerAction,
    saveOpeningBalancesAction,
    type LedgerPageData,
} from "@/app/actions/finance/ledger"

function BalancedBadge({ ok }: { ok: boolean }) {
    return ok ? (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> Balanced</span>
    ) : (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive"><AlertTriangle className="h-3.5 w-3.5" /> Out of balance</span>
    )
}

export function LedgerClient({
    data,
    initialTrialBalance,
    initialBalanceSheet,
    today,
}: {
    data: LedgerPageData
    initialTrialBalance: TrialBalance
    initialBalanceSheet: BalanceSheet
    today: string
}) {
    const money = useMemo(
        () => new Intl.NumberFormat(data.locale, { style: "currency", currency: data.currency, maximumFractionDigits: 2 }),
        [data.locale, data.currency]
    )
    const fmt = (n: number) => money.format(n)
    const [isPending, startTransition] = useTransition()

    /* ── Balance sheet / trial balance ── */
    const [asOf, setAsOf] = useState(today)
    const [tb, setTb] = useState(initialTrialBalance)
    const [bs, setBs] = useState(initialBalanceSheet)
    const reload = (date = asOf) =>
        startTransition(async () => {
            try {
                const [t, b] = await Promise.all([getTrialBalance(date), getBalanceSheet(date)])
                setTb(t)
                setBs(b)
            } catch (err) {
                toast.error(err instanceof Error ? err.message : "Couldn't load the reports")
            }
        })

    const onRebuild = () =>
        startTransition(async () => {
            try {
                const res = unwrap(await rebuildLedgerAction())
                if (res.failed > 0) toast.error(`Re-posted ${res.documents} documents; ${res.failed} failed: ${res.firstError}`)
                else toast.success(`Ledger rebuilt from ${res.documents} documents`)
                const [t, b] = await Promise.all([getTrialBalance(asOf), getBalanceSheet(asOf)])
                setTb(t)
                setBs(b)
            } catch (err) {
                toast.error(err instanceof Error ? err.message : "Rebuild failed")
            }
        })

    /* ── Account ledger ── */
    const firstOfMonth = `${today.slice(0, 8)}01`
    const [accountId, setAccountId] = useState(data.accounts.find((a) => a.code === "1200")?.id ?? data.accounts[0]?.id ?? "")
    const [from, setFrom] = useState(firstOfMonth)
    const [to, setTo] = useState(today)
    const [ledger, setLedger] = useState<AccountLedger | null>(null)
    const loadLedger = () =>
        startTransition(async () => {
            try {
                setLedger(unwrap(await getAccountLedger(accountId, from, to)))
            } catch (err) {
                toast.error(err instanceof Error ? err.message : "Couldn't load the ledger")
            }
        })

    /* ── Opening balances ── */
    const [obDate, setObDate] = useState(data.opening.date ?? firstOfMonth)
    const [obLines, setObLines] = useState(
        data.opening.lines.length ? data.opening.lines.map((l) => ({ ...l })) : [{ accountId: "", debit: 0, credit: 0 }]
    )
    const obDiff = obLines.reduce((s, l) => s + (Number(l.debit) || 0) - (Number(l.credit) || 0), 0)
    const saveOpening = () =>
        startTransition(async () => {
            try {
                const res = unwrap(await saveOpeningBalancesAction({ date: obDate, lines: obLines.filter((l) => l.accountId) }))
                toast.success(
                    res.equityAdjustment === 0
                        ? "Opening balances saved"
                        : `Opening balances saved; ${fmt(Math.abs(res.equityAdjustment))} posted to Opening Balance Equity to balance`
                )
                reload()
            } catch (err) {
                toast.error(err instanceof Error ? err.message : "Couldn't save opening balances")
            }
        })

    const section = (title: string, rows: AccountTotal[], extra: { label: string; value: number }[], total: number) => (
        <div className="space-y-1">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
            <Table>
                <TableBody>
                    {rows.map((r) => (
                        <TableRow key={r.accountId}>
                            <TableCell className="w-24 font-mono text-xs text-muted-foreground">{r.code}</TableCell>
                            <TableCell>{r.name}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmt(r.balance)}</TableCell>
                        </TableRow>
                    ))}
                    {extra.map((e) => (
                        <TableRow key={e.label}>
                            <TableCell />
                            <TableCell className="italic">{e.label}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmt(e.value)}</TableCell>
                        </TableRow>
                    ))}
                    {rows.length === 0 && extra.length === 0 && (
                        <TableRow><TableCell colSpan={3} className="text-muted-foreground">Nothing yet</TableCell></TableRow>
                    )}
                </TableBody>
                <TableFooter>
                    <TableRow>
                        <TableCell />
                        <TableCell className="font-semibold">Total {title.toLowerCase()}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{fmt(total)}</TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
        </div>
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <BookOpen className="h-6 w-6 text-primary" /> General Ledger
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Double-entry books built from your invoices, bills, payments, credit notes, expenses and payroll.
                    </p>
                </div>
                <RequireRole min="MANAGER">
                    <Button variant="outline" onClick={onRebuild} disabled={isPending}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${isPending ? "animate-spin" : ""}`} /> Rebuild ledger
                    </Button>
                </RequireRole>
            </div>

            <Tabs defaultValue="balance-sheet" className="space-y-4">
                <TabsList className="flex-wrap h-auto">
                    <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
                    <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
                    <TabsTrigger value="account">Account Ledger</TabsTrigger>
                    <TabsTrigger value="opening">Opening Balances</TabsTrigger>
                </TabsList>

                {(["balance-sheet", "trial-balance"] as const).map((tab) => (
                    <TabsContent key={tab} value={tab} className="space-y-4">
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="space-y-1">
                                <Label htmlFor={`asof-${tab}`}>As of</Label>
                                <Input id={`asof-${tab}`} type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="w-44" />
                            </div>
                            <Button onClick={() => reload()} disabled={isPending}>Show</Button>
                        </div>

                        {tab === "balance-sheet" ? (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between">
                                        Balance Sheet <BalancedBadge ok={bs.balanced} />
                                    </CardTitle>
                                    <CardDescription>As of {bs.asOf}. Financial year from {bs.fiscalYearStart}.</CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-8 lg:grid-cols-2">
                                    {section("Assets", bs.assets, [], bs.totalAssets)}
                                    <div className="space-y-6">
                                        {section("Liabilities", bs.liabilities, [], bs.totalLiabilities)}
                                        {section(
                                            "Equity",
                                            bs.equity,
                                            [
                                                ...(bs.retainedEarnings !== 0 ? [{ label: "Retained earnings (earlier years)", value: bs.retainedEarnings }] : []),
                                                { label: "Profit this financial year", value: bs.currentYearProfit },
                                            ],
                                            bs.totalEquity
                                        )}
                                        <p className="text-sm text-muted-foreground">
                                            Liabilities + equity: <span className="font-semibold text-foreground">{fmt(bs.totalLiabilities + bs.totalEquity)}</span>
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between">
                                        Trial Balance <BalancedBadge ok={tb.balanced} />
                                    </CardTitle>
                                    <CardDescription>Every account&apos;s balance as of {tb.asOf}. Total debits must equal total credits.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-24">Code</TableHead>
                                                <TableHead>Account</TableHead>
                                                <TableHead className="text-right">Debit</TableHead>
                                                <TableHead className="text-right">Credit</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {tb.rows.length === 0 && (
                                                <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No posted entries yet. Use “Rebuild ledger” to post your existing documents.</TableCell></TableRow>
                                            )}
                                            {tb.rows.map((r) => (
                                                <TableRow key={r.accountId}>
                                                    <TableCell className="font-mono text-xs text-muted-foreground">{r.code}</TableCell>
                                                    <TableCell>{r.name}</TableCell>
                                                    <TableCell className="text-right tabular-nums">{r.debit ? fmt(r.debit) : ""}</TableCell>
                                                    <TableCell className="text-right tabular-nums">{r.credit ? fmt(r.credit) : ""}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                        <TableFooter>
                                            <TableRow>
                                                <TableCell />
                                                <TableCell className="font-semibold">Total</TableCell>
                                                <TableCell className="text-right font-semibold tabular-nums">{fmt(tb.totalDebit)}</TableCell>
                                                <TableCell className="text-right font-semibold tabular-nums">{fmt(tb.totalCredit)}</TableCell>
                                            </TableRow>
                                        </TableFooter>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                ))}

                <TabsContent value="account" className="space-y-4">
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="space-y-1">
                            <Label>Account</Label>
                            <Select value={accountId} onValueChange={setAccountId}>
                                <SelectTrigger className="w-72"><SelectValue placeholder="Choose an account" /></SelectTrigger>
                                <SelectContent>
                                    {data.accounts.map((a) => (
                                        <SelectItem key={a.id} value={a.id}>{a.code} · {a.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="ledger-from">From</Label>
                            <Input id="ledger-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-44" />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="ledger-to">To</Label>
                            <Input id="ledger-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-44" />
                        </div>
                        <Button onClick={loadLedger} disabled={isPending || !accountId}>Show</Button>
                    </div>
                    {ledger && (
                        <Card>
                            <CardHeader>
                                <CardTitle>{ledger.account.code} · {ledger.account.name}</CardTitle>
                                <CardDescription>
                                    {ledger.from} to {ledger.to} · opening {fmt(ledger.openingBalance)} · closing {fmt(ledger.closingBalance)}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Entry</TableHead>
                                            <TableHead>Details</TableHead>
                                            <TableHead className="text-right">Debit</TableHead>
                                            <TableHead className="text-right">Credit</TableHead>
                                            <TableHead className="text-right">Balance</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell colSpan={5} className="italic text-muted-foreground">Opening balance</TableCell>
                                            <TableCell className="text-right tabular-nums">{fmt(ledger.openingBalance)}</TableCell>
                                        </TableRow>
                                        {ledger.lines.map((l, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="whitespace-nowrap">{l.date}</TableCell>
                                                <TableCell className="font-mono text-xs">{l.entryNumber}</TableCell>
                                                <TableCell>
                                                    {l.narration}
                                                    {l.contact && <span className="block text-xs text-muted-foreground">{l.contact}</span>}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">{l.debit ? fmt(l.debit) : ""}</TableCell>
                                                <TableCell className="text-right tabular-nums">{l.credit ? fmt(l.credit) : ""}</TableCell>
                                                <TableCell className="text-right tabular-nums">{fmt(l.balance)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="opening" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Opening balances</CardTitle>
                            <CardDescription>
                                Moving from another system? Enter each account&apos;s balance on the day you start using Genesoft (from your old trial balance).
                                Assets and expenses are usually debits; liabilities, equity and income are credits. Any difference goes to Opening Balance Equity.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1 max-w-xs">
                                <Label htmlFor="ob-date">Opening date</Label>
                                <Input id="ob-date" type="date" value={obDate} onChange={(e) => setObDate(e.target.value)} />
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Account</TableHead>
                                        <TableHead className="w-40 text-right">Debit</TableHead>
                                        <TableHead className="w-40 text-right">Credit</TableHead>
                                        <TableHead className="w-12" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {obLines.map((l, i) => (
                                        <TableRow key={i}>
                                            <TableCell>
                                                <Select value={l.accountId} onValueChange={(v) => setObLines(obLines.map((x, j) => (j === i ? { ...x, accountId: v } : x)))}>
                                                    <SelectTrigger><SelectValue placeholder="Choose an account" /></SelectTrigger>
                                                    <SelectContent>
                                                        {data.accounts.map((a) => (
                                                            <SelectItem key={a.id} value={a.id}>{a.code} · {a.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Input type="number" min={0} step="0.01" value={l.debit || ""} className="text-right"
                                                    onChange={(e) => setObLines(obLines.map((x, j) => (j === i ? { ...x, debit: Number(e.target.value), credit: 0 } : x)))} />
                                            </TableCell>
                                            <TableCell>
                                                <Input type="number" min={0} step="0.01" value={l.credit || ""} className="text-right"
                                                    onChange={(e) => setObLines(obLines.map((x, j) => (j === i ? { ...x, credit: Number(e.target.value), debit: 0 } : x)))} />
                                            </TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" aria-label="Remove line" onClick={() => setObLines(obLines.filter((_, j) => j !== i))}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <div className="flex flex-wrap items-center gap-3">
                                <Button variant="outline" onClick={() => setObLines([...obLines, { accountId: "", debit: 0, credit: 0 }])}>
                                    <Plus className="mr-2 h-4 w-4" /> Add account
                                </Button>
                                <span className="text-sm text-muted-foreground">
                                    {obDiff === 0 ? "Debits equal credits." : `Difference ${fmt(Math.abs(obDiff))} will go to Opening Balance Equity.`}
                                </span>
                            </div>
                            <RequireRole min="MANAGER">
                                <Button onClick={saveOpening} disabled={isPending}>Save opening balances</Button>
                            </RequireRole>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
