import { useState } from 'react'
import { ArrowUpRight, CircleCheck, Circle, Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import { SiteIcon } from '@/components/brand'
import { domainOf } from '@/lib/validation'
import type { Bookmark, BookmarkGroup, Todo } from '@/lib/types'

export function GlobalSearch({
  open,
  onOpenChange,
  bookmarks,
  groups,
  todos,
  onTodo,
  onCreate,
  loading,
  incomplete,
}: {
  open: boolean
  onOpenChange: (value: boolean) => void
  bookmarks: Bookmark[]
  groups: BookmarkGroup[]
  todos: Todo[]
  onTodo: (todo: Todo) => void
  onCreate: (kind: 'todo' | 'bookmark', title: string) => void
  loading: boolean
  incomplete: boolean
}) {
  const [query, setQuery] = useState('')
  const needle = query.trim().toLocaleLowerCase()
  const sites = bookmarks.filter((b) =>
    [b.title, b.url, groups.find((g) => g.id === b.group_id)?.name ?? '']
      .join(' ')
      .toLocaleLowerCase()
      .includes(needle),
  )
  const tasks = todos.filter((t) => `${t.title} ${t.details}`.toLocaleLowerCase().includes(needle))
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="search-dialog" showCloseButton={false} aria-describedby={undefined}>
        <DialogHeader className="sr-only">
          <DialogTitle>搜索</DialogTitle>
        </DialogHeader>
        <Command
          shouldFilter={false}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing && e.key === 'Enter') {
              e.preventDefault()
              e.stopPropagation()
            }
          }}
        >
          <CommandInput
            autoFocus
            placeholder="搜索书签或待办"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="search-results">
            {loading ? (
              <p className="search-message" role="status">
                加载中…
              </p>
            ) : null}
            {incomplete ? (
              <p className="search-message" role="status">
                部分数据加载失败，结果可能不完整。
              </p>
            ) : null}
            {!loading && !sites.length && !tasks.length ? (
              <div className="search-message">
                <p>暂无结果</p>
                <div className="flex justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => onCreate('bookmark', query)}>
                    <Plus data-icon="inline-start" />
                    添加书签
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onCreate('todo', query)}>
                    <Plus data-icon="inline-start" />
                    创建待办
                  </Button>
                </div>
              </div>
            ) : null}
            {sites.length ? (
              <CommandGroup heading={`书签 · ${sites.length}`}>
                {sites.map((b) => (
                  <CommandItem
                    key={b.id}
                    value={b.id}
                    onSelect={() => {
                      window.open(b.url, '_blank', 'noopener,noreferrer')
                      onOpenChange(false)
                    }}
                  >
                    <SiteIcon key={b.url} url={b.url} title={b.title} />
                    <span className="search-item-label">
                      {b.title}
                      <small>{domainOf(b.url)}</small>
                    </span>
                    <ArrowUpRight />
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
            {sites.length && tasks.length ? <CommandSeparator /> : null}
            {tasks.length ? (
              <CommandGroup heading={`待办 · ${tasks.length}`}>
                {tasks.map((t) => (
                  <CommandItem key={t.id} value={t.id} onSelect={() => onTodo(t)}>
                    {t.status === 'done' ? <CircleCheck /> : <Circle />}
                    <span className="search-item-label">
                      {t.title}
                      <small>
                        {t.status === 'done'
                          ? '已完成'
                          : t.status === 'doing'
                            ? '进行中'
                            : '待处理'}
                      </small>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
