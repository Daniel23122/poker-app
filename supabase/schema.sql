-- ============================================================
-- Poker Chip Manager — Supabase Schema
-- ============================================================
-- Führe dieses komplette Skript im Supabase SQL Editor aus
-- (Dashboard -> SQL Editor -> New query -> Paste -> Run).
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- TABELLEN
-- ------------------------------------------------------------

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_secret text not null,
  player_count int not null check (player_count between 2 and 6),
  start_stack int not null check (start_stack > 0),
  small_blind int not null check (small_blind > 0),
  big_blind int not null check (big_blind > 0),
  pot int not null default 0 check (pot >= 0),
  hand_number int not null default 0,
  dealer_seat int not null default 0,
  sb_seat int,
  bb_seat int,
  hand_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  secret text not null,
  name text not null,
  seat int not null,
  stack int not null default 0 check (stack >= 0),
  current_bet int not null default 0 check (current_bet >= 0),
  status text not null default 'active' check (status in ('active','folded','allin','out')),
  is_host boolean not null default false,
  created_at timestamptz not null default now(),
  unique (room_id, seat)
);

create table if not exists history (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  hand_number int,
  type text not null check (type in ('hand_win','rebuy','new_hand','remove')),
  player_name text,
  amount int,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists idx_players_room on players(room_id);
create index if not exists idx_history_room on history(room_id);

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- Lesen ist für alle mit dem (unratbaren) Raum-Code erlaubt,
-- damit die Echtzeit-Synchronisation funktioniert. Schreiben ist
-- NUR über die untenstehenden RPC-Funktionen möglich (SECURITY
-- DEFINER), niemals per direktem INSERT/UPDATE/DELETE vom Client.
-- ------------------------------------------------------------

alter table rooms enable row level security;
alter table players enable row level security;
alter table history enable row level security;

drop policy if exists "rooms select" on rooms;
create policy "rooms select" on rooms for select using (true);

drop policy if exists "players select" on players;
create policy "players select" on players for select using (true);

drop policy if exists "history select" on history;
create policy "history select" on history for select using (true);

-- Kein INSERT/UPDATE/DELETE-Policy für anon => per Default verboten.
-- Alle Schreibzugriffe laufen über SECURITY DEFINER-Funktionen unten.

-- ------------------------------------------------------------
-- HILFSFUNKTION: kurzer Raumcode
-- ------------------------------------------------------------

create or replace function generate_room_code() returns text
language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- ohne verwechselbare Zeichen
  result text := '';
  i int;
begin
  for i in 1..5 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$;

-- ------------------------------------------------------------
-- RPC: Raum erstellen
-- ------------------------------------------------------------

create or replace function create_room(
  p_host_name text,
  p_player_count int,
  p_start_stack int,
  p_small_blind int,
  p_big_blind int
) returns table (
  room_id uuid,
  room_code text,
  player_id uuid,
  player_secret text,
  host_secret text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id uuid;
  v_code text;
  v_host_secret text := encode(gen_random_bytes(16), 'hex');
  v_player_id uuid;
  v_player_secret text := encode(gen_random_bytes(16), 'hex');
  v_tries int := 0;
begin
  if p_host_name is null or length(trim(p_host_name)) = 0 then
    raise exception 'Spielername fehlt';
  end if;

  loop
    v_code := generate_room_code();
    exit when not exists (select 1 from rooms r where r.code = v_code);
    v_tries := v_tries + 1;
    if v_tries > 20 then
      raise exception 'Konnte keinen freien Raumcode erzeugen';
    end if;
  end loop;

  insert into rooms (code, host_secret, player_count, start_stack, small_blind, big_blind)
  values (v_code, v_host_secret, p_player_count, p_start_stack, p_small_blind, p_big_blind)
  returning id into v_room_id;

  insert into players (room_id, secret, name, seat, stack, is_host)
  values (v_room_id, v_player_secret, trim(p_host_name), 0, p_start_stack, true)
  returning id into v_player_id;

  return query select v_room_id, v_code, v_player_id, v_player_secret, v_host_secret;
end;
$$;

grant execute on function create_room(text, int, int, int, int) to anon;

-- ------------------------------------------------------------
-- RPC: Raum beitreten
-- ------------------------------------------------------------

create or replace function join_room(
  p_code text,
  p_name text
) returns table (
  room_id uuid,
  player_id uuid,
  player_secret text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room rooms%rowtype;
  v_seat int;
  v_taken int;
  v_secret text := encode(gen_random_bytes(16), 'hex');
  v_player_id uuid;
begin
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Spielername fehlt';
  end if;

  select * into v_room from rooms where code = upper(trim(p_code));
  if not found then
    raise exception 'Raum nicht gefunden';
  end if;

  select count(*) into v_taken from players where room_id = v_room.id;
  if v_taken >= v_room.player_count then
    raise exception 'Raum ist voll';
  end if;

  -- nächsten freien Sitzplatz finden
  select min(s) into v_seat
  from generate_series(0, v_room.player_count - 1) s
  where not exists (select 1 from players p where p.room_id = v_room.id and p.seat = s);

  if v_seat is null then
    raise exception 'Kein freier Sitzplatz';
  end if;

  insert into players (room_id, secret, name, seat, stack, is_host)
  values (v_room.id, v_secret, trim(p_name), v_seat, v_room.start_stack, false)
  returning id into v_player_id;

  return query select v_room.id, v_player_id, v_secret;
end;
$$;

grant execute on function join_room(text, text) to anon;

-- ------------------------------------------------------------
-- RPC: Wetten / Call / Check / Bet / Raise / All-In
-- p_target_bet ist der ABSOLUTE Gesamteinsatz des Spielers in
-- dieser Runde (nicht die Differenz). Das macht Wiederholungen
-- sicher (idempotent) und verhindert doppeltes Abziehen.
-- ------------------------------------------------------------

create or replace function place_bet(
  p_player_id uuid,
  p_secret text,
  p_target_bet int
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player players%rowtype;
  v_room rooms%rowtype;
  v_delta int;
begin
  select * into v_player from players where id = p_player_id for update;
  if not found or v_player.secret <> p_secret then
    raise exception 'Ungültiger Spieler';
  end if;

  select * into v_room from rooms where id = v_player.room_id for update;
  if not v_room.hand_active then
    raise exception 'Keine aktive Hand';
  end if;

  if v_player.status not in ('active') then
    raise exception 'Spieler kann gerade nicht setzen (Status: %)', v_player.status;
  end if;

  if p_target_bet < v_player.current_bet then
    raise exception 'Ungültiger Einsatz';
  end if;

  v_delta := p_target_bet - v_player.current_bet;

  if v_delta > v_player.stack then
    raise exception 'Nicht genug Chips';
  end if;

  update players
  set stack = stack - v_delta,
      current_bet = p_target_bet,
      status = case when stack - v_delta = 0 then 'allin' else 'active' end
  where id = p_player_id;

  update rooms set pot = pot + v_delta where id = v_room.id;
end;
$$;

grant execute on function place_bet(uuid, text, int) to anon;

-- ------------------------------------------------------------
-- RPC: Fold
-- ------------------------------------------------------------

create or replace function fold_player(
  p_player_id uuid,
  p_secret text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player players%rowtype;
  v_room rooms%rowtype;
begin
  select * into v_player from players where id = p_player_id for update;
  if not found or v_player.secret <> p_secret then
    raise exception 'Ungültiger Spieler';
  end if;

  select * into v_room from rooms where id = v_player.room_id;
  if not v_room.hand_active then
    raise exception 'Keine aktive Hand';
  end if;

  update players set status = 'folded' where id = p_player_id;
end;
$$;

grant execute on function fold_player(uuid, text) to anon;

-- ------------------------------------------------------------
-- RPC: Neue Hand starten (nur Host)
-- ------------------------------------------------------------

create or replace function start_new_hand(
  p_room_id uuid,
  p_host_secret text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room rooms%rowtype;
  v_seats int[];
  v_n int;
  v_dealer_idx int;
  v_sb_idx int;
  v_bb_idx int;
  v_sb_seat int;
  v_bb_seat int;
  v_sb_player players%rowtype;
  v_bb_player players%rowtype;
  v_sb_delta int;
  v_bb_delta int;
begin
  select * into v_room from rooms where id = p_room_id for update;
  if not found or v_room.host_secret <> p_host_secret then
    raise exception 'Keine Host-Berechtigung';
  end if;

  if v_room.hand_active then
    raise exception 'Es läuft bereits eine Hand. Bitte zuerst "Hand beenden".';
  end if;

  -- alle Spieler mit Chips zurücksetzen
  update players
  set current_bet = 0,
      status = case when stack > 0 then 'active' else 'out' end
  where room_id = p_room_id;

  select array_agg(seat order by seat) into v_seats
  from players where room_id = p_room_id and stack > 0;

  v_n := coalesce(array_length(v_seats, 1), 0);
  if v_n < 2 then
    raise exception 'Mindestens 2 Spieler mit Chips benötigt';
  end if;

  -- Dealer-Position im Sitzkreis rotieren
  select coalesce(min(idx), 0) into v_dealer_idx
  from (
    select row_number() over (order by s) - 1 as idx, s
    from unnest(v_seats) s
  ) t
  where t.s > v_room.dealer_seat;

  if v_dealer_idx is null then
    v_dealer_idx := 0;
  end if;

  v_sb_idx := (v_dealer_idx + 1) % v_n;
  v_bb_idx := (v_dealer_idx + 2) % v_n;
  v_sb_seat := v_seats[v_sb_idx + 1];
  v_bb_seat := v_seats[v_bb_idx + 1];

  select * into v_sb_player from players where room_id = p_room_id and seat = v_sb_seat;
  select * into v_bb_player from players where room_id = p_room_id and seat = v_bb_seat;

  v_sb_delta := least(v_room.small_blind, v_sb_player.stack);
  v_bb_delta := least(v_room.big_blind, v_bb_player.stack);

  update players
  set stack = stack - v_sb_delta,
      current_bet = v_sb_delta,
      status = case when stack - v_sb_delta = 0 then 'allin' else 'active' end
  where id = v_sb_player.id;

  update players
  set stack = stack - v_bb_delta,
      current_bet = v_bb_delta,
      status = case when stack - v_bb_delta = 0 then 'allin' else 'active' end
  where id = v_bb_player.id;

  update rooms
  set hand_number = hand_number + 1,
      pot = v_sb_delta + v_bb_delta,
      dealer_seat = v_seats[v_dealer_idx + 1],
      sb_seat = v_sb_seat,
      bb_seat = v_bb_seat,
      hand_active = true
  where id = p_room_id;

  insert into history (room_id, hand_number, type, detail)
  values (p_room_id, v_room.hand_number + 1, 'new_hand',
    'SB ' || v_sb_player.name || ' (' || v_sb_delta || '), BB ' || v_bb_player.name || ' (' || v_bb_delta || ')');
end;
$$;

grant execute on function start_new_hand(uuid, text) to anon;

-- ------------------------------------------------------------
-- RPC: Hand beenden & Pot auszahlen (nur Host)
-- ------------------------------------------------------------

create or replace function end_hand(
  p_room_id uuid,
  p_host_secret text,
  p_winner_player_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room rooms%rowtype;
  v_winner players%rowtype;
begin
  select * into v_room from rooms where id = p_room_id for update;
  if not found or v_room.host_secret <> p_host_secret then
    raise exception 'Keine Host-Berechtigung';
  end if;

  if not v_room.hand_active then
    raise exception 'Es läuft keine aktive Hand (Pot wurde evtl. schon ausgezahlt)';
  end if;

  select * into v_winner from players where id = p_winner_player_id and room_id = p_room_id;
  if not found then
    raise exception 'Gewinner nicht gefunden';
  end if;

  update players set stack = stack + v_room.pot where id = p_winner_player_id;

  insert into history (room_id, hand_number, type, player_name, amount)
  values (p_room_id, v_room.hand_number, 'hand_win', v_winner.name, v_room.pot);

  update rooms set pot = 0, hand_active = false where id = p_room_id;

  update players set current_bet = 0 where room_id = p_room_id;
end;
$$;

grant execute on function end_hand(uuid, text, uuid) to anon;

-- ------------------------------------------------------------
-- RPC: Rebuy (nur Host)
-- ------------------------------------------------------------

create or replace function rebuy(
  p_room_id uuid,
  p_host_secret text,
  p_player_id uuid,
  p_amount int
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room rooms%rowtype;
  v_player players%rowtype;
begin
  select * into v_room from rooms where id = p_room_id;
  if not found or v_room.host_secret <> p_host_secret then
    raise exception 'Keine Host-Berechtigung';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Ungültiger Rebuy-Betrag';
  end if;

  select * into v_player from players where id = p_player_id and room_id = p_room_id;
  if not found then
    raise exception 'Spieler nicht gefunden';
  end if;

  update players
  set stack = stack + p_amount,
      status = case when status = 'out' then 'active' else status end
  where id = p_player_id;

  insert into history (room_id, hand_number, type, player_name, amount)
  values (p_room_id, v_room.hand_number, 'rebuy', v_player.name, p_amount);
end;
$$;

grant execute on function rebuy(uuid, text, uuid, int) to anon;

-- ------------------------------------------------------------
-- RPC: Spieler entfernen (nur Host)
-- ------------------------------------------------------------

create or replace function remove_player(
  p_room_id uuid,
  p_host_secret text,
  p_player_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room rooms%rowtype;
  v_player players%rowtype;
begin
  select * into v_room from rooms where id = p_room_id;
  if not found or v_room.host_secret <> p_host_secret then
    raise exception 'Keine Host-Berechtigung';
  end if;

  select * into v_player from players where id = p_player_id and room_id = p_room_id;
  if not found then
    raise exception 'Spieler nicht gefunden';
  end if;

  if v_player.is_host then
    raise exception 'Host kann sich nicht selbst entfernen';
  end if;

  insert into history (room_id, hand_number, type, player_name)
  values (p_room_id, v_room.hand_number, 'remove', v_player.name);

  delete from players where id = p_player_id;
end;
$$;

grant execute on function remove_player(uuid, text, uuid) to anon;

-- ------------------------------------------------------------
-- RPC: Blinds & Startstack ändern (nur Host, wirkt ab nächster Hand)
-- ------------------------------------------------------------

create or replace function update_room_settings(
  p_room_id uuid,
  p_host_secret text,
  p_small_blind int,
  p_big_blind int
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room rooms%rowtype;
begin
  select * into v_room from rooms where id = p_room_id;
  if not found or v_room.host_secret <> p_host_secret then
    raise exception 'Keine Host-Berechtigung';
  end if;

  if v_room.hand_active then
    raise exception 'Blinds können nicht während einer laufenden Hand geändert werden';
  end if;

  if p_small_blind <= 0 or p_big_blind <= 0 or p_big_blind < p_small_blind then
    raise exception 'Ungültige Blinds';
  end if;

  update rooms set small_blind = p_small_blind, big_blind = p_big_blind where id = p_room_id;
end;
$$;

grant execute on function update_room_settings(uuid, text, int, int) to anon;

-- ------------------------------------------------------------
-- Realtime aktivieren
-- ------------------------------------------------------------

alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table history;
