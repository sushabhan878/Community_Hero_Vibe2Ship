'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'
import type { Department } from '@/types'

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<(Department & { adminCount?: number; issueCount?: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const fetchDepartments = useCallback(async () => {
    const supabase = createClient()

    const { data: depts } = await supabase.from('departments').select('*')
    if (!depts) { setLoading(false); return }

    const deptsWithCounts = await Promise.all(
      depts.map(async (dept) => {
        const { count: adminCount } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('department_id', dept.id)
          .eq('role', 'department_admin')

        const { count: issueCount } = await supabase
          .from('issues')
          .select('id', { count: 'exact', head: true })
          .eq('assigned_department_id', dept.id)

        return { ...dept, adminCount: adminCount ?? 0, issueCount: issueCount ?? 0 }
      }),
    )

    setDepartments(deptsWithCounts)
    setLoading(false)
  }, [])

  useEffect(() => { fetchDepartments() }, [fetchDepartments])

  const openEdit = (dept: Department) => {
    setEditing(dept)
    setFormName(dept.name)
    setFormEmail(dept.contact_email ?? '')
    setFormPhone(dept.contact_phone ?? '')
    setEditOpen(true)
  }

  const openCreate = () => {
    setEditing(null)
    setFormName('')
    setFormEmail('')
    setFormPhone('')
    setEditOpen(true)
  }

  const handleSave = async () => {
    if (!formName.trim()) return
    setSaving(true)
    const supabase = createClient()

    if (editing) {
      await supabase.from('departments').update({
        name: formName,
        contact_email: formEmail || null,
        contact_phone: formPhone || null,
      }).eq('id', editing.id)
      toast('Department updated', 'success')
    }

    setSaving(false)
    setEditOpen(false)
    fetchDepartments()
  }

  const iconMap: Record<string, string> = {
    roads: '🏗️', water: '💧', electricity: '⚡', waste: '🗑️', parks: '🌳', other: '📌',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Departments</h1>
          <p className="text-sm text-zinc-500">{departments.length} departments</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Department
        </Button>
      </div>

      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={editing ? 'Edit Department' : 'Add Department'}
      >
        <div className="space-y-4">
          <Input label="Name *" value={formName} onChange={(e) => setFormName(e.target.value)} />
          <Input label="Contact Email" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
          <Input label="Contact Phone" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving} disabled={!formName.trim()}>
              {editing ? 'Save Changes' : 'Create'}
            </Button>
          </div>
        </div>
      </Dialog>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => (
            <Card key={dept.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{iconMap[dept.slug] ?? '📌'}</span>
                    <div>
                      <p className="font-medium">{dept.name}</p>
                      <p className="text-xs text-zinc-400">/{dept.slug}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => openEdit(dept)}
                    className="rounded-md p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-4 flex items-center gap-4 text-sm text-zinc-500">
                  <span>{dept.adminCount} admins</span>
                  <span>{dept.issueCount} issues</span>
                </div>
                {dept.contact_email && (
                  <p className="mt-1 text-xs text-zinc-400">{dept.contact_email}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
