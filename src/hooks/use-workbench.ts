import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { loadResource, saveTodo } from '@/lib/repository'
import { errorMessage } from '@/lib/validation'
import type { Todo } from '@/lib/types'

export function useWorkbench(ownerId: string) {
  const client = useQueryClient()
  const key = ['workbench', ownerId]
  const bookmarks = useQuery({
    queryKey: [...key, 'bookmarks'],
    queryFn: () => loadResource('bookmarks'),
  })
  const groups = useQuery({
    queryKey: [...key, 'bookmark_groups'],
    queryFn: () => loadResource('bookmark_groups'),
  })
  const todos = useQuery({ queryKey: [...key, 'todos'], queryFn: () => loadResource('todos') })
  const refresh = () => client.invalidateQueries({ queryKey: key })
  const toggle = useMutation({
    mutationFn: ({ todo, status }: { todo: Todo; status: Todo['status'] }) =>
      saveTodo({ ...todo, status }, todo),
    onMutate: async ({ todo, status }) => {
      const queryKey = [...key, 'todos']
      await client.cancelQueries({ queryKey })
      const previous = client.getQueryData<Todo[]>(queryKey)
      client.setQueryData<Todo[]>(
        queryKey,
        previous?.map((t) =>
          t.id === todo.id
            ? { ...t, status, completed_at: status === 'done' ? new Date().toISOString() : null }
            : t,
        ),
      )
      return { previous }
    },
    onError: (error, _, context) => {
      client.setQueryData([...key, 'todos'], context?.previous)
      toast.error(errorMessage(error))
    },
    onSuccess: (saved, { todo }) => {
      toast.success(saved.status === 'done' ? '已完成' : '已恢复待办', {
        duration: 5000,
        action: {
          label: '撤销',
          onClick: () => {
            void saveTodo({ ...saved, status: todo.status }, saved)
              .then(refresh)
              .catch((e) => toast.error(errorMessage(e)))
          },
        },
      })
    },
    onSettled: () => client.invalidateQueries({ queryKey: [...key, 'todos'] }),
  })
  return { bookmarks, groups, todos, refresh, toggle }
}
export function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const update = () => setNow(new Date())
    const timer = setInterval(update, 30_000)
    document.addEventListener('visibilitychange', update)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', update)
    }
  }, [])
  return now
}
export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  return online
}
