"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter 
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Calendar, Loader2, CheckCircle2, Clock } from "lucide-react"
import { createTask, type Task, type TaskStatus, type TaskPriority } from "@/app/actions/crm/tasks"

interface Props {
  entityId: string
  entityType: "contact" | "lead" | "deal"
  initialTasks: Task[]
}

export default function EntityTasks({ entityId, entityType, initialTasks }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
      title: "",
      description: "",
      status: "TODO" as TaskStatus,
      priority: "MEDIUM" as TaskPriority,
      due_date: "",
      [`${entityType}_id`]: entityId
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    const { error, data } = await createTask(formData as any)
    if (!error && data) {
      setTasks([data, ...tasks])
      setIsDialogOpen(false)
      setFormData({ 
        ...formData, 
        title: "", 
        due_date: "", 
        description: "",
        status: "TODO",
        priority: "MEDIUM"
      })
    }
    setIsSaving(false)
  }

  return (
      <div className="space-y-4">
          <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Activities & Tasks</h3>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                          <Plus className="h-4 w-4 mr-2" /> Add Task
                      </Button>
                  </DialogTrigger>
                  <DialogContent>
                      <DialogHeader>
                          <DialogTitle>Add Activity for {entityType}</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreate} className="space-y-4 pt-4">
                          <div className="space-y-2">
                              <Label htmlFor="title">Task Summary</Label>
                              <Input 
                                  id="title" 
                                  placeholder="e.g., Call to discuss proposal"
                                  value={formData.title} 
                                  onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                                  required 
                              />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                  <Label>Priority</Label>
                                  <Select 
                                      value={formData.priority} 
                                      onValueChange={(v) => setFormData({ ...formData, priority: v as TaskPriority })}
                                  >
                                      <SelectTrigger><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                          <SelectItem value="LOW">Low</SelectItem>
                                          <SelectItem value="MEDIUM">Medium</SelectItem>
                                          <SelectItem value="HIGH">High</SelectItem>
                                          <SelectItem value="URGENT">Urgent</SelectItem>
                                      </SelectContent>
                                  </Select>
                              </div>
                              <div className="space-y-2">
                                  <Label>Due Date</Label>
                                  <Input 
                                      type="date" 
                                      value={formData.due_date} 
                                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} 
                                  />
                              </div>
                          </div>
                          <DialogFooter>
                              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                              <Button type="submit" disabled={isSaving}>
                                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                  Add Task
                              </Button>
                          </DialogFooter>
                      </form>
                  </DialogContent>
              </Dialog>
          </div>

          <div className="space-y-3">
              {tasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 bg-muted/20 rounded-xl border-2 border-dashed border-muted/50">
                      <Clock className="h-8 w-8 text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground">No activities recorded yet.</p>
                  </div>
              ) : (
                  tasks.map((task) => (
                      <Card key={task.id} className="bg-card/50 hover:bg-card transition-colors shadow-none border-border/50">
                          <CardContent className="p-4 flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 min-w-0">
                                  <div className={`h-2 w-2 rounded-full flex-shrink-0 ${task.status === "COMPLETED" ? "bg-emerald-500" : "bg-blue-500"}`} />
                                  <div className="truncate">
                                      <p className={`text-sm font-medium truncate ${task.status === "COMPLETED" ? "line-through text-muted-foreground" : ""}`}>
                                          {task.title}
                                      </p>
                                      <div className="flex items-center gap-2 mt-1">
                                          <Calendar className="h-3 w-3 text-muted-foreground" />
                                          <span className="text-xs text-muted-foreground truncate">
                                              {task.due_date ? new Date(task.due_date).toLocaleDateString() : "No Date"}
                                          </span>
                                      </div>
                                  </div>
                              </div>
                              <Badge variant="secondary" className="text-[10px] h-5 uppercase px-1.5 flex-shrink-0">
                                  {task.status}
                              </Badge>
                          </CardContent>
                      </Card>
                  ))
              )}
          </div>
      </div>
  )
}
