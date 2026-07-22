import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import NavBar from '@/components/NavBar'
import TasksView from '@/components/TasksView'

export default async function TasksPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div>
      <NavBar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <TasksView />
      </main>
    </div>
  )
}
