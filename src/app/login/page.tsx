import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import SignInButton from '@/components/SignInButton'

export default async function LoginPage({
  searchParams
}: {
  searchParams: { error?: string }
}) {
  const session = await getServerSession(authOptions)
  if (session) redirect('/home')

  const isInactive = searchParams?.error === 'account_inactive'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-brand-50 to-white">
      <div className="bg-white shadow-xl rounded-2xl p-10 w-full max-w-sm text-center border border-slate-100">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Task Manager</h1>
        {isInactive ? (
          <p className="text-red-600 mb-8 text-sm bg-red-50 border border-red-100 rounded-lg p-3">
            Siamo spiacenti, ma il tuo account è stato disattivato e non sei abilitato ad accedere
            alla piattaforma. Contatta un amministratore del team se pensi sia un errore.
          </p>
        ) : (
          <p className="text-slate-500 mb-8 text-sm">
            Accedi con il tuo account Google per registrarti e accedere ai task del team.
          </p>
        )}
        <SignInButton />
      </div>
    </div>
  )
}
