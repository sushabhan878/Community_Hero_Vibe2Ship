'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, User } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'

interface UserMenuProps {
  name?: string
  role?: string
  avatarUrl?: string
}

export function UserMenu({ name: initialName, role: initialRole, avatarUrl }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const [profile, setProfile] = useState({ name: initialName, role: initialRole })
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!initialName) {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.user_metadata?.name) {
          setProfile({ name: user.user_metadata.name as string, role: undefined })
        }
      })
    }
  }, [initialName])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <Avatar name={profile.name ?? 'User'} src={avatarUrl} size="sm" />
        <div className="hidden text-left md:block">
          <p className="text-sm font-medium">{profile.name ?? 'User'}</p>
          {profile.role && (
            <p className="text-xs text-zinc-500 capitalize">{profile.role.replace('_', ' ')}</p>
          )}
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
            <p className="text-sm font-medium">{profile.name ?? 'User'}</p>
            {profile.role && (
              <p className="text-xs text-zinc-500 capitalize">{profile.role.replace('_', ' ')}</p>
            )}
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}
