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
      <main className="w-full px-3 sm:px-4 py-4">
        <SubtasksView />
      </main>
    </div>
  )
}
