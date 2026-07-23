import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import SignInButton from '@/components/SignInButton'

export default async function LoginPage() {
  const session = await getServerSession(authOptions)
  if (session) redirect('/home')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-brand-50 to-white">
      <div className="bg-white shadow-xl rounded-2xl p-10 w-full max-w-sm text-center border border-slate-100">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Task Manager</h1>
        <p className="text-slate-500 mb-8 text-sm">
          Accedi con il tuo account Google aziendale per registrarti e accedere ai task del team.
        </p>
        <SignInButton />
      </div>
    </div>
  )
}
