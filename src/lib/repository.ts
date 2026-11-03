import { createDemoData } from './demo'
import { demoMode, supabase } from './supabase'
import type { Bookmark, BookmarkInput, Resource, ResourceMap, Todo, TodoInput } from './types'

const data = createDemoData()
const conflict = '这条记录已在其他页面更新或删除。请先重新加载，当前输入仍会保留。'
function client() {
  if (!supabase) throw new Error('Supabase 尚未配置')
  return supabase
}
function online() {
  if (!navigator.onLine) throw new Error('当前处于离线状态，请联网后重试')
}
function check(error: { message: string; code?: string } | null) {
  if (error)
    throw new Error(error.code === '23505' ? '该名称已经存在，请换一个名称' : error.message)
}
async function owner() {
  const {
    data: { user },
    error,
  } = await client().auth.getUser()
  check(error)
  if (!user) throw new Error('登录已失效，请重新登录')
  return user.id
}
function nextTimestamp(previous?: string) {
  return new Date(
    Math.max(Date.now(), previous ? new Date(previous).getTime() + 1 : 0),
  ).toISOString()
}
export async function loadResource<K extends Resource>(resource: K): Promise<ResourceMap[K][]> {
  if (demoMode) return structuredClone(data[resource]) as ResourceMap[K][]
  const all: ResourceMap[K][] = []
  // Supabase 默认分页上限不等于全量数据，搜索必须覆盖所有已保存记录。
  for (let start = 0; ; start += 500) {
    const { data: rows, error } = await client()
      .from(resource)
      .select('*')
      .order('id')
      .range(start, start + 499)
    check(error)
    all.push(...(rows as ResourceMap[K][]))
    if (rows!.length < 500) return all
  }
}
async function save<K extends Resource>(
  resource: K,
  values: Partial<ResourceMap[K]>,
  previous?: ResourceMap[K],
): Promise<ResourceMap[K]> {
  online()
  if (demoMode) {
    const records = data[resource] as ResourceMap[K][]
    const index = previous ? records.findIndex((r) => r.id === previous.id) : -1
    if (previous && (index < 0 || records[index].updated_at !== previous.updated_at))
      throw new Error(conflict)
    const updated_at = nextTimestamp(previous?.updated_at)
    const record = {
      ...(previous ?? { id: crypto.randomUUID(), owner_id: 'demo', created_at: updated_at }),
      ...values,
      updated_at,
    } as ResourceMap[K]
    if (index < 0) records.push(record)
    else records[index] = record
    return structuredClone(record)
  }
  const query = previous
    ? client()
        .from(resource)
        .update(values as Record<string, unknown>)
        .eq('id', previous.id)
        .eq('updated_at', previous.updated_at)
    : client()
        .from(resource)
        .insert({ ...values, owner_id: await owner() })
  const { data: record, error } = await query.select().maybeSingle()
  check(error)
  if (!record) throw new Error(conflict)
  return record as ResourceMap[K]
}
export async function saveBookmark(input: BookmarkInput, previous?: Bookmark): Promise<Bookmark> {
  return save(
    'bookmarks',
    {
      ...input,
      sort_order: previous?.sort_order ?? Date.now(),
      pinned_order: input.is_pinned ? (previous?.pinned_order ?? Date.now()) : null,
    },
    previous,
  )
}
export async function saveTodo(input: TodoInput, previous?: Todo): Promise<Todo> {
  return save(
    'todos',
    {
      ...input,
      completed_at:
        input.status === 'done' ? (previous?.completed_at ?? new Date().toISOString()) : null,
    },
    previous,
  )
}
export async function saveGroup(name: string, previous?: ResourceMap['bookmark_groups']) {
  if (demoMode && data.bookmark_groups.some((g) => g.name === name && g.id !== previous?.id))
    throw new Error('该分组名称已经存在')
  return save('bookmark_groups', { name, sort_order: previous?.sort_order ?? Date.now() }, previous)
}
export async function deleteRecord<K extends Resource>(resource: K, record: ResourceMap[K]) {
  online()
  if (demoMode) {
    const records = data[resource] as ResourceMap[K][]
    const index = records.findIndex((r) => r.id === record.id && r.updated_at === record.updated_at)
    if (index < 0) throw new Error(conflict)
    records.splice(index, 1)
    if (resource === 'bookmark_groups')
      data.bookmarks = data.bookmarks.map((b) =>
        b.group_id === record.id
          ? { ...b, group_id: null, updated_at: nextTimestamp(b.updated_at) }
          : b,
      )
    return
  }
  if (resource === 'bookmark_groups') {
    const { error } = await client().rpc('delete_bookmark_group', {
      target_id: record.id,
      expected_updated_at: record.updated_at,
    })
    check(error)
  } else {
    const { data: rows, error } = await client()
      .from(resource)
      .delete()
      .eq('id', record.id)
      .eq('updated_at', record.updated_at)
      .select('id')
    check(error)
    if (!rows?.length) throw new Error(conflict)
  }
}
export async function moveRecord<K extends 'bookmarks' | 'bookmark_groups'>(
  resource: K,
  record: ResourceMap[K],
  neighbor: ResourceMap[K],
  pinned = false,
) {
  online()
  const field = pinned ? 'pinned_order' : 'sort_order'
  if (demoMode) {
    const rows = data[resource] as ResourceMap[K][]
    const a = rows.find((r) => r.id === record.id),
      b = rows.find((r) => r.id === neighbor.id)
    if (!a || !b || a.updated_at !== record.updated_at || b.updated_at !== neighbor.updated_at)
      throw new Error(conflict)
    const av = (a as unknown as Record<string, unknown>)[field]
    const bv = (b as unknown as Record<string, unknown>)[field]
    Object.assign(a, { [field]: bv, updated_at: nextTimestamp(a.updated_at) })
    Object.assign(b, { [field]: av, updated_at: nextTimestamp(b.updated_at) })
    return
  }
  const { error } = await client().rpc('swap_order', {
    resource_name: resource,
    first_id: record.id,
    second_id: neighbor.id,
    first_version: record.updated_at,
    second_version: neighbor.updated_at,
    use_pinned: pinned,
  })
  check(error)
}
