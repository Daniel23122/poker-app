-- ============================================================
-- FIX: gen_random_bytes() ist bei Supabase nicht in "public",
-- sondern im Schema "extensions" registriert. Die Funktionen
-- create_room und join_room müssen daher auch dieses Schema im
-- search_path haben.
--
-- Einfach diesen kompletten Block im Supabase SQL Editor
-- ausführen (Dashboard -> SQL Editor -> New query -> Run).
-- ============================================================

alter function create_room(text, int, int, int, int)
  set search_path = public, extensions;

alter function join_room(text, text)
  set search_path = public, extensions;
