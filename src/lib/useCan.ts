'use client'

import { useSession } from 'next-auth/react'
import { scopeIn, type ActionKey, type ObjectKey } from './permissionsShared'

// True se il profilo della persona consente quell'azione su quell'entita' (la verifica vera resta sul server).
export function useCan(obj: ObjectKey, action: ActionKey): boolean {
  const { data: session } = useSession()
  return scopeIn((session?.user as any)?.permissions, obj, action) !== 'none'
}
