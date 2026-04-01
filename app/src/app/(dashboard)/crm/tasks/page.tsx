import { getTasks } from "@/app/actions/crm/tasks"
import TasksClient from "./TasksClient"

export const dynamic = "force-dynamic"

export default async function TasksPage() {
    const tasks = await getTasks()
    return <TasksClient initialTasks={tasks} />
}
