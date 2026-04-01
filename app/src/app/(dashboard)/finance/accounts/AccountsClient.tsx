"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus, Search, ChevronRight, ChevronDown, MoreHorizontal,
  Pencil, Trash2, Loader2, Landmark, TrendingUp, TrendingDown,
  Wallet, Scale, Layers, FolderTree, Sparkles
} from "lucide-react"
import {
  type Account, type AccountType,
  deleteAccount, seedDefaultAccounts,
} from "@/app/actions/finance/accounts"

/* ── Helper: Build tree from flat list ── */
function buildAccountTree(accounts: Account[]): Account[] {
  const map = new Map<string, Account>()
  const roots: Account[] = []
  for (const acct of accounts) {
    map.set(acct.id, { ...acct, children: [], depth: 0 })
  }
  for (const acct of accounts) {
    const node = map.get(acct.id)!
    if (acct.parent_id && map.has(acct.parent_id)) {
      const parent = map.get(acct.parent_id)!
      parent.children!.push(node)
      node.depth = (parent.depth ?? 0) + 1
    } else {
      roots.push(node)
    }
  }
  return roots
}

/* ── Helper: Flatten tree for table display ── */
function flattenTree(nodes: Account[], depth = 0): Account[] {
  const result: Account[] = []
  for (const node of nodes) {
    result.push({ ...node, depth })
    if (node.children && node.children.length > 0) {
      result.push(...flattenTree(node.children, depth + 1))
    }
  }
  return result
}

const TYPE_CONFIG: Record<AccountType, { label: string; color: string; icon: React.ReactNode }> = {
  ASSET: { label: "Asset", color: "bg-blue-50 text-blue-700 border-blue-200", icon: <Wallet className="h-3.5 w-3.5" /> },
  LIABILITY: { label: "Liability", color: "bg-red-50 text-red-700 border-red-200", icon: <TrendingDown className="h-3.5 w-3.5" /> },
  EQUITY: { label: "Equity", color: "bg-purple-50 text-purple-700 border-purple-200", icon: <Scale className="h-3.5 w-3.5" /> },
  REVENUE: { label: "Revenue", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <TrendingUp className="h-3.5 w-3.5" /> },
  EXPENSE: { label: "Expense", color: "bg-amber-50 text-amber-700 border-amber-200", icon: <Landmark className="h-3.5 w-3.5" /> },
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount)
}

interface Props {
  initialAccounts: Account[]
}

export default function AccountsClient({ initialAccounts }: Props) {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<"all" | AccountType>("all")
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [seeding, setSeeding] = useState(false)
  const [, startTransition] = useTransition()

  const toggleExpand = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const expandAll = () => {
    setExpandedGroups(new Set(accounts.filter(a => a.is_group).map(a => a.id)))
  }

  const collapseAll = () => {
    setExpandedGroups(new Set())
  }

  // Filter
  const filteredAccounts = accounts.filter(a => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.code.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === "all" || a.type === filterType
    return matchesSearch && matchesType
  })

  // Build tree
  const tree = buildAccountTree(filteredAccounts)
  const flatList = flattenTree(tree)

  // Stats
  const totalAssets = accounts.filter(a => a.type === "ASSET" && !a.is_group).reduce((s, a) => s + Number(a.balance), 0)
  const totalLiabilities = accounts.filter(a => a.type === "LIABILITY" && !a.is_group).reduce((s, a) => s + Number(a.balance), 0)
  const totalRevenue = accounts.filter(a => a.type === "REVENUE" && !a.is_group).reduce((s, a) => s + Number(a.balance), 0)
  const totalExpenses = accounts.filter(a => a.type === "EXPENSE" && !a.is_group).reduce((s, a) => s + Number(a.balance), 0)

  const handleDelete = (id: string) => {
    setDeletingId(id)
    startTransition(async () => {
      const { error } = await deleteAccount(id)
      if (!error) {
        setAccounts(prev => prev.filter(a => a.id !== id))
      }
      setDeletingId(null)
    })
  }

  const handleSeed = () => {
    setSeeding(true)
    startTransition(async () => {
      const { error, count } = await seedDefaultAccounts()
      if (!error) {
        router.refresh()
      } else {
        alert(error)
      }
      setSeeding(false)
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chart of Accounts</h1>
          <p className="text-muted-foreground">Manage your financial accounts structure</p>
        </div>
        <div className="flex items-center gap-2">
          {accounts.length === 0 && (
            <Button variant="outline" onClick={handleSeed} disabled={seeding}>
              {seeding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Seed Default CoA
            </Button>
          )}
          <Button onClick={() => router.push("/finance/accounts/new")}>
            <Plus className="h-4 w-4 mr-2" /> New Account
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Assets", value: totalAssets, color: "text-blue-600", bg: "bg-blue-500/10", icon: <Wallet className="h-5 w-5 text-blue-500" /> },
          { label: "Total Liabilities", value: totalLiabilities, color: "text-red-600", bg: "bg-red-500/10", icon: <TrendingDown className="h-5 w-5 text-red-500" /> },
          { label: "Total Revenue", value: totalRevenue, color: "text-emerald-600", bg: "bg-emerald-500/10", icon: <TrendingUp className="h-5 w-5 text-emerald-500" /> },
          { label: "Total Expenses", value: totalExpenses, color: "text-amber-600", bg: "bg-amber-500/10", icon: <Landmark className="h-5 w-5 text-amber-500" /> },
        ].map((stat, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{formatCurrency(stat.value)}</p>
                </div>
                <div className={`h-10 w-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search accounts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex border rounded-lg overflow-hidden shadow-sm">
                {(["all", "ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      filterType === type
                        ? "bg-primary text-primary-foreground"
                        : "bg-background hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    {type === "all" ? "All" : TYPE_CONFIG[type].label}
                  </button>
                ))}
              </div>
              <Button variant="ghost" size="sm" onClick={expandAll}>
                <Layers className="h-4 w-4 mr-1" /> Expand
              </Button>
              <Button variant="ghost" size="sm" onClick={collapseAll}>
                <FolderTree className="h-4 w-4 mr-1" /> Collapse
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Landmark className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-lg font-medium text-muted-foreground">No accounts yet</p>
              <p className="text-sm text-muted-foreground/60 mt-1 mb-4">
                Seed the default Indian Chart of Accounts or create accounts manually.
              </p>
              <Button onClick={handleSeed} disabled={seeding}>
                {seeding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Seed Default CoA
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[100px]">Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead className="w-[110px]">Type</TableHead>
                  <TableHead className="text-right w-[150px]">Balance</TableHead>
                  <TableHead className="w-[70px]">Status</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flatList.map((account) => {
                  const isExpanded = expandedGroups.has(account.id)
                  const depth = account.depth ?? 0
                  const config = TYPE_CONFIG[account.type]

                  return (
                    <TableRow
                      key={account.id}
                      className={`hover:bg-muted/20 ${account.is_group ? "bg-muted/10 font-medium" : ""}`}
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {account.code}
                      </TableCell>
                      <TableCell>
                        <div
                          className="flex items-center gap-1.5 cursor-pointer"
                          style={{ paddingLeft: `${depth * 20}px` }}
                          onClick={() => account.is_group && toggleExpand(account.id)}
                        >
                          {account.is_group ? (
                            isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                            )
                          ) : (
                            <span className="w-4 shrink-0" />
                          )}
                          <span className={`text-sm ${account.is_group ? "font-semibold" : ""}`}>
                            {account.name}
                          </span>
                          {account.is_system && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1 ml-1 text-muted-foreground">
                              SYS
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${config.color}`}>
                          {config.icon}
                          <span className="ml-1">{config.label}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {!account.is_group && formatCurrency(Number(account.balance))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={account.is_active ? "default" : "secondary"} className="text-[10px] h-5">
                          {account.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              {deletingId === account.id
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <MoreHorizontal className="h-4 w-4" />}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/finance/accounts/${account.id}/edit`)}>
                              <Pencil className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            {!account.is_system && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleDelete(account.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
