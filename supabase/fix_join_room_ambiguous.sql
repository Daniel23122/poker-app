-- ============================================================
-- FIX: "column reference room_id is ambiguous" beim Beitreten.
-- Grund: join_room() gibt eine Spalte "room_id" zurück, die mit
-- der Spalte "room_id" in der Tabelle "players" kollidiert.
--
-- Kompletten Block im Supabase SQL Editor ausführen
-- (Dashboard -> SQL Editor -> New query -> Run).
-- ============================================================

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
set search_path = public, extensions
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

  select count(*) into v_taken from players p where p.room_id = v_room.id;
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
