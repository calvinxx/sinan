import { useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Ellipsis,
  FolderCog,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SiteIcon } from '@/components/brand'
import { ConfirmDialog, EmptyList, ListSkeleton, LoadError } from '@/components/feedback'
import { deleteRecord, moveRecord, saveBookmark } from '@/lib/repository'
import { domainOf, errorMessage } from '@/lib/validation'
import type { Bookmark, BookmarkGroup } from '@/lib/types'

type Props = {
  bookmarks: Bookmark[]
  groups: BookmarkGroup[]
  loading: boolean
  error: boolean
  groupsError: boolean
  onRefresh: () => Promise<unknown>
  onEdit: (b?: Bookmark) => void
  onGroups: () => void
  disabled: boolean
}
export function BookmarkSection({
  bookmarks,
  groups,
  loading,
  error,
  groupsError,
  onRefresh,
  onEdit,
  onGroups,
  disabled,
}: Props) {
  const [selection, setSelection] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [removing, setRemoving] = useState<Bookmark | null>(null)
  const selected = groups.some((g) => g.id === selection) ? selection : (groups[0]?.id ?? '')
  const pinned = bookmarks
    .filter((b) => b.is_pinned)
    .sort((a, b) => (a.pinned_order ?? 0) - (b.pinned_order ?? 0))
  const visible = bookmarks
    .filter((b) => b.group_id === selected)
    .sort((a, b) => a.sort_order - b.sort_order)
  async function action(fn: () => Promise<unknown>) {
    setBusy(true)
    try {
      await fn()
      await onRefresh()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  function menu(b: Bookmark, list: Bookmark[], index: number, isPinned: boolean) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="bookmark-menu"
            variant="ghost"
            size="icon-sm"
            aria-label={`${b.title}的更多操作`}
            disabled={disabled || busy}
          >
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => onEdit(b)}>
              <Pencil />
              编辑书签
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => void action(() => saveBookmark({ ...b, is_pinned: !b.is_pinned }, b))}
            >
              {b.is_pinned ? <PinOff /> : <Pin />}
              {b.is_pinned ? '移出常用' : '设为常用'}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={index === 0}
              onSelect={() =>
                void action(() => moveRecord('bookmarks', b, list[index - 1], isPinned))
              }
            >
              <ArrowUp />
              上移
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={index === list.length - 1}
              onSelect={() =>
                void action(() => moveRecord('bookmarks', b, list[index + 1], isPinned))
              }
            >
              <ArrowDown />
              下移
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem variant="destructive" onSelect={() => setRemoving(b)}>
              <Trash2 />
              删除书签
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
  return (
    <section className="bookmark-section" aria-labelledby="bookmarks-heading">
      <div className="section-heading">
        <h2 id="bookmarks-heading">
          书签{' '}
          {!loading && !error ? <span className="section-count">{bookmarks.length}</span> : null}
        </h2>
        <div className="section-actions">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="管理分组"
            disabled={disabled || groupsError}
            onClick={onGroups}
          >
            <FolderCog />
          </Button>
          <Button variant="ghost" size="sm" disabled={disabled} onClick={() => onEdit()}>
            <Plus data-icon="inline-start" />
            添加书签
          </Button>
        </div>
      </div>
      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <LoadError title="书签加载失败" retry={() => void onRefresh()} />
      ) : (
        <>
          {pinned.length ? (
            <div className="pinned-grid" role="list" aria-label="常用书签">
              {pinned.slice(0, expanded ? undefined : 8).map((b, i) => (
                <div className="pinned-item" key={b.id} role="listitem">
                  <a href={b.url} target="_blank" rel="noopener noreferrer">
                    <SiteIcon key={b.url} url={b.url} title={b.title} />
                    <span>{b.title}</span>
                    <ArrowUpRight className="pinned-arrow" aria-hidden="true" />
                  </a>
                  {menu(b, pinned, i, true)}
                </div>
              ))}
            </div>
          ) : null}
          {pinned.length > 8 ? (
            <Button variant="link" size="sm" onClick={() => setExpanded(!expanded)}>
              {expanded ? '收起' : `展开全部（${pinned.length}）`}
            </Button>
          ) : null}
          {groupsError ? (
            <LoadError title="分组加载失败" retry={() => void onRefresh()} />
          ) : !groups.length ? (
            <EmptyList
              title="暂无分组"
              action="创建分组"
              onAction={disabled ? undefined : onGroups}
            />
          ) : (
            <Tabs value={selected} onValueChange={setSelection} className="bookmark-tabs">
              <div className="group-tabs-scroll">
                <TabsList variant="line" aria-label="书签分组">
                  {groups.map((g) => (
                    <TabsTrigger key={g.id} value={g.id}>
                      {g.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              <TabsContent value={selected} tabIndex={-1}>
                {visible.length ? (
                  <div className="bookmark-grid">
                    {visible.map((b, i) => (
                      <div className="bookmark-row" key={b.id}>
                        <a href={b.url} target="_blank" rel="noopener noreferrer">
                          <SiteIcon key={b.url} url={b.url} title={b.title} />
                          <span className="bookmark-text">
                            <span className="bookmark-name">{b.title}</span>
                            {b.title.toLocaleLowerCase() !== domainOf(b.url).toLocaleLowerCase() ? (
                              <span className="bookmark-domain">{domainOf(b.url)}</span>
                            ) : null}
                          </span>
                          {b.is_pinned ? (
                            <Pin className="inline-pin" aria-label="常用书签" />
                          ) : null}
                        </a>
                        {menu(b, visible, i, false)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyList title="该分组暂无书签" />
                )}
              </TabsContent>
            </Tabs>
          )}
        </>
      )}
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => {
          if (!open) setRemoving(null)
        }}
        title="删除这个书签？"
        description={`「${removing?.title}」将从你的书签中移除。`}
        onConfirm={async () => {
          if (removing) {
            await deleteRecord('bookmarks', removing)
            await onRefresh()
            toast.success('书签已删除')
          }
        }}
      />
    </section>
  )
}
