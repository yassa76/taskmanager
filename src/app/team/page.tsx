import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import NavBar from '@/components/NavBar'
import TeamView from '@/components/TeamView'
import { can } from '@/lib/permissions'

export default async function TeamPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (!can(session, 'team', 'read')) redirect('/home')

  return (
    <div>
      <NavBar />
      <main className="w-full px-3 sm:px-4 py-4">
        <TeamView />
      </main>
    </div>
  )
}
