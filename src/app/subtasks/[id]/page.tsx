import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import NavBar from '@/components/NavBar'
import SubtaskDetailView from '@/components/SubtaskDetailView'

export default async function SubtaskDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div>
      <NavBar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <SubtaskDetailView subtaskId={params.id} />
      </main>
    </div>
  )
}
