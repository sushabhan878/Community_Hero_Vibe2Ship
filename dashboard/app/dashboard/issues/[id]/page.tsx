'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, MoreHorizontal, MapPin, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/issues/status-badge'
import { SeverityBadge } from '@/components/issues/severity-badge'
import { CategoryBadge } from '@/components/issues/category-badge'
import { IssueTimeline } from '@/components/issues/issue-timeline'
import { ImageGallery } from '@/components/issues/image-gallery'
import { StatusChangeDialog } from '@/components/issues/status-change-dialog'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'
import { formatRelativeTime, formatDateTime, shortUUID } from '@/lib/utils'
import type { Issue, IssueUpdate } from '@/types'

export default function IssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [issue, setIssue] = useState<Issue | null>(null)
  const [updates, setUpdates] = useState<IssueUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [statusOpen, setStatusOpen] = useState(false)
  const { toast } = useToast()

  const fetchIssue = async () => {
    const supabase = createClient()
    const { data } = await supabase.functions.invoke('issues/detail', { body: { issue_id: id } })
    if (data) {
      setIssue(data)
    }
    setLoading(false)
  }

  const fetchTimeline = async () => {
    const supabase = createClient()
    const { data } = await supabase.functions.invoke('issues/timeline', { body: { issue_id: id } })
    if (data) {
      setUpdates(data.timeline ?? [])
    }
  }

  useEffect(() => {
    fetchIssue()
    fetchTimeline()
  }, [id])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`issue-${id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'issue_updates',
        filter: `issue_id=eq.${id}`,
      }, () => { fetchTimeline() })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'issues',
        filter: `id=eq.${id}`,
      }, () => { fetchIssue() })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  const handleStatusChange = async (newStatus: string, noteText: string) => {
    const supabase = createClient()
    const { error } = await supabase.functions.invoke('issues/update-status', {
      body: { issue_id: id, status: newStatus, note: noteText },
    })
    if (error) throw error
    toast('Status updated successfully', 'success')
    fetchIssue()
    fetchTimeline()
  }

  const handleAddNote = async () => {
    if (!note.trim()) return
    const supabase = createClient()
    const { error } = await supabase.functions.invoke('issues/add-note', {
      body: { issue_id: id, note },
    })
    if (error) {
      toast('Failed to add note', 'error')
      return
    }
    setNote('')
    toast('Note added', 'success')
    fetchTimeline()
  }

  const copyId = () => {
    navigator.clipboard.writeText(id)
    toast('Issue ID copied', 'info')
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  if (!issue) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <span className="text-4xl">🔍</span>
        <h2 className="mt-4 text-xl font-semibold">Issue not found</h2>
        <p className="mt-1 text-sm text-zinc-500">It may have been deleted or you don't have access.</p>
        <Link href="/dashboard/issues" className="mt-4 text-sm font-medium text-blue-600 hover:underline">
          ← Back to Issues
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/issues" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
          <ArrowLeft className="inline h-4 w-4" /> Back to Issues
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">{issue.title}</h1>
            <button onClick={copyId} className="text-xs text-zinc-400 hover:text-zinc-600" title="Copy ID">
              <Copy className="h-3 w-3 inline" /> #{shortUUID(issue.id)}
            </button>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Reported by {issue.reporter?.name ?? 'Unknown'} · {formatRelativeTime(issue.created_at)}
            {issue.ward && ` · Ward: ${issue.ward}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setStatusOpen(true)}>Change Status</Button>
          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
        </div>
      </div>

      <StatusChangeDialog
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        currentStatus={issue.status}
        onConfirm={handleStatusChange}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Issue Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {issue.description && (
                <div>
                  <p className="text-sm font-medium text-zinc-500">Description</p>
                  <p className="mt-1 text-sm">{issue.description}</p>
                </div>
              )}

              {issue.ai_summary && (
                <div>
                  <p className="text-sm font-medium text-zinc-500">AI Summary</p>
                  <p className="mt-1 text-sm italic">🤖 {issue.ai_summary}</p>
                  {issue.ai_confidence && (
                    <p className="mt-0.5 text-xs text-zinc-400">Confidence: {(issue.ai_confidence * 100).toFixed(0)}%</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-zinc-500">Status</p>
                  <div className="mt-1"><StatusBadge status={issue.status} /></div>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-500">Severity</p>
                  <div className="mt-1"><SeverityBadge severity={issue.severity} /></div>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-500">Category</p>
                  <div className="mt-1"><CategoryBadge category={issue.category} /></div>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-500">Department</p>
                  <p className="mt-1 text-sm">{issue.assigned_department?.name ?? 'Not assigned'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-zinc-400" />
                <span className="text-zinc-500">
                  {issue.latitude.toFixed(5)}, {issue.longitude.toFixed(5)}
                </span>
                {issue.address && <span className="text-zinc-400">· {issue.address}</span>}
              </div>

              <div className="flex items-center gap-4 text-sm">
                <span>👍 {issue.verification_count} verifications</span>
                <span>📅 Created {formatDateTime(issue.created_at)}</span>
                {issue.resolved_at && <span>✅ Resolved {formatDateTime(issue.resolved_at)}</span>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Media</CardTitle>
            </CardHeader>
            <CardContent>
              <ImageGallery images={issue.image_urls} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add Note</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add an update note..."
                  maxLength={500}
                  className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddNote() }}
                />
                <Button onClick={handleAddNote} disabled={!note.trim()}>Post</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <IssueTimeline updates={updates} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
