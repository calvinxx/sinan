import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldLabel, FieldGroup, FieldError } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/feedback'
import { useEditor, submitShortcut } from '@/hooks/use-editor'
import { saveBookmark } from '@/lib/repository'
import { bookmarkSchema, domainOf, errorMessage, normalizeUrl } from '@/lib/validation'
import type { Bookmark, BookmarkGroup, BookmarkInput } from '@/lib/types'
import { GroupManager } from './group-manager'

export function BookmarkEditor({
  record,
  groups,
  bookmarks,
  owner,
  onClose,
  onSaved,
  initialTitle = '',
}: {
  record?: Bookmark
  groups: BookmarkGroup[]
  bookmarks: Bookmark[]
  owner: string
  initialTitle?: string
  onClose: () => void
  onSaved: () => Promise<unknown>
}) {
  const initial: BookmarkInput = record
    ? {
        title: record.title,
        url: record.url,
        group_id: record.group_id ?? '',
        is_pinned: record.is_pinned,
      }
    : { title: initialTitle, url: '', group_id: '', is_pinned: false }
  const editor = useEditor(owner, 'bookmark', record, initial, onClose)
  const { values, setValues } = editor
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [invalid, setInvalid] = useState<string>('')
  const [duplicate, setDuplicate] = useState<BookmarkInput | null>(null)
  const [managingGroups, setManagingGroups] = useState(false)
  async function persist(input: BookmarkInput) {
    setPending(true)
    setError('')
    try {
      await saveBookmark(input, record)
      await onSaved()
      toast.success(record ? '书签已更新' : '书签已添加')
      editor.done()
    } catch (e) {
      setError(errorMessage(e))
      throw e
    } finally {
      setPending(false)
    }
  }
  function submit(e: FormEvent) {
    e.preventDefault()
    if (pending) return
    const parsed = bookmarkSchema.safeParse(values)
    if (!parsed.success) {
      setInvalid(String(parsed.error.issues[0].path[0]))
      setError(parsed.error.issues[0].message)
      return
    }
    if (!groups.some((g) => g.id === parsed.data.group_id)) {
      setInvalid('group_id')
      setError('分组不存在，请重新选择')
      return
    }
    setInvalid('')
    setError('')
    if (bookmarks.some((b) => b.id !== record?.id && normalizeUrl(b.url) === parsed.data.url)) {
      setDuplicate(parsed.data)
      return
    }
    void persist(parsed.data).catch(() => {})
  }
  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open && !pending) editor.requestClose()
        }}
      >
        <DialogContent
          aria-describedby={undefined}
          onInteractOutside={(e) => {
            if (pending) e.preventDefault()
          }}
        >
          <DialogHeader>
            <DialogTitle>{record ? '编辑书签' : '添加书签'}</DialogTitle>
          </DialogHeader>
          <form noValidate onSubmit={submit} onKeyDown={submitShortcut} className="editor-form">
            <FieldGroup>
              <Field data-invalid={invalid === 'url'}>
                <FieldLabel htmlFor="bookmark-url">网址</FieldLabel>
                <Input
                  id="bookmark-url"
                  autoFocus
                  inputMode="url"
                  placeholder="https://github.com"
                  value={values.url}
                  aria-invalid={invalid === 'url'}
                  onChange={(e) => setValues({ ...values, url: e.target.value })}
                  onBlur={() => {
                    try {
                      const url = normalizeUrl(values.url)
                      setValues((v) => ({ ...v, url, title: v.title || domainOf(url) }))
                    } catch {
                      /* 提交时显示错误 */
                    }
                  }}
                />
              </Field>
              <Field data-invalid={invalid === 'title'}>
                <FieldLabel htmlFor="bookmark-title">名称</FieldLabel>
                <Input
                  id="bookmark-title"
                  maxLength={200}
                  value={values.title}
                  aria-invalid={invalid === 'title'}
                  onChange={(e) => setValues({ ...values, title: e.target.value })}
                />
              </Field>
              <Field data-invalid={invalid === 'group_id'}>
                <FieldLabel htmlFor="bookmark-group">分组</FieldLabel>
                <Select
                  required
                  disabled={!groups.length}
                  value={groups.some((g) => g.id === values.group_id) ? values.group_id : ''}
                  onValueChange={(v) => setValues({ ...values, group_id: v })}
                >
                  <SelectTrigger
                    id="bookmark-group"
                    className="w-full"
                    aria-invalid={invalid === 'group_id'}
                    aria-describedby={invalid === 'group_id' ? 'bookmark-error' : undefined}
                  >
                    <SelectValue placeholder="请选择分组" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {!groups.length ? (
                  <Button type="button" variant="outline" onClick={() => setManagingGroups(true)}>
                    创建分组
                  </Button>
                ) : null}
              </Field>
              <Field orientation="horizontal">
                <Checkbox
                  id="bookmark-pinned"
                  checked={values.is_pinned}
                  onCheckedChange={(v) => setValues({ ...values, is_pinned: v === true })}
                />
                <FieldLabel htmlFor="bookmark-pinned">放入常用书签</FieldLabel>
              </Field>
            </FieldGroup>
            {error ? <FieldError id="bookmark-error">{error}</FieldError> : null}
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={editor.requestClose}
                disabled={pending}
              >
                取消
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? '保存中…' : '保存'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {managingGroups ? (
        <GroupManager
          groups={groups}
          bookmarks={bookmarks}
          onClose={() => setManagingGroups(false)}
          onSaved={onSaved}
        />
      ) : null}
      <ConfirmDialog
        open={editor.discard}
        onOpenChange={editor.setDiscard}
        title="放弃这次修改？"
        description="尚未保存的内容会被丢弃。"
        label="放弃修改"
        onConfirm={editor.done}
      />
      <ConfirmDialog
        open={!!duplicate}
        onOpenChange={(open) => {
          if (!open) setDuplicate(null)
        }}
        title="这个网址已经收藏过了"
        description="继续保存会新增一条重复书签。"
        label="仍然保存"
        destructive={false}
        onConfirm={() => (duplicate ? persist(duplicate) : undefined)}
      />
    </>
  )
}
