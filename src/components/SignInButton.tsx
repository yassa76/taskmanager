'use client'

import { signIn } from 'next-auth/react'

export default function SignInButton() {
  return (
    <button
      onClick={() => signIn('google', { callbackUrl: '/tasks' })}
      className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 rounded-lg py-3 px-4 font-medium text-slate-700 hover:bg-slate-50 transition shadow-sm"
    >
      <svg width="20" height="20" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 7 29.6 5 24 5c-7.7 0-14.3 4.4-17.7 10.7z" />
        <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.1-5.1l-6.5-5.5c-2 1.4-4.6 2.2-7.6 2.2-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.6 39.5 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.5l6.5 5.5C40.9 36.5 44 30.8 44 24c0-1.3-.1-2.3-.4-3.5z" />
      </svg>
      Accedi con Google
    </button>
  )
}
