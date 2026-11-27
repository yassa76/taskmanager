import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import NavBar from '@/components/NavBar'
import ChangelogView from '@/components/ChangelogView'

export default async function ChangelogPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div>
      <NavBar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
        <ChangelogView />
      </main>
    </div>
  )
}
