import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import NavBar from '@/components/NavBar'
import SettingsView from '@/components/SettingsView'
import { canManage } from '@/lib/permissions'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (!canManage(session, 'settings') && !canManage(session, 'profiles')) redirect('/home')

  return (
    <div>
      <NavBar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <SettingsView />
      </main>
    </div>
  )
}
