-- 分组必填；只允许删除空分组。已有书签必须先归入实际分组。
begin;

alter table public.bookmarks alter column group_id set not null;

-- 保留原 RPC 签名与调用者的 RLS，旧页面也不能制造无分组书签。
create or replace function public.delete_bookmark_group(
  target_id uuid, expected_updated_at timestamptz
) returns void language plpgsql security invoker set search_path = '' as $$
declare actual_version timestamptz;
begin
  select updated_at into actual_version
    from public.bookmark_groups where id = target_id for update;
  if not found or actual_version <> expected_updated_at then
    raise exception '分组已更新或删除，请刷新后重试';
  end if;
  if exists (select 1 from public.bookmarks where group_id = target_id) then
    raise exception '请先移走分组中的书签，再删除分组';
  end if;
  delete from public.bookmark_groups where id = target_id;
end;
$$;

commit;
