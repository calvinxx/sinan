import { describe, expect, it } from 'vitest'
import {
  dateKey,
  groupTodos,
  matchesDeadline,
  offsetDate,
  parseDeadline,
  toLocalInput,
} from './dates'
import type { Todo } from './types'

const now = new Date('2026-11-04T10:00:00.000Z')
const task = (due_at: string | null, status: Todo['status'] = 'todo'): Todo => ({
  id: '1',
  owner_id: 'owner',
  title: '测试',
  details: '',
  status,
  due_at,
  completed_at: status === 'done' ? now.toISOString() : null,
  created_at: now.toISOString(),
  updated_at: now.toISOString(),
})
describe('北京时间截止日期', () => {
  it('在 UTC 跨日之前正确进入北京时间的下一天', () => {
    expect(dateKey('2026-11-04T16:00:00Z')).toBe('2026-11-05')
    expect(toLocalInput('2026-11-04T10:00:00Z')).toBe('2026-11-04T18:00')
  })
  it('编辑器输入和 UTC 时间往返保持一致', () => {
    expect(parseDeadline('2026-11-04T18:00')).toBe('2026-11-04T10:00:00.000Z')
    expect(parseDeadline('')).toBeNull()
    expect(() => parseDeadline('2026-02-30T18:00')).toThrow()
    expect(() => parseDeadline('2026-11-04')).toThrow()
  })
  it('今天视图保留逾期任务，但不把已完成历史任务算成逾期', () => {
    expect(matchesDeadline(task(offsetDate(now, -1)), 'today', now)).toBe(true)
    expect(matchesDeadline(task(offsetDate(now, -1), 'done'), 'today', now)).toBe(false)
  })
  it('未来七天包含今天以及第六天，排除第七天', () => {
    expect(matchesDeadline(task(offsetDate(now, 6)), 'week', now)).toBe(true)
    expect(matchesDeadline(task(offsetDate(now, 7)), 'week', now)).toBe(false)
  })
  it('空截止时间不进入日期筛选，任务只进入一个分组', () => {
    expect(matchesDeadline(task(null), 'today', now)).toBe(false)
    const groups = groupTodos(
      [
        task(offsetDate(now, -1)),
        { ...task(null), id: '2' },
        { ...task(offsetDate(now, 1), 'done'), id: '3' },
      ],
      false,
      'all',
      now,
    )
    expect(groups.map(([key]) => key)).toEqual(['overdue', 'undated'])
    expect(groups.flatMap(([, tasks]) => tasks)).toHaveLength(2)
  })
})
