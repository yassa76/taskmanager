import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import NavBar from '@/components/NavBar'
import ReportsView from '@/components/ReportsView'

export default async function ReportsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div>
      <NavBar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <ReportsView />
      </main>
    </div>
  )
}
