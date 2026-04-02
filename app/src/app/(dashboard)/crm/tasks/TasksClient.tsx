"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Plus, Search, MoreHorizontal, Pencil, Trash2,
    Calendar, AlertCircle, CheckCircle2, Clock, Loader2,
    CheckSquare, ListTodo, Activity, History
} from "lucide-react"
import { createTask, updateTask, deleteTask, type Task, type TaskStatus, type TaskPriority } from "@/app/actions/crm/tasks"

const statusConfig: Record<TaskStatus, { label: string; color: string; icon: React.ElementType }> = {
    TODO: { label: "To Do", color: "bg-slate-500/10 text-slate-500 border-slate-500/20", icon: ListTodo },
    IN_PROGRESS: { label: "In Progress", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: Activity },
    COMPLETED: { label: "Completed", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: CheckCircle2 },
    CANCELLED: { label: "Cancelled", color: "bg-red-500/10 text-red-500 border-red-500/20", icon: History },
}

const priorityConfig: Record<TaskPriority, { label: string; color: string }> = {
    LOW: { label: "Low", color: "text-slate-400 bg-slate-400/10" },
    MEDIUM: { label: "Medium", color: "text-amber-400 bg-amber-400/10" },
    HIGH: { label: "High", color: "text-orange-500 bg-orange-500/10" },
    URGENT: { label: "Urgent", color: "text-red-500 bg-red-500/10 border-red-500" },
}

interface Props {
    initialTasks: Task[]
    total: number
}

export default function TasksClient({ initialTasks, total }: Props) {
    const router = useRouter()
    const [tasks, setTasks] = useState<Task[]>(initialTasks)
    const [searchQuery, setSearchQuery] = useState("")
    const [filterStatus, setFilterStatus] = useState<string>("all")
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [pendingId, setPendingId] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [isPending, startTransition] = useTransition()

    // Sync with server data
    useState(() => {
        setTasks(initialTasks)
    })

    // Form state
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        status: "TODO" as TaskStatus,
        priority: "MEDIUM" as TaskPriority,
        due_date: "",
    })

    const handleSearch = (query: string) => {
        setSearchQuery(query)
        const params = new URLSearchParams(window.location.search)
        if (query) params.set("search", query)
        else params.delete("search")
        params.set("page", "1")
        router.push(`/crm/tasks?${params.toString()}`)
    }

    const handleStatusFilter = (status: string) => {
        setFilterStatus(status)
        const params = new URLSearchParams(window.location.search)
        if (status !== "all") params.set("status", status)
        else params.delete("status")
        params.set("page", "1")
        router.push(`/crm/tasks?${params.toString()}`)
    }

    const handlePageChange = (page: number) => {
        const params = new URLSearchParams(window.location.search)
        params.set("page", page.toString())
        router.push(`/crm/tasks?${params.toString()}`)
    }

    const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams()
    const currentPage = parseInt(searchParams.get("page") || "1")
    const limit = 10
    const totalPages = Math.ceil(total / limit)

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        const { error, data } = await createTask(formData)
        if (!error && data) {
            setTasks([data, ...tasks])
            setIsDialogOpen(false)
            setFormData({ title: "", description: "", status: "TODO", priority: "MEDIUM", due_date: "" })
        }
        setIsSaving(false)
    }

    const handleDelete = (id: string) => {
        setPendingId(id)
        startTransition(async () => {
            const { error } = await deleteTask(id)
            if (!error) setTasks((prev) => prev.filter((t) => t.id !== id))
            setPendingId(null)
        })
    }

    const handleStatusUpdate = (id: string, status: TaskStatus) => {
        setPendingId(id)
        startTransition(async () => {
            const { error } = await updateTask(id, { status })
            if (!error) setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status } : t))
            setPendingId(null)
        })
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">CRM Tasks</h1>
                    <p className="text-muted-foreground mt-1">Manage activities, follow-ups and meetings</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm">
                            <Plus className="h-4 w-4 mr-2" /> New Task
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Task</DialogTitle>
                            <DialogDescription>Add a new activity to your CRM schedule.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateTask} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Task Title</Label>
                                <Input 
                                    id="title" 
                                    placeholder="e.g. Follow up with John Doe" 
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required 
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="priority">Priority</Label>
                                    <Select 
                                        value={formData.priority} 
                                        onValueChange={(v) => setFormData({ ...formData, priority: v as TaskPriority })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="LOW">Low</SelectItem>
                                            <SelectItem value="MEDIUM">Medium</SelectItem>
                                            <SelectItem value="HIGH">High</SelectItem>
                                            <SelectItem value="URGENT">Urgent</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="due_date">Due Date</Label>
                                    <Input 
                                        id="due_date" 
                                        type="date" 
                                        value={formData.due_date}
                                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea 
                                    id="description" 
                                    placeholder="Add details about the task..." 
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isSaving}>
                                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create Task
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Status Grid */}
            <div className="grid gap-4 md:grid-cols-4">
                {(Object.entries(statusConfig) as [TaskStatus, typeof statusConfig[TaskStatus]][]).map(([key, cfg]) => {
                    const count = tasks.filter((t) => t.status === key).length
                    const Icon = cfg.icon
                    return (
                        <Card
                            key={key}
                            className={`cursor-pointer transition-colors hover:bg-accent/50 ${filterStatus === key ? "ring-2 ring-primary" : "border-border/50"}`}
                            onClick={() => handleStatusFilter(filterStatus === key ? "all" : key)}
                        >
                            <CardContent className="pt-4 pb-3">
                                <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{cfg.label}</p>
                                </div>
                                <p className="text-2xl font-bold mt-1">{count}</p>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Search & Bulk Actions Placeholder */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search tasks..." 
                        className="pl-8" 
                        value={searchQuery} 
                        onChange={(e) => handleSearch(e.target.value)} 
                    />
                </div>
            </div>

            {/* Task Table */}
            <Card>
                <CardHeader className="pb-3 px-6">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-semibold">Active Tasks</CardTitle>
                        <CardDescription>{total} items total</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-12 text-center pl-6">Status</TableHead>
                                <TableHead>Task Details</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead className="w-10 pr-6"></TableHead>
                            </TableRow>
                        </TableHeader>
                    <TableBody>
                        {initialTasks.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                                    <div className="flex flex-col items-center justify-center space-y-2">
                                        <CheckSquare className="h-10 w-10 text-muted-foreground/20" />
                                        <p>No tasks found. Create one to get started!</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : initialTasks.map((task) => {
                                const status = statusConfig[task.status]
                                const priority = priorityConfig[task.priority]
                                const StatusIcon = status.icon
                                
                                return (
                                    <TableRow key={task.id} className="group hover:bg-muted/30">
                                        <TableCell className="pl-6">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className={`h-8 w-8 rounded-full transition-colors ${task.status === "COMPLETED" ? "text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20" : "text-muted-foreground hover:text-emerald-500"}`}
                                                onClick={() => handleStatusUpdate(task.id, task.status === "COMPLETED" ? "TODO" : "COMPLETED")}
                                                disabled={pendingId === task.id}
                                            >
                                                {pendingId === task.id 
                                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                                    : task.status === "COMPLETED" ? <CheckCircle2 className="h-5 w-5" /> : <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 group-hover:border-emerald-500/50" />}
                                            </Button>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className={`font-medium ${task.status === "COMPLETED" ? "line-through text-muted-foreground" : ""}`}>
                                                    {task.title}
                                                </span>
                                                {task.description && (
                                                    <span className="text-xs text-muted-foreground line-clamp-1">{task.description}</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-tighter ${priority.color}`}>
                                                {priority.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <Calendar className="h-3 w-3" />
                                                {task.due_date ? new Date(task.due_date).toLocaleDateString() : "No Date"}
                                            </div>
                                        </TableCell>
                                        <TableCell className="pr-6">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleStatusUpdate(task.id, "IN_PROGRESS")}>
                                                        <Clock className="mr-2 h-4 w-4" /> Mark In Progress
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem>
                                                        <Pencil className="mr-2 h-4 w-4" /> Edit Details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-red-500" onClick={() => handleDelete(task.id)}>
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete Task
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                </Table>
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20">
                        <p className="text-sm text-muted-foreground">
                            Showing <span className="font-medium">{(currentPage - 1) * limit + 1}</span> to{" "}
                            <span className="font-medium">{Math.min(currentPage * limit, total)}</span> of{" "}
                            <span className="font-medium">{total}</span> tasks
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
                </CardContent>
            </Card>
        </div>
    )
}
