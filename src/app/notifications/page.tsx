import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import NavBar from '@/components/NavBar'
import NotificationsView from '@/components/NotificationsView'

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div>
      <NavBar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <NotificationsView />
      </main>
    </div>
  )
}
