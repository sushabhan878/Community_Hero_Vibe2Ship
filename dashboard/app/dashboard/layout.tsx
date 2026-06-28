'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { ToastProvider } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types'

const ADMIN_EMAIL = 'community.admin@vibe2ship.com'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [role, setRole] = useState<UserRole>('super_admin')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL) {
        await supabase.auth.signOut()
        router.push('/login')
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (!profile || profile.role === 'citizen') {
        router.push('/unauthorized')
        return
      }
      setRole(profile.role)
      setLoading(false)
    })
  }, [router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900" />
      </div>
    )
  }

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <Sidebar role={role} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex flex-1 flex-col">
          <Topbar onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </ToastProvider>
  )
}
