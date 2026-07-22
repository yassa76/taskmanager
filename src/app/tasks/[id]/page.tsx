import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import NavBar from '@/components/NavBar'
import TaskDetailView from '@/components/TaskDetailView'

export default async function TaskDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div>
      <NavBar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <TaskDetailView taskId={params.id} />
      </main>
    </div>
  )
}
