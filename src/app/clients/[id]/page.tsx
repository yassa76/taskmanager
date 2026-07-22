import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import NavBar from '@/components/NavBar'
import ClientDetailView from '@/components/ClientDetailView'

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div>
      <NavBar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <ClientDetailView clientId={params.id} />
      </main>
    </div>
  )
}
