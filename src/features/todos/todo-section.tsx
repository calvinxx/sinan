import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Circle, CircleCheck, CircleDot, ListFilter, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyList, ListSkeleton, LoadError } from '@/components/feedback'
import {
  bucketLabels,
  deadlineLabel,
  fullDeadline,
  groupTodos,
  isOverdue,
  matchesDeadline,
} from '@/lib/dates'
import type { DeadlineFilter, Todo } from '@/lib/types'
import { cn } from '@/lib/utils'

const filters: Record<DeadlineFilter, string> = {
  all: '全部时间',
  today: '今天与逾期',
  week: '未来七天',
  none: '无截止时间',
}
export function TodoSection({
  todos,
  now,
  loading,
  error,
  onRefresh,
  onEdit,
  onToggle,
  disabled,
}: {
  todos: Todo[]
  now: Date
  loading: boolean
  error: boolean
  onRefresh: () => void
  onEdit: (t?: Todo) => void
  onToggle: (t: Todo) => void
  disabled: boolean
}) {
  const [tab, setTab] = useState('pending')
  const [filter, setFilter] = useState<DeadlineFilter>('all')
  const reduced = useReducedMotion()
  const groups = groupTodos(todos, tab === 'done', filter, now)
  const pendingCount = todos.filter(
    (t) => t.status !== 'done' && matchesDeadline(t, filter, now),
  ).length
  const completedCount = todos.filter(
    (t) => t.status === 'done' && matchesDeadline(t, filter, now),
  ).length
  return (
    <section className="todo-section" aria-labelledby="todos-heading">
      <div className="section-heading">
        <h2 id="todos-heading">待办</h2>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="新建待办"
          disabled={disabled}
          onClick={() => onEdit()}
        >
          <Plus />
        </Button>
      </div>
      <Tabs value={tab} onValueChange={setTab} className="todo-tabs">
        <div className="todo-toolbar">
          <TabsList variant="line" aria-label="待办状态">
            <TabsTrigger value="pending">
              待处理 <span className="tab-count">{pendingCount}</span>
            </TabsTrigger>
            <TabsTrigger value="done">
              已完成 <span className="tab-count">{completedCount}</span>
            </TabsTrigger>
          </TabsList>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`筛选截止时间：${filters[filter]}`}
              >
                <ListFilter />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup
                value={filter}
                onValueChange={(value) => setFilter(value as DeadlineFilter)}
              >
                {Object.entries(filters).map(([value, label]) => (
                  <DropdownMenuRadioItem key={value} value={value}>
                    {label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {filter !== 'all' ? (
          <div className="active-filter">
            <span>{filters[filter]}</span>
            <Button variant="link" size="sm" onClick={() => setFilter('all')}>
              清除筛选
            </Button>
          </div>
        ) : null}
        <TabsContent value={tab} tabIndex={-1}>
          {loading ? (
            <ListSkeleton />
          ) : error ? (
            <LoadError title="待办加载失败" retry={onRefresh} />
          ) : !groups.length ? (
            <EmptyList
              title={
                filter !== 'all'
                  ? '暂无符合筛选条件的待办'
                  : tab === 'done'
                    ? '暂无已完成待办'
                    : '暂无待办'
              }
            />
          ) : (
            <div className="todo-groups">
              {groups.map(([bucket, items]) => (
                <div className="todo-group" key={bucket}>
                  {bucket !== 'done' ? <h3>{bucketLabels[bucket]}</h3> : null}
                  <ul>
                    <AnimatePresence initial={false}>
                      {items.map((todo) => (
                        <motion.li
                          key={todo.id}
                          layout={reduced ? false : 'position'}
                          initial={false}
                          exit={reduced ? undefined : { opacity: 0, height: 0 }}
                          transition={{ duration: reduced ? 0 : 0.18 }}
                          className={cn('todo-row', { 'is-complete': todo.status === 'done' })}
                        >
                          <button
                            className={cn('todo-check', { 'is-doing': todo.status === 'doing' })}
                            aria-label={`${todo.status === 'done' ? '重新打开' : '完成'}：${todo.title}`}
                            disabled={disabled}
                            onClick={() => onToggle(todo)}
                          >
                            {todo.status === 'done' ? (
                              <CircleCheck />
                            ) : todo.status === 'doing' ? (
                              <CircleDot />
                            ) : (
                              <Circle />
                            )}
                          </button>
                          <button className="todo-title-button" onClick={() => onEdit(todo)}>
                            <span>{todo.title}</span>
                            {todo.status === 'doing' ? <small>进行中</small> : null}
                          </button>
                          {todo.due_at ? (
                            <button
                              className={cn('todo-date', { overdue: isOverdue(todo, now) })}
                              aria-label={`${isOverdue(todo, now) ? '已逾期，' : ''}截止 ${fullDeadline(todo.due_at)}`}
                              onClick={() => onEdit(todo)}
                            >
                              {isOverdue(todo, now) ? (
                                <span className="overdue-dot" aria-hidden="true" />
                              ) : null}
                              {deadlineLabel(todo, now)}
                            </button>
                          ) : null}
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      {groups.length > 0 && !loading && !error ? (
        <Button
          variant="ghost"
          className="quick-add-todo"
          onClick={() => onEdit()}
          disabled={disabled}
        >
          <Plus data-icon="inline-start" />
          新建待办
        </Button>
      ) : null}
    </section>
  )
}
