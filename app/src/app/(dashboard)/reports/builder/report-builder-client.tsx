"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    FileSpreadsheet,
    Play,
    Save,
    Download,
    Printer,
    FolderOpen,
    Filter,
    Plus,
    Trash2,
    BarChart3,
    LineChart as LineChartIcon,
    PieChart as PieChartIcon,
    AreaChart as AreaChartIcon,
    Layers,
    Receipt,
    Warehouse,
    DollarSign,
    Users,
    FolderKanban,
    ChevronDown,
    ChevronRight,
    RefreshCw,
    SlidersHorizontal,
    ArrowUpDown,
    Check,
    X,
    Sparkles,
    FileText,
    TrendingUp,
    LayoutDashboard
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    LineChart,
    Line,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend
} from "recharts"
import Papa from "papaparse"
import { toast } from "sonner"
import { format } from "date-fns"
import type {
    DatasetType,
    DatasetMeta,
    ReportConfig,
    ReportQueryResult,
    SavedReportRecord,
    ReportFilterCondition
} from "@/types/report-builder"
import {
    runCustomReportQuery,
    saveCustomReport,
    deleteCustomReport
} from "@/app/actions/reports/builder"

const CHART_COLORS = ["#4f46e5", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#64748b"]

interface ReportBuilderClientProps {
    datasets: DatasetMeta[]
    savedReports: SavedReportRecord[]
    initialResult: ReportQueryResult
    initialConfig: ReportConfig
}

export function ReportBuilderClient({
    datasets,
    savedReports,
    initialResult,
    initialConfig
}: ReportBuilderClientProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    // Active configuration state
    const [config, setConfig] = useState<ReportConfig>(initialConfig)
    const [reportResult, setReportResult] = useState<ReportQueryResult>(initialResult)
    const [reportTitle, setReportTitle] = useState(initialConfig.title || "Sales Invoices & Revenue Breakdown")

    // Studio Layout: left config panel collapse state
    const [isConfigCollapsed, setIsConfigCollapsed] = useState(false)

    // Modals
    const [isSavedReportsOpen, setIsSavedReportsOpen] = useState(false)
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
    const [saveForm, setSaveForm] = useState({
        name: reportTitle,
        description: ""
    })

    // Pagination
    const [currentPage, setCurrentPage] = useState(1)
    const pageSize = 15

    // Current dataset definition
    const activeDatasetDef = useMemo(() => {
        return datasets.find(d => d.id === config.dataset) || datasets[0]
    }, [datasets, config.dataset])

    // Dataset Switch
    const handleDatasetChange = (newDataset: DatasetType) => {
        const def = datasets.find(d => d.id === newDataset)
        if (!def) return

        const defaultSelected = def.fields.slice(0, 6).map(f => f.key)
        const numericField = def.fields.find(f => f.type === "number")?.key || null
        const groupField = def.fields.find(f => f.type === "string" && f.key !== "sku" && f.key !== "invoiceNumber")?.key || null

        const nextConfig: ReportConfig = {
            dataset: newDataset,
            title: `${def.name} Report`,
            selectedFields: defaultSelected,
            filters: [],
            groupBy: groupField,
            aggregateField: numericField,
            aggregateFn: numericField ? "SUM" : "COUNT",
            chartType: "bar",
            sortBy: numericField || undefined,
            sortOrder: "desc"
        }

        setConfig(nextConfig)
        setReportTitle(`${def.name} Report`)
        setCurrentPage(1)

        // Execute initial query on dataset switch
        startTransition(async () => {
            const res = await runCustomReportQuery(nextConfig)
            setReportResult(res)
        })
    }

    // Toggle Field Selection
    const handleToggleField = (fieldKey: string) => {
        let nextSelected: string[] = []
        if (config.selectedFields.includes(fieldKey)) {
            if (config.selectedFields.length <= 1) {
                toast.error("At least one field must remain selected")
                return
            }
            nextSelected = config.selectedFields.filter(k => k !== fieldKey)
        } else {
            nextSelected = [...config.selectedFields, fieldKey]
        }
        setConfig({ ...config, selectedFields: nextSelected })
    }

    // Filter Add / Remove / Change
    const handleAddFilter = () => {
        const firstField = activeDatasetDef.fields[0]?.key || "name"
        const nextFilters: ReportFilterCondition[] = [
            ...config.filters,
            { field: firstField, operator: "contains", value: "" }
        ]
        setConfig({ ...config, filters: nextFilters })
    }

    const handleRemoveFilter = (index: number) => {
        const nextFilters = config.filters.filter((_, i) => i !== index)
        setConfig({ ...config, filters: nextFilters })
    }

    const handleFilterChange = (index: number, patch: Partial<ReportFilterCondition>) => {
        const nextFilters = config.filters.map((f, i) => {
            if (i === index) return { ...f, ...patch }
            return f
        })
        setConfig({ ...config, filters: nextFilters })
    }

    // Run Report Query
    const handleRunQuery = () => {
        startTransition(async () => {
            try {
                const res = await runCustomReportQuery({
                    ...config,
                    title: reportTitle
                })
                setReportResult(res)
                setCurrentPage(1)
                toast.success(`Report generated: ${res.totalCount} records`)
            } catch (err: any) {
                toast.error(err.message || "Failed to generate report")
            }
        })
    }

    // Load Saved Template
    const handleLoadTemplate = (saved: SavedReportRecord) => {
        setConfig(saved.config)
        setReportTitle(saved.name)
        setIsSavedReportsOpen(false)
        setCurrentPage(1)

        startTransition(async () => {
            try {
                const res = await runCustomReportQuery(saved.config)
                setReportResult(res)
                toast.success(`Loaded report: ${saved.name}`)
            } catch (err: any) {
                toast.error(err.message || "Failed to load report")
            }
        })
    }

    // Save Report Dialog Submit
    const handleSaveReport = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!saveForm.name.trim()) return toast.error("Report name is required")

        startTransition(async () => {
            const res = await saveCustomReport({
                name: saveForm.name,
                description: saveForm.description,
                dataset: config.dataset,
                config: { ...config, title: saveForm.name }
            })
            if (res.success) {
                toast.success("Custom report template saved")
                setIsSaveModalOpen(false)
                router.refresh()
            } else {
                toast.error(res.error || "Failed to save report")
            }
        })
    }

    // Delete Saved Report
    const handleDeleteSaved = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        startTransition(async () => {
            const res = await deleteCustomReport(id)
            if (res.success) {
                toast.success("Report template removed")
                router.refresh()
            } else {
                toast.error(res.error || "Failed to delete report")
            }
        })
    }

    // Export CSV (PapaParse)
    const handleExportCSV = () => {
        if (!reportResult || reportResult.rows.length === 0) {
            toast.error("No data rows available to export")
            return
        }

        const dataToExport = reportResult.rows.map(row => {
            const exportRow: Record<string, any> = {}
            reportResult.columns.forEach(col => {
                exportRow[col.label] = row[col.key] !== undefined ? row[col.key] : ""
            })
            return exportRow
        })

        const csv = Papa.unparse(dataToExport)
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.setAttribute("href", url)
        link.setAttribute("download", `${reportTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${format(new Date(), "yyyyMMdd")}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success("CSV export downloaded successfully")
    }

    // Print Report
    const handlePrint = () => {
        window.print()
    }

    // Paginated rows for preview
    const paginatedRows = useMemo(() => {
        const start = (currentPage - 1) * pageSize
        return reportResult.rows.slice(start, start + pageSize)
    }, [reportResult.rows, currentPage])

    const totalPages = Math.ceil(reportResult.totalCount / pageSize) || 1

    const getDatasetIcon = (type: DatasetType) => {
        switch (type) {
            case "INVOICES": return Receipt
            case "INVENTORY": return Warehouse
            case "BILLS": return FileText
            case "EXPENSES": return DollarSign
            case "HR_WORKFORCE": return Users
            case "PROJECTS": return FolderKanban
        }
    }

    return (
        <div className="space-y-6 pb-16">
            {/* Screen Header & Action Bar */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4 print:hidden">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400">
                            <FileSpreadsheet className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">{reportTitle}</h1>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Ad-hoc ERP reporting • {activeDatasetDef.name} dataset ({reportResult.totalCount} records)
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsSavedReportsOpen(true)}
                        className="text-xs h-9"
                    >
                        <FolderOpen className="mr-1.5 h-3.5 w-3.5 text-primary" />
                        Templates ({savedReports.length})
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setSaveForm({ name: reportTitle, description: "" })
                            setIsSaveModalOpen(true)
                        }}
                        className="text-xs h-9"
                    >
                        <Save className="mr-1.5 h-3.5 w-3.5" />
                        Save Preset
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportCSV}
                        className="text-xs h-9"
                        disabled={reportResult.totalCount === 0}
                    >
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        Export CSV
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrint}
                        className="text-xs h-9"
                        disabled={reportResult.totalCount === 0}
                    >
                        <Printer className="mr-1.5 h-3.5 w-3.5" />
                        Print / PDF
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleRunQuery}
                        disabled={isPending}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9"
                    >
                        <Play className={`mr-1.5 h-3.5 w-3.5 ${isPending ? "animate-spin" : "fill-current"}`} />
                        Run Query
                    </Button>
                </div>
            </div>

            {/* PRINT-ONLY HEADER */}
            <div className="hidden print:block mb-6 border-b pb-4">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold uppercase tracking-wide">{reportTitle}</h1>
                        <p className="text-xs text-muted-foreground mt-1">
                            ERP Custom Analytical Report • Dataset: {activeDatasetDef.name}
                        </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                        <p>Generated: {format(new Date(), "dd MMMM yyyy HH:mm")}</p>
                        <p>Total Records: {reportResult.totalCount}</p>
                    </div>
                </div>
            </div>

            {/* Split Screen Workspace: Left Builder Drawer + Right Canvas */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT BUILDER DRAWER */}
                <div className={`${isConfigCollapsed ? "lg:col-span-1" : "lg:col-span-4"} space-y-4 print:hidden transition-all duration-300`}>
                    <Card className="border-border/60 shadow-xs">
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            {!isConfigCollapsed && (
                                <div>
                                    <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                                        <SlidersHorizontal className="h-4 w-4 text-indigo-600" />
                                        Report Design Studio
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Configure dataset, metrics, and filters
                                    </CardDescription>
                                </div>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 ml-auto"
                                onClick={() => setIsConfigCollapsed(!isConfigCollapsed)}
                                title={isConfigCollapsed ? "Expand Studio" : "Collapse Studio"}
                            >
                                {isConfigCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                        </CardHeader>

                        {!isConfigCollapsed && (
                            <CardContent className="space-y-5 text-xs">
                                {/* 1. Dataset Selection */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">1. Data Source (Entity)</Label>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {datasets.map(d => {
                                            const Icon = getDatasetIcon(d.id)
                                            const isSelected = config.dataset === d.id
                                            return (
                                                <button
                                                    key={d.id}
                                                    type="button"
                                                    onClick={() => handleDatasetChange(d.id)}
                                                    className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                                                        isSelected
                                                            ? "bg-indigo-600/10 border-indigo-600 text-indigo-700 dark:text-indigo-400 font-semibold ring-1 ring-indigo-600"
                                                            : "hover:bg-muted border-border/70 text-muted-foreground"
                                                    }`}
                                                >
                                                    <Icon className="h-3.5 w-3.5 shrink-0" />
                                                    <span className="truncate text-[11px]">{d.name.split(" ")[0]}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* 2. Column / Field Picker */}
                                <div className="space-y-1.5 border-t pt-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-semibold">2. Output Columns ({config.selectedFields.length})</Label>
                                        <button
                                            type="button"
                                            onClick={() => setConfig({ ...config, selectedFields: activeDatasetDef.fields.map(f => f.key) })}
                                            className="text-[10px] text-indigo-600 hover:underline"
                                        >
                                            Select All
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 border rounded-md bg-muted/20">
                                        {activeDatasetDef.fields.map(f => {
                                            const isChecked = config.selectedFields.includes(f.key)
                                            return (
                                                <button
                                                    key={f.key}
                                                    type="button"
                                                    onClick={() => handleToggleField(f.key)}
                                                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-all flex items-center gap-1 ${
                                                        isChecked
                                                            ? "bg-indigo-600 text-white border-indigo-600 font-medium"
                                                            : "bg-background text-muted-foreground border-border hover:bg-muted"
                                                    }`}
                                                >
                                                    {isChecked && <Check className="h-2.5 w-2.5" />}
                                                    {f.label}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* 3. Filter Criteria */}
                                <div className="space-y-2 border-t pt-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-semibold">3. Filters & Criteria</Label>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-6 px-1.5 text-[10px]"
                                            onClick={handleAddFilter}
                                        >
                                            <Plus className="mr-1 h-3 w-3" />
                                            Add Filter
                                        </Button>
                                    </div>

                                    {config.filters.length === 0 ? (
                                        <p className="text-[11px] text-muted-foreground italic bg-muted/20 p-2 rounded border border-dashed">
                                            No filters applied. Showing all records.
                                        </p>
                                    ) : (
                                        <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                                            {config.filters.map((flt, idx) => (
                                                <div key={idx} className="flex items-center gap-1.5 bg-muted/40 p-1.5 rounded border">
                                                    <Select
                                                        value={flt.field}
                                                        onValueChange={(val) => handleFilterChange(idx, { field: val })}
                                                    >
                                                        <SelectTrigger className="h-7 text-[10px] w-28">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {activeDatasetDef.fields.map(f => (
                                                                <SelectItem key={f.key} value={f.key} className="text-xs">
                                                                    {f.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>

                                                    <Select
                                                        value={flt.operator}
                                                        onValueChange={(val: any) => handleFilterChange(idx, { operator: val })}
                                                    >
                                                        <SelectTrigger className="h-7 text-[10px] w-24">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="contains" className="text-xs">contains</SelectItem>
                                                            <SelectItem value="equals" className="text-xs">equals</SelectItem>
                                                            <SelectItem value="greater_than" className="text-xs">&gt; greater</SelectItem>
                                                            <SelectItem value="less_than" className="text-xs">&lt; less</SelectItem>
                                                        </SelectContent>
                                                    </Select>

                                                    <Input
                                                        placeholder="Value..."
                                                        value={flt.value}
                                                        onChange={(e) => handleFilterChange(idx, { value: e.target.value })}
                                                        className="h-7 text-[10px] flex-1 min-w-0"
                                                    />

                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveFilter(idx)}
                                                        className="h-6 w-6 text-muted-foreground hover:text-red-500 flex items-center justify-center rounded"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* 4. Aggregations & Grouping */}
                                <div className="space-y-2 border-t pt-3">
                                    <Label className="text-xs font-semibold">4. Grouping & Summaries</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-muted-foreground">Group By</span>
                                            <Select
                                                value={config.groupBy || "none"}
                                                onValueChange={(val) => setConfig({ ...config, groupBy: val === "none" ? null : val })}
                                            >
                                                <SelectTrigger className="h-7 text-[10px]">
                                                    <SelectValue placeholder="None" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">None (Flat list)</SelectItem>
                                                    {activeDatasetDef.fields
                                                        .filter(f => f.type === "string" || f.type === "date")
                                                        .map(f => (
                                                            <SelectItem key={f.key} value={f.key} className="text-xs">
                                                                {f.label}
                                                            </SelectItem>
                                                        ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1">
                                            <span className="text-[10px] text-muted-foreground">Function</span>
                                            <Select
                                                value={config.aggregateFn || "none"}
                                                onValueChange={(val: any) => setConfig({ ...config, aggregateFn: val === "none" ? null : val })}
                                            >
                                                <SelectTrigger className="h-7 text-[10px]">
                                                    <SelectValue placeholder="None" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">None</SelectItem>
                                                    <SelectItem value="SUM">SUM</SelectItem>
                                                    <SelectItem value="AVG">AVG</SelectItem>
                                                    <SelectItem value="COUNT">COUNT</SelectItem>
                                                    <SelectItem value="MAX">MAX</SelectItem>
                                                    <SelectItem value="MIN">MIN</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {config.aggregateFn && config.aggregateFn !== "COUNT" && (
                                        <div className="space-y-1 pt-1">
                                            <span className="text-[10px] text-muted-foreground">Target Numeric Field</span>
                                            <Select
                                                value={config.aggregateField || ""}
                                                onValueChange={(val) => setConfig({ ...config, aggregateField: val })}
                                            >
                                                <SelectTrigger className="h-7 text-[10px]">
                                                    <SelectValue placeholder="Select field" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {activeDatasetDef.fields
                                                        .filter(f => f.type === "number")
                                                        .map(f => (
                                                            <SelectItem key={f.key} value={f.key} className="text-xs">
                                                                {f.label}
                                                            </SelectItem>
                                                        ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </div>

                                {/* 5. Visualization Chart Type */}
                                <div className="space-y-1.5 border-t pt-3">
                                    <Label className="text-xs font-semibold">5. Visual Chart Type</Label>
                                    <div className="grid grid-cols-5 gap-1 text-center">
                                        {[
                                            { id: "bar", label: "Bar", icon: BarChart3 },
                                            { id: "line", label: "Line", icon: LineChartIcon },
                                            { id: "area", label: "Area", icon: AreaChartIcon },
                                            { id: "pie", label: "Pie", icon: PieChartIcon },
                                            { id: "none", label: "None", icon: X }
                                        ].map(c => {
                                            const Icon = c.icon
                                            const isSelected = config.chartType === c.id
                                            return (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    onClick={() => setConfig({ ...config, chartType: c.id as any })}
                                                    className={`flex flex-col items-center justify-center p-1.5 rounded border transition-all ${
                                                        isSelected
                                                            ? "bg-indigo-600 text-white border-indigo-600 font-medium"
                                                            : "bg-muted/30 text-muted-foreground hover:bg-muted"
                                                    }`}
                                                >
                                                    <Icon className="h-3.5 w-3.5" />
                                                    <span className="text-[9px] mt-0.5">{c.label}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                <Button
                                    type="button"
                                    onClick={handleRunQuery}
                                    disabled={isPending}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 mt-2"
                                >
                                    <Play className={`mr-1.5 h-3.5 w-3.5 ${isPending ? "animate-spin" : "fill-current"}`} />
                                    Generate Report
                                </Button>
                            </CardContent>
                        )}
                    </Card>
                </div>

                {/* RIGHT CANVAS: Analytics Chart & Results Table */}
                <div className={`${isConfigCollapsed ? "lg:col-span-11" : "lg:col-span-8"} space-y-4`}>
                    {/* Summary KPI Ribbon */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <Card className="border-border/60 shadow-xs p-3">
                            <div className="text-[11px] font-medium text-muted-foreground">Total Records</div>
                            <div className="text-xl font-bold mt-0.5">{reportResult.totalCount}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">Matching criteria</div>
                        </Card>

                        {reportResult.summary.aggregateResult !== null && (
                            <Card className="border-border/60 shadow-xs p-3">
                                <div className="text-[11px] font-medium text-muted-foreground truncate">
                                    {reportResult.summary.aggregateLabel || "Aggregate"}
                                </div>
                                <div className="text-xl font-bold text-indigo-600 mt-0.5">
                                    {reportResult.summary.aggregateResult.toLocaleString()}
                                </div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">Computed total</div>
                            </Card>
                        )}

                        <Card className="border-border/60 shadow-xs p-3">
                            <div className="text-[11px] font-medium text-muted-foreground">Active Filters</div>
                            <div className="text-xl font-bold mt-0.5">{config.filters.length}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                                {config.groupBy ? `Grouped by ${config.groupBy}` : "Flat View"}
                            </div>
                        </Card>
                    </div>

                    {/* Chart Visualization (If enabled and chartData present) */}
                    {config.chartType !== "none" && reportResult.chartData && reportResult.chartData.length > 0 && (
                        <Card className="border-border/60 shadow-xs print:break-inside-avoid">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                                    <span>
                                        Analytics Distribution: {config.groupBy ? `By ${config.groupBy}` : "Group Analysis"}
                                    </span>
                                    <Badge variant="outline" className="text-[10px] font-mono">
                                        Top {reportResult.chartData.length} Groups
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-64 pt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    {config.chartType === "line" ? (
                                        <LineChart data={reportResult.chartData}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                            <YAxis tick={{ fontSize: 11 }} />
                                            <Tooltip />
                                            <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2} dot={{ r: 4 }} />
                                        </LineChart>
                                    ) : config.chartType === "area" ? (
                                        <AreaChart data={reportResult.chartData}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                            <YAxis tick={{ fontSize: 11 }} />
                                            <Tooltip />
                                            <Area type="monotone" dataKey="value" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.2} />
                                        </AreaChart>
                                    ) : config.chartType === "pie" ? (
                                        <PieChart>
                                            <Pie
                                                data={reportResult.chartData}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={80}
                                                label={({ name, percent }: any) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                                                labelLine={false}
                                            >
                                                {reportResult.chartData.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    ) : (
                                        <BarChart data={reportResult.chartData}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                            <YAxis tick={{ fontSize: 11 }} />
                                            <Tooltip />
                                            <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]}>
                                                {reportResult.chartData.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    )}
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    )}

                    {/* Results Table */}
                    <Card className="border-border/60 shadow-xs">
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-semibold">Report Data Table</CardTitle>
                                <CardDescription className="text-xs">
                                    Showing {paginatedRows.length} of {reportResult.totalCount} records
                                </CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto border-t">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/30">
                                            {reportResult.columns.map(col => (
                                                <TableHead key={col.key} className="text-xs font-semibold">
                                                    {col.label}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedRows.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={reportResult.columns.length || 1}
                                                    className="h-32 text-center text-muted-foreground text-xs"
                                                >
                                                    No records match the current filter criteria.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            paginatedRows.map((row, rIdx) => (
                                                <TableRow key={rIdx} className="hover:bg-muted/30 text-xs">
                                                    {reportResult.columns.map(col => {
                                                        const val = row[col.key]
                                                        return (
                                                            <TableCell key={col.key} className="py-2.5">
                                                                {col.type === "number" ? (
                                                                    <span className="font-mono font-medium">
                                                                        {typeof val === "number" ? val.toLocaleString() : val || "0"}
                                                                    </span>
                                                                ) : col.key === "status" ? (
                                                                    <Badge variant="outline" className="text-[10px]">
                                                                        {String(val || "N/A")}
                                                                    </Badge>
                                                                ) : (
                                                                    <span>{val !== null && val !== undefined ? String(val) : "—"}</span>
                                                                )}
                                                            </TableCell>
                                                        )
                                                    })}
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                    {/* Table Footer with Column Totals */}
                                    {Object.keys(reportResult.summary.numericTotals).length > 0 && (
                                        <TableFooter className="bg-muted/50 font-bold text-xs">
                                            <TableRow>
                                                {reportResult.columns.map((col, idx) => (
                                                    <TableCell key={col.key} className="py-2.5">
                                                        {idx === 0 ? (
                                                            <span>TOTAL</span>
                                                        ) : col.type === "number" && reportResult.summary.numericTotals[col.key] !== undefined ? (
                                                            <span className="font-mono text-indigo-600">
                                                                {reportResult.summary.numericTotals[col.key].toLocaleString()}
                                                            </span>
                                                        ) : null}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        </TableFooter>
                                    )}
                                </Table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between p-3 border-t text-xs print:hidden">
                                    <span className="text-muted-foreground">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-xs px-2"
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage <= 1}
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-xs px-2"
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage >= totalPages}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* DIALOG 1: Load Report Templates */}
            <Dialog open={isSavedReportsOpen} onOpenChange={setIsSavedReportsOpen}>
                <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Saved Report Templates</DialogTitle>
                        <DialogDescription>
                            Select a pre-built enterprise template or previously saved custom query.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        {savedReports.map(saved => {
                            const Icon = getDatasetIcon(saved.dataset)
                            return (
                                <div
                                    key={saved.id}
                                    onClick={() => handleLoadTemplate(saved)}
                                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/40 cursor-pointer transition-colors group"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-foreground group-hover:text-indigo-600 transition-colors">
                                                    {saved.name}
                                                </span>
                                                {saved.isPrebuilt && (
                                                    <Badge variant="secondary" className="text-[9px] bg-primary/10 text-primary">
                                                        System Preset
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                {saved.description || `Dataset: ${saved.dataset}`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {!saved.isPrebuilt && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                                                onClick={(e) => handleDeleteSaved(saved.id, e)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                        <Button variant="outline" size="sm" className="h-7 text-xs px-2">
                                            Load
                                        </Button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setIsSavedReportsOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* DIALOG 2: Save Custom Report */}
            <Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Save Report Configuration</DialogTitle>
                        <DialogDescription>
                            Save current columns, filters, and chart configuration as a reusable template.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveReport} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Report Name</Label>
                            <Input
                                placeholder="e.g. Q1 High Value Client Invoices"
                                value={saveForm.name}
                                onChange={(e) => setSaveForm({ ...saveForm, name: e.target.value })}
                                className="text-xs h-9"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Description (Optional)</Label>
                            <Textarea
                                placeholder="Summary of what this report highlights..."
                                value={saveForm.description}
                                onChange={(e) => setSaveForm({ ...saveForm, description: e.target.value })}
                                className="text-xs h-20"
                            />
                        </div>
                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setIsSaveModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" size="sm" disabled={isPending}>
                                Save Template
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
