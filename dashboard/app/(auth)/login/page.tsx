'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertCircle } from 'lucide-react'

const ADMIN_EMAIL = 'community.admin@vibe2ship.com'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (email.toLowerCase() !== ADMIN_EMAIL) {
      setError('Access denied. Only the authorized admin can log in.')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (authError) {
      if (authError.message.includes('Invalid login')) {
        setError('Invalid email or password.')
      } else {
        setError('Invalid email or password.')
      }
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-white text-2xl font-bold text-zinc-900">
            CH
          </div>
          <h1 className="text-2xl font-bold text-white">Community Hero AI</h1>
          <p className="mt-1 text-sm text-zinc-400">Admin Dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6 backdrop-blur-sm">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <Input
              id="email"
              type="email"
              label="Email"
              placeholder="community.admin@vibe2ship.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              id="password"
              type="password"
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="mt-6 w-full" loading={loading}>
            Sign In
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-500">
          Only the authorized administrator can access this dashboard.
        </p>
      </div>
    </div>
  )
}
