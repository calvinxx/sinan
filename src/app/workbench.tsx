import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  BookmarkPlus,
  ChevronDown,
  CirclePlus,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  WifiOff,
} from 'lucide-react'
import { Brand } from '@/components/brand'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { BookmarkSection } from '@/features/bookmarks/bookmark-section'
import { BookmarkEditor } from '@/features/bookmarks/bookmark-editor'
import { GroupManager } from '@/features/bookmarks/group-manager'
import { TodoSection } from '@/features/todos/todo-section'
import { TodoEditor } from '@/features/todos/todo-editor'
import { GlobalSearch } from '@/features/search/global-search'
import { useNow, useOnline, useWorkbench } from '@/hooks/use-workbench'
import { clearDraft, getDraft } from '@/hooks/use-editor'
import { demoMode } from '@/lib/supabase'
import { TIME_ZONE } from '@/lib/dates'
import type { Bookmark, Todo } from '@/lib/types'
import { cn } from '@/lib/utils'

type Editor =
  | { kind: 'bookmark'; record?: Bookmark; title?: string }
  | { kind: 'todo'; record?: Todo; title?: string }
  | { kind: 'groups' }
  | null
export default function Workbench({
  ownerId,
  onSignOut,
}: {
  ownerId: string
  onSignOut: () => void
}) {
  const data = useWorkbench(ownerId)
  const now = useNow()
  const online = useOnline()
  const [editor, setEditor] = useState<Editor>(() => {
    const draft = getDraft(ownerId)
    return draft ? ({ kind: draft.kind, record: draft.record } as Editor) : null
  })
  const [searching, setSearching] = useState(false)
  const [mobileTab, setMobileTab] = useState(() => {
    try {
      return localStorage.getItem('sinan.module') === 'todos' ? 'todos' : 'bookmarks'
    } catch {
      return 'bookmarks'
    }
  })
  const moduleScroll = useRef<Record<string, number>>({ bookmarks: 0, todos: 0 })
  useLayoutEffect(() => {
    if (window.matchMedia('(max-width: 1023px)').matches)
      window.scrollTo({ top: moduleScroll.current[mobileTab], behavior: 'instant' })
  }, [mobileTab])
  function changeModule(value: string) {
    moduleScroll.current[mobileTab] = window.scrollY
    setMobileTab(value)
    try {
      localStorage.setItem('sinan.module', value)
    } catch {
      /* 偏好不可存储时仍可操作 */
    }
  }
  const bookmarks = data.bookmarks.data ?? []
  const groups = [...(data.groups.data ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  const todos = data.todos.data ?? []
  const closeEditor = () => {
    clearDraft(ownerId)
    setEditor(null)
  }
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.isComposing || editor) return
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearching((value) => !value)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editor])
  const openTodo = (record?: Todo) => {
    setSearching(false)
    setEditor({ kind: 'todo', record })
  }
  const openBookmark = (record?: Bookmark) => {
    setSearching(false)
    setEditor({ kind: 'bookmark', record })
  }
  const busy = data.bookmarks.isFetching || data.todos.isFetching || data.groups.isFetching
  return (
    <div className="app-shell">
      <a className="skip-link" href="#workspace">
        跳到工作台内容
      </a>
      <header className="topbar">
        <Brand />
        <button
          className="search-trigger"
          onClick={() => setSearching(true)}
          aria-label="搜索书签或待办"
        >
          <Search />
          <span>搜索书签或待办</span>
        </button>
        <div className="header-actions">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={!online}>
                <Plus data-icon="inline-start" />
                新建
                <ChevronDown data-icon="inline-end" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => openBookmark()}>
                  <BookmarkPlus />
                  添加书签
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => openTodo()}>
                  <CirclePlus />
                  新建待办
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="设置">
                <Settings2 />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => void data.refresh()} disabled={busy || !online}>
                  <RefreshCw />
                  刷新数据
                </DropdownMenuItem>
              </DropdownMenuGroup>
              {!demoMode ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onSelect={onSignOut}>
                      <LogOut />
                      退出登录
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <div className="day-line">
        <time dateTime={now.toISOString()}>
          {new Intl.DateTimeFormat('zh-CN', {
            timeZone: TIME_ZONE,
            month: 'long',
            day: 'numeric',
            weekday: 'long',
          }).format(now)}
        </time>
        {demoMode ? (
          <span>演示模式 · 刷新后重置</span>
        ) : busy && online ? (
          <span role="status">同步中…</span>
        ) : null}
      </div>
      {!online ? (
        <Alert className="offline-alert">
          <WifiOff />
          <AlertDescription>离线，暂时无法保存修改。</AlertDescription>
        </Alert>
      ) : null}
      <div className="mobile-switch">
        <div className="module-toggle" role="group" aria-label="工作台模块">
          <button
            aria-pressed={mobileTab === 'bookmarks'}
            aria-controls="bookmark-module"
            onClick={() => changeModule('bookmarks')}
          >
            书签
          </button>
          <button
            aria-pressed={mobileTab === 'todos'}
            aria-controls="todo-module"
            onClick={() => changeModule('todos')}
          >
            待办 <span>{todos.filter((t) => t.status !== 'done').length}</span>
          </button>
        </div>
      </div>
      <main id="workspace" className="workspace-grid" tabIndex={-1}>
        <div
          id="bookmark-module"
          className={cn('bookmark-column', { 'mobile-hidden': mobileTab !== 'bookmarks' })}
        >
          <BookmarkSection
            bookmarks={bookmarks}
            groups={groups}
            loading={data.bookmarks.isPending}
            error={data.bookmarks.isError}
            groupsError={data.groups.isError}
            onRefresh={data.refresh}
            onEdit={openBookmark}
            onGroups={() => setEditor({ kind: 'groups' })}
            disabled={!online}
          />
        </div>
        <div
          id="todo-module"
          className={cn('todo-column', { 'mobile-hidden': mobileTab !== 'todos' })}
        >
          <TodoSection
            todos={todos}
            now={now}
            loading={data.todos.isPending}
            error={data.todos.isError}
            onRefresh={() => void data.refresh()}
            onEdit={openTodo}
            onToggle={(todo) =>
              data.toggle.mutate({ todo, status: todo.status === 'done' ? 'todo' : 'done' })
            }
            disabled={!online || data.toggle.isPending}
          />
        </div>
      </main>
      <GlobalSearch
        open={searching}
        onOpenChange={setSearching}
        bookmarks={bookmarks}
        groups={groups}
        todos={todos}
        onTodo={openTodo}
        onCreate={(kind, title) => {
          setSearching(false)
          setEditor({ kind, title })
        }}
        loading={data.bookmarks.isPending || data.todos.isPending}
        incomplete={data.bookmarks.isError || data.todos.isError || data.groups.isError}
      />
      {editor?.kind === 'bookmark' ? (
        <BookmarkEditor
          owner={ownerId}
          record={editor.record}
          initialTitle={editor.title}
          groups={groups}
          bookmarks={bookmarks}
          onClose={closeEditor}
          onSaved={data.refresh}
        />
      ) : null}
      {editor?.kind === 'todo' ? (
        <TodoEditor
          owner={ownerId}
          record={editor.record}
          initialTitle={editor.title}
          onClose={closeEditor}
          onSaved={data.refresh}
        />
      ) : null}
      {editor?.kind === 'groups' ? (
        <GroupManager
          groups={groups}
          bookmarks={bookmarks}
          onClose={closeEditor}
          onSaved={data.refresh}
        />
      ) : null}
    </div>
  )
}
