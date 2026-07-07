import { useEffect, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { type Profile } from '../lib/types'

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setSession, setProfile, setLoading } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    try {
      await supabase.rpc('allocate_badges', { user_id: userId })

      const { data } = await supabase
        .from('profiles')
        .select('*, badges(*), department:departments(*)')
        .eq('id', userId)
        .single()

      if (data) {
        setProfile(data as unknown as Profile)
      }
    } catch {
      // Profile fetch failed
    } finally {
      setLoading(false)
    }
  }

  return <>{children}</>
}
