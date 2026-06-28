'use client'

import { useState } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { VALID_TRANSITIONS } from '@/lib/constants'
import { statusLabel } from '@/lib/utils'
import type { IssueStatus } from '@/types'

interface StatusChangeDialogProps {
  open: boolean
  onClose: () => void
  currentStatus: IssueStatus
  onConfirm: (newStatus: IssueStatus, note: string) => Promise<void>
}

export function StatusChangeDialog({ open, onClose, currentStatus, onConfirm }: StatusChangeDialogProps) {
  const transitions = VALID_TRANSITIONS[currentStatus] ?? []
  const [selected, setSelected] = useState<string>('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (!selected) return
    setLoading(true)
    try {
      await onConfirm(selected as IssueStatus, note)
      onClose()
    } catch {
      // error handled by parent
    } finally {
      setLoading(false)
    }
  }

  if (transitions.length === 0) {
    return (
      <Dialog open={open} onClose={onClose} title="No Transitions Available">
        <p className="text-sm text-zinc-500">
          This issue is in <strong>{statusLabel(currentStatus)}</strong> status and cannot be transitioned.
        </p>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onClose={onClose} title="Change Status" description={`Current: ${statusLabel(currentStatus)}`}>
      <div className="space-y-4">
        <Select
          label="New Status"
          options={transitions.map((s) => ({ label: statusLabel(s), value: s }))}
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          placeholder="Select new status"
        />
        <Input
          label="Note (optional)"
          placeholder="Add a note about this change..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
        />
        <p className="text-xs text-zinc-400">{note.length}/500</p>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleConfirm} loading={loading} disabled={!selected}>
          Confirm
        </Button>
      </div>
    </Dialog>
  )
}
