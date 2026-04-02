import { getTasks, type TaskStatus } from "@/app/actions/crm/tasks"
import TasksClient from "./TasksClient"

export const dynamic = "force-dynamic"

export default async function TasksPage({ 
  searchParams 
}: { 
  searchParams: { page?: string, search?: string, status?: string } 
}) {
    const page = parseInt(searchParams.page || "1")
    const { data, total } = await getTasks(page, 10, {
        status: searchParams.status === "all" ? undefined : searchParams.status as TaskStatus,
        search: searchParams.search
    })
    return <TasksClient initialTasks={data} total={total} />
}
