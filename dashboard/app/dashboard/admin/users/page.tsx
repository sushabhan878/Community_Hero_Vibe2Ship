'use client'

import { useState, useEffect, useCallback } from 'react'
import { UserPlus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Dialog } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'
import { formatRelativeTime } from '@/lib/utils'
import type { Profile } from '@/types'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteDept, setInviteDept] = useState('')
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])
  const [inviting, setInviting] = useState(false)
  const { toast } = useToast()

  const fetchUsers = useCallback(async () => {
    const supabase = createClient()
    const query = supabase.from('profiles').select('*').order('created_at', { ascending: false })

    if (roleFilter !== 'all') query.eq('role', roleFilter)
    if (search) query.ilike('name', `%${search}%`)

    const { data } = await query
    if (data) setUsers(data)
    setLoading(false)
  }, [search, roleFilter])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  useEffect(() => {
    const supabase = createClient()
    supabase.from('departments').select('id, name').then(({ data }) => {
      if (data) setDepartments(data)
    })
  }, [])

  const handleInvite = async () => {
    if (!inviteEmail || !inviteName || !inviteDept) return
    setInviting(true)
    const supabase = createClient()

    const { error } = await supabase.functions.invoke('admin/create-dept-admin', {
      body: { email: inviteEmail, name: inviteName, department_id: inviteDept },
    })

    setInviting(false)
    if (error) {
      toast(error.message, 'error')
      return
    }
    toast('Invitation sent!', 'success')
    setInviteOpen(false)
    setInviteEmail('')
    setInviteName('')
    setInviteDept('')
    fetchUsers()
  }

  const toggleUserStatus = async (userId: string, currentActive: boolean) => {
    const supabase = createClient()
    await supabase.from('profiles').update({ is_active: !currentActive }).eq('id', userId)
    toast(`User ${currentActive ? 'disabled' : 'enabled'}`, 'success')
    fetchUsers()
  }

  const roleBadge = (role: string) => {
    const variants: Record<string, 'info' | 'success' | 'warning'> = {
      citizen: 'info',
      department_admin: 'success',
      super_admin: 'warning',
    }
    return <Badge variant={variants[role] ?? 'default'}>{role.replace('_', ' ')}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-zinc-500">{users.length} users</p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4" />
          Invite Admin
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-zinc-300 bg-white pl-9 pr-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <Select
          options={[
            { label: 'All Roles', value: 'all' },
            { label: 'Citizen', value: 'citizen' },
            { label: 'Dept Admin', value: 'department_admin' },
            { label: 'Super Admin', value: 'super_admin' },
          ]}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-36"
        />
      </div>

      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite Department Admin">
        <div className="space-y-4">
          <Input label="Email *" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="admin@city.gov" />
          <Input label="Full Name *" value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Suresh Kumar" />
          <Select
            label="Department *"
            options={departments.map((d) => ({ label: d.name, value: d.id }))}
            value={inviteDept}
            onChange={(e) => setInviteDept(e.target.value)}
            placeholder="Select department"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={handleInvite} loading={inviting} disabled={!inviteEmail || !inviteName || !inviteDept}>
              Send Invite
            </Button>
          </div>
        </div>
      </Dialog>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">User</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Role</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Department</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Score</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Joined</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.name} size="sm" />
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-xs text-zinc-400">{user.email ?? '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{roleBadge(user.role)}</td>
                    <td className="px-4 py-3 text-zinc-500">{user.department_id ? departments.find((d) => d.id === user.department_id)?.name ?? '—' : '—'}</td>
                    <td className="px-4 py-3">{user.hero_score}</td>
                    <td className="px-4 py-3">
                      <Badge variant={user.is_active ? 'success' : 'danger'}>
                        {user.is_active ? 'Active' : 'Disabled'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{formatRelativeTime(user.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleUserStatus(user.id, user.is_active)}
                      >
                        {user.is_active ? 'Disable' : 'Enable'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
