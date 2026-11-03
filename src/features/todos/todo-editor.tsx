import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { submitShortcut, useEditor } from '@/hooks/use-editor'
import { deleteRecord, saveTodo } from '@/lib/repository'
import { errorMessage, todoSchema } from '@/lib/validation'
import { parseDeadline, toLocalInput } from '@/lib/dates'
import type { Todo, TodoStatus } from '@/lib/types'

export function TodoEditor({
  record,
  owner,
  onClose,
  onSaved,
  initialTitle = '',
}: {
  record?: Todo
  owner: string
  onClose: () => void
  onSaved: () => Promise<unknown>
  initialTitle?: string
}) {
  const initial = {
    title: record?.title ?? initialTitle,
    details: record?.details ?? '',
    status: record?.status ?? ('todo' as TodoStatus),
    deadline: record?.due_at ? toLocalInput(record.due_at) : '',
  }
  const editor = useEditor(owner, 'todo', record, initial, onClose)
  const { values, setValues } = editor
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [invalid, setInvalid] = useState('')
  const [deleting, setDeleting] = useState(false)
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (pending) return
    setError('')
    setInvalid('')
    let due_at: string | null
    try {
      due_at = parseDeadline(values.deadline)
    } catch (e) {
      setError(errorMessage(e))
      setInvalid('deadline')
      return
    }
    const parsed = todoSchema.safeParse({ ...values, due_at })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      setInvalid(String(parsed.error.issues[0].path[0]))
      return
    }
    setPending(true)
    try {
      await saveTodo(parsed.data, record)
      await onSaved()
      toast.success(record ? '待办已更新' : '待办已添加')
      editor.done()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setPending(false)
    }
  }
  return (
    <>
      <Sheet
        open
        onOpenChange={(open) => {
          if (!open && !pending) editor.requestClose()
        }}
      >
        <SheetContent
          className="todo-sheet"
          aria-describedby={undefined}
          onInteractOutside={(e) => {
            if (pending) e.preventDefault()
          }}
        >
          <SheetHeader>
            <SheetTitle>{record ? '编辑待办' : '新建待办'}</SheetTitle>
          </SheetHeader>
          <form className="editor-form sheet-form" onSubmit={submit} onKeyDown={submitShortcut}>
            <FieldGroup>
              <Field data-invalid={invalid === 'title'}>
                <FieldLabel htmlFor="todo-title">标题</FieldLabel>
                <Input
                  id="todo-title"
                  autoFocus
                  maxLength={200}
                  value={values.title}
                  aria-invalid={invalid === 'title'}
                  onChange={(e) => setValues({ ...values, title: e.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="todo-status">状态</FieldLabel>
                <Select
                  value={values.status}
                  onValueChange={(value) => setValues({ ...values, status: value as TodoStatus })}
                >
                  <SelectTrigger id="todo-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="todo">待处理</SelectItem>
                      <SelectItem value="doing">进行中</SelectItem>
                      <SelectItem value="done">已完成</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field data-invalid={invalid === 'deadline'}>
                <FieldLabel htmlFor="todo-date">
                  截止时间 <span className="optional-label">北京时间 · 可选</span>
                </FieldLabel>
                <div className="deadline-inputs">
                  <Input
                    id="todo-date"
                    type="date"
                    value={values.deadline.slice(0, 10)}
                    aria-invalid={invalid === 'deadline'}
                    onChange={(e) =>
                      setValues({
                        ...values,
                        deadline: e.target.value
                          ? `${e.target.value}T${values.deadline.slice(11) || '18:00'}`
                          : '',
                      })
                    }
                  />
                  <Input
                    aria-label="截止时刻"
                    type="time"
                    disabled={!values.deadline}
                    value={values.deadline.slice(11)}
                    onChange={(e) =>
                      setValues({
                        ...values,
                        deadline: `${values.deadline.slice(0, 10)}T${e.target.value}`,
                      })
                    }
                  />
                </div>
                {values.deadline ? (
                  <div className="field-meta">
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={() => setValues({ ...values, deadline: '' })}
                    >
                      清除
                    </Button>
                  </div>
                ) : null}
              </Field>
              <Field data-invalid={invalid === 'details'}>
                <FieldLabel htmlFor="todo-details">
                  详情 <span className="optional-label">可选</span>
                </FieldLabel>
                <Textarea
                  id="todo-details"
                  rows={7}
                  maxLength={10000}
                  value={values.details}
                  aria-invalid={invalid === 'details'}
                  onChange={(e) => setValues({ ...values, details: e.target.value })}
                />
              </Field>
            </FieldGroup>
            {error ? <FieldError>{error}</FieldError> : null}
            <div className="editor-actions">
              {record ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="删除这条待办"
                  disabled={pending}
                  onClick={() => setDeleting(true)}
                >
                  <Trash2 />
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={pending}
                  onClick={editor.requestClose}
                >
                  取消
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? '保存中…' : '保存'}
                </Button>
              </div>
            </div>
          </form>
        </SheetContent>
      </Sheet>
      <ConfirmDialog
        open={editor.discard}
        onOpenChange={editor.setDiscard}
        title="放弃这次修改？"
        description="尚未保存的内容会被丢弃。"
        label="放弃修改"
        onConfirm={editor.done}
      />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="删除这条待办？"
        description={`「${record?.title}」将被永久删除。`}
        onConfirm={async () => {
          if (record) {
            await deleteRecord('todos', record)
            await onSaved()
            toast.success('待办已删除')
            editor.done()
          }
        }}
      />
    </>
  )
}
