-- Fixes "permission denied for table damda_shared_cards" when creating a share link/QR.
-- Idempotent: safe to run in the Supabase SQL Editor even if the base migration already ran.
begin;

grant usage on schema public to anon, authenticated;

grant select, insert, update on public.damda_accounts to authenticated;
grant select, insert, delete on public.damda_shared_cards to authenticated;
grant execute on function public.damda_get_shared_card(uuid) to anon, authenticated;

alter table public.damda_accounts enable row level security;
alter table public.damda_shared_cards enable row level security;

drop policy if exists card_read_own on public.damda_shared_cards;
drop policy if exists card_publish on public.damda_shared_cards;
drop policy if exists card_revoke on public.damda_shared_cards;
create policy card_read_own on public.damda_shared_cards for select to authenticated using ((select auth.uid()) = owner_id);
create policy card_publish on public.damda_shared_cards for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy card_revoke on public.damda_shared_cards for delete to authenticated using ((select auth.uid()) = owner_id);

commit;
