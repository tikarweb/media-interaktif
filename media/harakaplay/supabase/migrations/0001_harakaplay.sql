-- =====================================================================
-- HarakaPlay — skema database + keamanan (RLS)
-- Cara pakai: Supabase Dashboard → SQL Editor → New query → tempel SEMUA
-- isi file ini → Run. Aman dijalankan ulang (memakai IF NOT EXISTS / OR REPLACE).
--
-- Prinsip:
--  * Klien (browser) HANYA boleh MEMBACA data ruangan miliknya sendiri.
--  * Semua penulisan dilakukan Edge Function "game" (service_role), yang
--    memvalidasi setiap langkah. Klien tidak punya izin insert/update/delete.
--  * Kartu tangan lawan & tumpukan kartu disimpan di tabel yang tidak
--    bisa dibaca klien (room_secrets), atau di baris milik pemainnya (hands).
-- =====================================================================

create table if not exists public.rooms (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  host_id      uuid not null,
  status       text not null default 'lobby' check (status in ('lobby','playing','finished','closed')),
  public_state jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.room_players (
  room_id   uuid not null references public.rooms(id) on delete cascade,
  user_id   uuid not null,
  name      text not null,
  seat      int  not null,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

-- Rahasia server: seluruh status permainan (termasuk semua tangan & tumpukan)
create table if not exists public.room_secrets (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  state   jsonb not null,
  version int   not null
);

-- Tangan tiap pemain: hanya pemilik yang boleh membaca
create table if not exists public.hands (
  room_id       uuid not null references public.rooms(id) on delete cascade,
  user_id       uuid not null,
  cards         jsonb not null default '[]'::jsonb,
  drawn_card_id text,
  primary key (room_id, user_id)
);

create index if not exists room_players_user_idx on public.room_players(user_id);
create index if not exists rooms_updated_idx on public.rooms(updated_at);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.rooms         enable row level security;
alter table public.room_players  enable row level security;
alter table public.room_secrets  enable row level security;
alter table public.hands         enable row level security;

-- Fungsi bantu (security definer agar tidak rekursif pada RLS)
create or replace function public.hp_is_member(rid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.room_players where room_id = rid and user_id = auth.uid());
$$;

drop policy if exists rooms_select on public.rooms;
create policy rooms_select on public.rooms
  for select to authenticated using (public.hp_is_member(id));

drop policy if exists players_select on public.room_players;
create policy players_select on public.room_players
  for select to authenticated using (public.hp_is_member(room_id));

drop policy if exists hands_select on public.hands;
create policy hands_select on public.hands
  for select to authenticated using (user_id = auth.uid());

-- room_secrets: sengaja TANPA policy => klien tidak bisa membaca/menulis sama sekali.

-- Cabut semua hak tulis dari klien; baca dibatasi oleh policy di atas.
revoke all on public.rooms, public.room_players, public.room_secrets, public.hands from anon, authenticated;
grant select on public.rooms, public.room_players, public.hands to authenticated;
grant all on public.rooms, public.room_players, public.room_secrets, public.hands to service_role;

-- ---------------------------------------------------------------------
-- Penyimpanan atomik dengan penjaga versi (anti aksi ganda/bersamaan).
-- Hanya service_role (Edge Function) yang boleh memanggil.
--   p_expected = NULL  -> mulai permainan baru (hanya jika ruangan 'lobby')
--   p_expected = n     -> hanya berhasil jika versi tersimpan masih n
-- Mengembalikan true jika tersimpan, false jika kalah balapan.
-- ---------------------------------------------------------------------
create or replace function public.hp_save_game(
  p_room     uuid,
  p_expected int,
  p_state    jsonb,
  p_public   jsonb,
  p_hands    jsonb,
  p_status   text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
  h record;
begin
  if p_expected is null then
    update public.rooms
       set status = p_status, public_state = p_public, updated_at = now()
     where id = p_room and status = 'lobby';
    get diagnostics n = row_count;
    if n = 0 then return false; end if;
    insert into public.room_secrets(room_id, state, version)
      values (p_room, p_state, (p_state->>'version')::int)
    on conflict (room_id) do update
      set state = excluded.state, version = excluded.version;
  else
    update public.room_secrets
       set state = p_state, version = (p_state->>'version')::int
     where room_id = p_room and version = p_expected;
    get diagnostics n = row_count;
    if n = 0 then return false; end if;
    update public.rooms
       set status = p_status, public_state = p_public, updated_at = now()
     where id = p_room;
  end if;

  for h in select key as uid, value as v from jsonb_each(p_hands) loop
    insert into public.hands(room_id, user_id, cards, drawn_card_id)
      values (p_room, h.uid::uuid, h.v->'cards', h.v->>'drawn')
    on conflict (room_id, user_id) do update
      set cards = excluded.cards, drawn_card_id = excluded.drawn_card_id;
  end loop;
  return true;
end;
$$;

revoke all on function public.hp_save_game(uuid,int,jsonb,jsonb,jsonb,text) from public, anon, authenticated;
grant execute on function public.hp_save_game(uuid,int,jsonb,jsonb,jsonb,text) to service_role;

-- ---------------------------------------------------------------------
-- Realtime: kirim perubahan ke anggota ruangan (RLS tetap berlaku)
-- ---------------------------------------------------------------------
do $$
begin
  begin alter publication supabase_realtime add table public.rooms;        exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.room_players; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.hands;        exception when duplicate_object then null; end;
end $$;

-- ---------------------------------------------------------------------
-- Pembersihan ruangan lama (jalankan manual kapan saja, atau jadwalkan
-- lewat pg_cron bila diaktifkan):
--   delete from public.rooms where updated_at < now() - interval '2 days';
-- ---------------------------------------------------------------------
