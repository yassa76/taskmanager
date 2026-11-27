import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import NavBar from '@/components/NavBar'
import SettingsView from '@/components/SettingsView'
import { can } from '@/lib/permissions'

const ADMIN_SECTIONS = ['profiles', 'orgroles', 'countries', 'geocode', 'activitylog', 'accesslog'] as const

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (!ADMIN_SECTIONS.some((o) => can(session, o, 'read'))) redirect('/home')

  return (
    <div>
      <NavBar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <SettingsView />
      </main>
    </div>
  )
}
