import { useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel, FieldError } from '@/components/ui/field'
import { ConfirmDialog } from '@/components/feedback'
import { deleteRecord, moveRecord, saveGroup } from '@/lib/repository'
import { errorMessage, groupNameSchema } from '@/lib/validation'
import type { Bookmark, BookmarkGroup } from '@/lib/types'

export function GroupManager({
  groups,
  bookmarks,
  onClose,
  onSaved,
}: {
  groups: BookmarkGroup[]
  bookmarks: Bookmark[]
  onClose: () => void
  onSaved: () => Promise<unknown>
}) {
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<BookmarkGroup | undefined>()
  const [deleting, setDeleting] = useState<BookmarkGroup | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [discard, setDiscard] = useState(false)
  function requestClose() {
    if (name !== (editing?.name ?? '')) setDiscard(true)
    else onClose()
  }
  async function run(action: () => Promise<unknown>) {
    setPending(true)
    setError('')
    try {
      await action()
      await onSaved()
    } catch (e) {
      setError(errorMessage(e))
      throw e
    } finally {
      setPending(false)
    }
  }
  function submit(e: FormEvent) {
    e.preventDefault()
    const parsed = groupNameSchema.safeParse(name)
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }
    void run(() => saveGroup(parsed.data, editing))
      .then(() => {
        setName('')
        setEditing(undefined)
        toast.success('分组已保存')
      })
      .catch(() => {})
  }
  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open && !pending) requestClose()
        }}
      >
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>管理分组</DialogTitle>
          </DialogHeader>
          <div className="group-manager-list">
            {groups.map((g, i) => (
              <div className="group-manager-row" key={g.id}>
                <span>
                  {g.name}
                  <small>{bookmarks.filter((b) => b.group_id === g.id).length} 个书签</small>
                </span>
                <div className="flex gap-1">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`上移${g.name}`}
                    disabled={pending || i === 0}
                    onClick={() =>
                      void run(() => moveRecord('bookmark_groups', g, groups[i - 1])).catch(
                        () => {},
                      )
                    }
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`下移${g.name}`}
                    disabled={pending || i === groups.length - 1}
                    onClick={() =>
                      void run(() => moveRecord('bookmark_groups', g, groups[i + 1])).catch(
                        () => {},
                      )
                    }
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`重命名${g.name}`}
                    disabled={pending}
                    onClick={() => {
                      setEditing(g)
                      setName(g.name)
                    }}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`删除分组${g.name}`}
                    disabled={pending}
                    onClick={() => setDeleting(g)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={submit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="group-name">
                  {editing ? `重命名「${editing.name}」` : '新建分组'}
                </FieldLabel>
                <div className="flex gap-2">
                  <Input
                    id="group-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={30}
                  />
                  <Button type="submit" disabled={pending || !name.trim()}>
                    <Plus data-icon="inline-start" />
                    {editing ? '保存' : '添加'}
                  </Button>
                </div>
              </Field>
            </FieldGroup>
            {editing ? (
              <Button
                type="button"
                size="sm"
                variant="link"
                onClick={() => {
                  setEditing(undefined)
                  setName('')
                }}
              >
                取消重命名
              </Button>
            ) : null}
          </form>
          {error ? <FieldError>{error}</FieldError> : null}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={discard}
        onOpenChange={setDiscard}
        title="放弃这次修改？"
        description="尚未保存的分组名称会被丢弃。"
        label="放弃修改"
        onConfirm={onClose}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title="删除这个分组？"
        description={`其中的 ${bookmarks.filter((b) => b.group_id === deleting?.id).length} 个书签会移到「未分组」，书签内容会保留。`}
        onConfirm={async () => {
          if (deleting) {
            await deleteRecord('bookmark_groups', deleting)
            await onSaved()
            if (editing?.id === deleting.id) {
              setEditing(undefined)
              setName('')
            }
            toast.success('分组已删除，书签已保留')
          }
        }}
      />
    </>
  )
}
