import { getTasks, type TaskStatus } from "@/app/actions/crm/tasks"
import TasksClient from "./TasksClient"

export const dynamic = "force-dynamic"

export default async function TasksPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ page?: string, search?: string, status?: string }> 
}) {
    const sp = await searchParams
    const page = parseInt(sp.page || "1")
    const { data, total } = await getTasks(page, 10, {
        status: sp.status === "all" ? undefined : sp.status as TaskStatus,
        search: sp.search
    })
    return <TasksClient initialTasks={data} total={total} />
}
