-- Apply once in the Supabase SQL Editor before enabling the production frontend.
begin;

create table public.damda_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  organizer jsonb not null default '{}'::jsonb,
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now(),
  constraint profile_object check (jsonb_typeof(profile) = 'object' and octet_length(profile::text) <= 3000000),
  constraint organizer_object check (jsonb_typeof(organizer) = 'object' and octet_length(organizer::text) <= 12000000)
);
alter table public.damda_accounts enable row level security;
revoke all on public.damda_accounts from anon, authenticated;
grant select, insert, update on public.damda_accounts to authenticated;
create policy account_read on public.damda_accounts for select to authenticated using ((select auth.uid()) = user_id);
create policy account_create on public.damda_accounts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy account_update on public.damda_accounts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create table public.damda_shared_cards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  constraint card_object check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 3000000)
);
create index damda_shared_cards_owner on public.damda_shared_cards(owner_id);
alter table public.damda_shared_cards enable row level security;
revoke all on public.damda_shared_cards from anon, authenticated;
grant select, insert, delete on public.damda_shared_cards to authenticated;
create policy card_read_own on public.damda_shared_cards for select to authenticated using ((select auth.uid()) = owner_id);
create policy card_publish on public.damda_shared_cards for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy card_revoke on public.damda_shared_cards for delete to authenticated using ((select auth.uid()) = owner_id);

-- A recipient may fetch only the exact unguessable ID in their link.
-- Anonymous callers cannot enumerate the table or see owner/account information.
create function public.damda_get_shared_card(card_id uuid)
returns jsonb language sql stable security definer set search_path = ''
as $$ select data from public.damda_shared_cards where id = card_id; $$;
revoke all on function public.damda_get_shared_card(uuid) from public;
grant execute on function public.damda_get_shared_card(uuid) to anon, authenticated;

commit;
