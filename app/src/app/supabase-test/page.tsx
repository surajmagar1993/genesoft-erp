import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = await createClient()

  const { data: todos, error } = await supabase.from('todos').select()

  if (error) {
    return <div>Error loading todos: {error.message}</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Supabase Test: Todos</h1>
      <ul className="list-disc pl-5">
        {todos?.length === 0 && <li>No todos found. Ready to use!</li>}
        {todos?.map((todo: any) => (
          <li key={todo.id}>{todo.name}</li>
        ))}
      </ul>
    </div>
  )
}
