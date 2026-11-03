export type Entity = { id: string; owner_id: string; created_at: string; updated_at: string }
export type BookmarkGroup = Entity & { name: string; sort_order: number }
export type Bookmark = Entity & {
  title: string
  url: string
  group_id: string | null
  is_pinned: boolean
  sort_order: number
  pinned_order: number | null
}
export type TodoStatus = 'todo' | 'doing' | 'done'
export type Todo = Entity & {
  title: string
  details: string
  status: TodoStatus
  due_at: string | null
  completed_at: string | null
}
export type BookmarkInput = Pick<Bookmark, 'title' | 'url' | 'group_id' | 'is_pinned'>
export type TodoInput = Pick<Todo, 'title' | 'details' | 'status' | 'due_at'>
export type DeadlineFilter = 'all' | 'today' | 'week' | 'none'
export type Resource = 'bookmarks' | 'todos' | 'bookmark_groups'
export type ResourceMap = { bookmarks: Bookmark; todos: Todo; bookmark_groups: BookmarkGroup }
export type DataSet = { [K in Resource]: ResourceMap[K][] }
