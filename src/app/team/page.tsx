import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import NavBar from '@/components/NavBar'
import TeamView from '@/components/TeamView'

export default async function TeamPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div>
      <NavBar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <TeamView />
      </main>
    </div>
  )
}
