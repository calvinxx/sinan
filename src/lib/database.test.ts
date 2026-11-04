import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'

const db = new PGlite()
const alice = '00000000-0000-0000-0000-000000000001'
const bob = '00000000-0000-0000-0000-000000000002'
const groupA = '10000000-0000-0000-0000-000000000001'
const groupB = '10000000-0000-0000-0000-000000000002'
const emptyGroup = '10000000-0000-0000-0000-000000000003'
const bookmarkA = '20000000-0000-0000-0000-000000000001'
const bookmarkB = '20000000-0000-0000-0000-000000000002'

async function asUser(id: string) {
  await db.exec('reset role')
  await db.query("select set_config('request.jwt.claim.sub', $1, true)", [id])
  await db.exec('set role authenticated')
}
beforeAll(async () => {
  // 只模拟 Supabase 已提供的身份接口，实际执行项目迁移及 PostgreSQL RLS。
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;
  `)
  const migrations = new URL('../../supabase/migrations/', import.meta.url)
  for (const file of readdirSync(migrations)
    .filter((name) => name.endsWith('.sql'))
    .sort()) {
    await db.exec(readFileSync(new URL(file, migrations), 'utf8'))
  }
  await db.query('insert into auth.users(id) values ($1), ($2)', [alice, bob])
}, 30_000)
beforeEach(async () => {
  await db.exec('begin')
  await db.query(
    'insert into public.bookmark_groups(id,owner_id,name,sort_order) values ($1,$2,$3,0),($4,$5,$6,1),($7,$2,$8,2)',
    [groupA, alice, '开发', groupB, bob, '私人', emptyGroup, '空分组'],
  )
  await db.query(
    'insert into public.bookmarks(id,owner_id,title,url,group_id,sort_order) values ($1,$2,$3,$4,$5,0),($6,$2,$7,$8,$5,1)',
    [
      bookmarkA,
      alice,
      'GitHub',
      'https://github.com',
      groupA,
      bookmarkB,
      'MDN',
      'https://developer.mozilla.org',
    ],
  )
})
afterEach(async () => {
  await db.exec('rollback; reset role;')
})
afterAll(async () => {
  await db.close()
})

describe('Supabase 迁移及访问控制', () => {
  it('匿名用户不能读取私人书签', async () => {
    await db.exec('set role anon')
    await expect(db.query('select * from public.bookmarks')).rejects.toThrow(/permission denied/)
  })
  it('其他用户看不到也不能删除非本人记录', async () => {
    await asUser(bob)
    expect((await db.query('select * from public.bookmarks')).rows).toHaveLength(0)
    expect(
      (await db.query('delete from public.bookmarks where id = $1 returning id', [bookmarkA])).rows,
    ).toHaveLength(0)
  })
  it('不能冒用其他 owner 写入数据', async () => {
    await asUser(bob)
    await expect(
      db.query('insert into public.todos(owner_id,title) values ($1,$2)', [alice, '越权任务']),
    ).rejects.toThrow(/row-level security/)
  })
  it('不能把自己的书签绑定到别人的分组', async () => {
    await asUser(alice)
    await expect(
      db.query('update public.bookmarks set group_id = $1 where id = $2', [groupB, bookmarkA]),
    ).rejects.toThrow(/foreign key/)
  })
  it('有书签的分组不能删除，书签及分组均保留', async () => {
    await asUser(alice)
    await db.exec('savepoint deleting_group')
    await expect(
      db.query(
        'select public.delete_bookmark_group(id,updated_at) from public.bookmark_groups where id = $1',
        [groupA],
      ),
    ).rejects.toThrow('请先移走分组中的书签')
    await db.exec('rollback to savepoint deleting_group')
    expect(
      (await db.query('select * from public.bookmarks where group_id = $1', [groupA])).rows,
    ).toHaveLength(2)
    expect(
      (await db.query('select * from public.bookmark_groups where id = $1', [groupA])).rows,
    ).toHaveLength(1)
  })
  it('移走书签后可以删除空分组', async () => {
    await asUser(alice)
    await db.query('update public.bookmarks set group_id = $1 where group_id = $2', [
      emptyGroup,
      groupA,
    ])
    await db.query(
      'select public.delete_bookmark_group(id,updated_at) from public.bookmark_groups where id = $1',
      [groupA],
    )
    expect(
      (await db.query('select * from public.bookmarks where group_id = $1', [emptyGroup])).rows,
    ).toHaveLength(2)
    expect((await db.query('select * from public.bookmark_groups')).rows).toHaveLength(1)
  })
  it('不能新增没有分组的书签', async () => {
    await asUser(alice)
    await expect(
      db.query('insert into public.bookmarks(owner_id,title,url) values ($1,$2,$3)', [
        alice,
        '缺少分组',
        'https://example.com',
      ]),
    ).rejects.toThrow(/not-null constraint/)
  })
  it('不能清空已有书签的分组', async () => {
    await asUser(alice)
    await expect(
      db.query('update public.bookmarks set group_id = null where id = $1', [bookmarkA]),
    ).rejects.toThrow(/not-null constraint/)
  })
  it('排序事务交换顺序且更新版本', async () => {
    await asUser(alice)
    await db.query(
      `select public.swap_order('bookmarks', a.id, b.id, a.updated_at, b.updated_at, false)
      from public.bookmarks a, public.bookmarks b where a.id = $1 and b.id = $2`,
      [bookmarkA, bookmarkB],
    )
    const result = await db.query('select id from public.bookmarks order by sort_order')
    expect(result.rows).toEqual([{ id: bookmarkB }, { id: bookmarkA }])
  })
  it('旧版本不能覆盖新版本记录', async () => {
    await asUser(alice)
    await db.exec(
      'create temporary table original_version as select id,updated_at from public.bookmarks',
    )
    await db.query('update public.bookmarks set title = $1 where id = $2', [
      '更新后的名称',
      bookmarkA,
    ])
    const result = await db.query(
      `update public.bookmarks b set title = '不该生效'
      from original_version v where b.id = v.id and b.updated_at = v.updated_at and b.id = $1 returning b.id`,
      [bookmarkA],
    )
    expect(result.rows).toHaveLength(0)
  })
  it('数据库拒绝不一致的完成状态', async () => {
    await asUser(alice)
    await expect(
      db.query("insert into public.todos(owner_id,title,status) values ($1,'不完整任务','done')", [
        alice,
      ]),
    ).rejects.toThrow(/check constraint/)
  })
})
