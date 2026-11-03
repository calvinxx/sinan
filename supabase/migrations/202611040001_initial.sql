-- 司南：在 Supabase SQL Editor 中一次执行此文件。
begin;

create table public.bookmark_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 30),
  sort_order bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp(),
  unique (owner_id, name), unique (owner_id, id)
);
create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 200),
  url text not null check (url ~* '^https?://[^[:space:]]+$'),
  group_id uuid,
  is_pinned boolean not null default false,
  sort_order bigint not null default 0,
  pinned_order bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp(),
  foreign key (owner_id, group_id) references public.bookmark_groups(owner_id, id),
  check ((is_pinned and pinned_order is not null) or (not is_pinned and pinned_order is null))
);
create table public.todos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 200),
  details text not null default '' check (char_length(details) <= 10000),
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp(),
  check ((status = 'done' and completed_at is not null) or (status <> 'done' and completed_at is null))
);

create index bookmarks_owner_order_idx on public.bookmarks(owner_id, group_id, sort_order);
create index bookmarks_pinned_idx on public.bookmarks(owner_id, pinned_order) where is_pinned;
create index todos_owner_deadline_idx on public.todos(owner_id, status, due_at);
create index groups_owner_order_idx on public.bookmark_groups(owner_id, sort_order);

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := greatest(clock_timestamp(), old.updated_at + interval '1 microsecond');
  new.created_at := old.created_at;
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array['bookmark_groups', 'bookmarks', 'todos'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy owner_select on public.%I for select to authenticated using ((select auth.uid()) = owner_id)', table_name);
    execute format('create policy owner_insert on public.%I for insert to authenticated with check ((select auth.uid()) = owner_id)', table_name);
    execute format('create policy owner_update on public.%I for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id)', table_name);
    execute format('create policy owner_delete on public.%I for delete to authenticated using ((select auth.uid()) = owner_id)', table_name);
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()', table_name);
    execute format('revoke all on public.%I from anon', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
  end loop;
end;
$$;

-- SECURITY INVOKER：保留调用者的 RLS；锁定分组后原子迁移书签和删除分组。
create function public.delete_bookmark_group(target_id uuid, expected_updated_at timestamptz)
returns void language plpgsql security invoker set search_path = '' as $$
declare actual_version timestamptz;
begin
  select updated_at into actual_version from public.bookmark_groups where id = target_id for update;
  if not found or actual_version <> expected_updated_at then
    raise exception '分组已更新或删除，请刷新后重试';
  end if;
  update public.bookmarks set group_id = null where group_id = target_id;
  delete from public.bookmark_groups where id = target_id;
end;
$$;

create function public.swap_order(
  resource_name text, first_id uuid, second_id uuid,
  first_version timestamptz, second_version timestamptz, use_pinned boolean default false
) returns void language plpgsql security invoker set search_path = '' as $$
declare
  field_name text;
  locked_row record;
  row_count integer := 0;
  first_order bigint;
  second_order bigint;
begin
  if resource_name not in ('bookmarks', 'bookmark_groups') or first_id = second_id then
    raise exception '无效的排序请求';
  end if;
  if use_pinned and resource_name <> 'bookmarks' then raise exception '无效的置顶排序'; end if;
  field_name := case when use_pinned then 'pinned_order' else 'sort_order' end;
  -- 固定锁顺序，避免两个设备以相反方向排序时死锁。
  for locked_row in execute format('select id, updated_at, %I as position from public.%I where id = $1 or id = $2 order by id for update', field_name, resource_name) using first_id, second_id loop
    row_count := row_count + 1;
    if locked_row.id = first_id then
      if locked_row.updated_at <> first_version then raise exception '记录已更新，请刷新后重试'; end if;
      first_order := locked_row.position;
    else
      if locked_row.updated_at <> second_version then raise exception '记录已更新，请刷新后重试'; end if;
      second_order := locked_row.position;
    end if;
  end loop;
  if row_count <> 2 or first_order is null or second_order is null then raise exception '记录不存在或无法排序'; end if;
  execute format('update public.%I set %I = case when id = $1 then $3 else $4 end where id = $1 or id = $2', resource_name, field_name)
    using first_id, second_id, second_order, first_order;
end;
$$;

revoke all on function public.delete_bookmark_group(uuid, timestamptz) from public, anon;
revoke all on function public.swap_order(text, uuid, uuid, timestamptz, timestamptz, boolean) from public, anon;
grant execute on function public.delete_bookmark_group(uuid, timestamptz) to authenticated;
grant execute on function public.swap_order(text, uuid, uuid, timestamptz, timestamptz, boolean) to authenticated;

commit;
