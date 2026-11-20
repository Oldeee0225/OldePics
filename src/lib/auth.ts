import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { invalidateQueries } from './useQuery'

/** Sesión actual de Supabase Auth. `undefined` mientras se comprueba. */
export function useSession() {
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      // al entrar o salir cambia lo que se puede ver (borradores, álbumes con contraseña)
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') invalidateQueries()
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return session
}

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error('Supabase is not configured yet (.env.local).')
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signOut() {
  await supabase?.auth.signOut()
}
