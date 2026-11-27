import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import NavBar from '@/components/NavBar'
import HomeView from '@/components/HomeView'

export default async function HomePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div>
      <NavBar />
      <main className="w-full px-3 sm:px-4 py-4">
        <HomeView userName={session.user?.name || session.user?.email || ''} />
      </main>
    </div>
  )
}
