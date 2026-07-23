import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import NavBar from '@/components/NavBar'
import ProfileView from '@/components/ProfileView'

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div>
      <NavBar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <ProfileView />
      </main>
    </div>
  )
}
