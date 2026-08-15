import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.error(
    'Supabase-Umgebungsvariablen fehlen. Lege eine .env-Datei an (siehe .env.example) und starte den Dev-Server neu.'
  )
}

export const supabase = createClient(url ?? '', anonKey ?? '')
