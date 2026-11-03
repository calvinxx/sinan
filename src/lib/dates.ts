import type { DeadlineFilter, Todo } from './types'

export const TIME_ZONE = 'Asia/Shanghai'
const partsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})
export function toLocalInput(date: string | Date): string {
  const parts = Object.fromEntries(
    partsFormatter.formatToParts(new Date(date)).map((p) => [p.type, p.value]),
  )
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}
export function dateKey(date: string | Date): string {
  return toLocalInput(date).slice(0, 10)
}
export function parseDeadline(input: string): string | null {
  if (!input) return null
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input)) throw new Error('请填写完整的日期与时间')
  const date = new Date(`${input}:00+08:00`)
  if (!Number.isFinite(date.getTime()) || toLocalInput(date) !== input)
    throw new Error('截止时间无效')
  return date.toISOString()
}
export function offsetDate(now: Date, days: number, time = '18:00'): string {
  const date = new Date(`${dateKey(now)}T12:00:00+08:00`)
  date.setTime(date.getTime() + days * 86_400_000)
  return parseDeadline(`${dateKey(date)}T${time}`)!
}
export function isOverdue(todo: Todo, now: Date): boolean {
  return todo.status !== 'done' && !!todo.due_at && new Date(todo.due_at).getTime() < now.getTime()
}
export function matchesDeadline(todo: Todo, filter: DeadlineFilter, now: Date): boolean {
  if (filter === 'all') return true
  if (filter === 'none') return !todo.due_at
  if (!todo.due_at) return false
  const day = dateKey(todo.due_at)
  if (filter === 'today') return day === dateKey(now) || isOverdue(todo, now)
  return day >= dateKey(now) && day <= dateKey(offsetDate(now, 6))
}
export const bucketLabels = {
  overdue: '逾期',
  today: '今天',
  later: '之后',
  undated: '没有截止时间',
  done: '已完成',
}
export type TodoBucket = keyof typeof bucketLabels
export function groupTodos(todos: Todo[], completed: boolean, filter: DeadlineFilter, now: Date) {
  const groups: Record<TodoBucket, Todo[]> = {
    overdue: [],
    today: [],
    later: [],
    undated: [],
    done: [],
  }
  for (const todo of todos) {
    if ((todo.status === 'done') !== completed || !matchesDeadline(todo, filter, now)) continue
    const bucket = completed
      ? 'done'
      : !todo.due_at
        ? 'undated'
        : isOverdue(todo, now)
          ? 'overdue'
          : dateKey(todo.due_at) === dateKey(now)
            ? 'today'
            : 'later'
    groups[bucket].push(todo)
  }
  for (const [bucket, items] of Object.entries(groups))
    items.sort((a, b) => {
      if (bucket === 'done') return (b.completed_at ?? '').localeCompare(a.completed_at ?? '')
      if (bucket === 'undated') return b.created_at.localeCompare(a.created_at)
      return (
        (a.due_at ?? '').localeCompare(b.due_at ?? '') || a.created_at.localeCompare(b.created_at)
      )
    })
  return Object.entries(groups).filter(([, items]) => items.length) as [TodoBucket, Todo[]][]
}
export function deadlineLabel(todo: Todo, now: Date): string {
  if (!todo.due_at) return ''
  const input = toLocalInput(todo.due_at)
  if (dateKey(todo.due_at) === dateKey(now)) return input.slice(11)
  if (dateKey(todo.due_at) === dateKey(offsetDate(now, 1))) return '明天'
  if (dateKey(todo.due_at) === dateKey(offsetDate(now, -1))) return '昨天'
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: TIME_ZONE,
    month: 'numeric',
    day: 'numeric',
  }).format(new Date(todo.due_at))
}
export function fullDeadline(value: string): string {
  return `${toLocalInput(value).replace('T', ' ')} 北京时间`
}
