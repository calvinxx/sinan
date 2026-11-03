import { useEffect, useState, type KeyboardEvent } from 'react'
import type { Bookmark, Todo } from '@/lib/types'

type Draft = { kind: 'bookmark' | 'todo'; record?: Bookmark | Todo; values: unknown }
const drafts = new Map<string, Draft>()
export const getDraft = (owner: string) => drafts.get(owner)
export const clearDraft = (owner: string) => drafts.delete(owner)

export function useEditor<T>(
  owner: string,
  kind: Draft['kind'],
  record: Draft['record'],
  initial: T,
  close: () => void,
) {
  const [values, setValues] = useState<T>(() => {
    const draft = getDraft(owner)
    return draft?.kind === kind && draft.record?.id === record?.id ? (draft.values as T) : initial
  })
  const [discard, setDiscard] = useState(false)
  const dirty = JSON.stringify(values) !== JSON.stringify(initial)
  useEffect(() => {
    if (dirty) drafts.set(owner, { kind, record, values })
    else drafts.delete(owner)
  }, [owner, kind, record, values, dirty])
  useEffect(() => {
    if (!dirty) return
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [dirty])
  const done = () => {
    clearDraft(owner)
    close()
  }
  return {
    values,
    setValues,
    discard,
    setDiscard,
    done,
    requestClose: () => (dirty ? setDiscard(true) : done()),
  }
}
export function submitShortcut(event: KeyboardEvent<HTMLFormElement>) {
  if (event.nativeEvent.isComposing) {
    if (event.key === 'Enter') event.preventDefault()
    return
  }
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault()
    event.currentTarget.requestSubmit()
  }
}
