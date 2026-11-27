import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import NavBar from '@/components/NavBar'
import SubtasksView from '@/components/SubtasksView'

export default async function SubtasksPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div>
      <NavBar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <SubtasksView />
      </main>
    </div>
  )
}
