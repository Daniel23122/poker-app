import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Room, Player, HistoryEntry } from '../types'

export function useRoom(roomId: string | null) {
  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetchAll = useCallback(async () => {
    if (!roomId) return
    const [roomRes, playersRes, historyRes] = await Promise.all([
      supabase.from('rooms').select('*').eq('id', roomId).single(),
      supabase.from('players').select('*').eq('room_id', roomId).order('seat'),
      supabase
        .from('history')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    if (roomRes.error) {
      setError(roomRes.error.message)
    } else {
      setRoom(roomRes.data as Room)
    }
    if (playersRes.data) setPlayers(playersRes.data as Player[])
    if (historyRes.data) setHistory(historyRes.data as HistoryEntry[])
    setLoading(false)
  }, [roomId])

  useEffect(() => {
    if (!roomId) return
    setLoading(true)
    refetchAll()

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') return
          setRoom(payload.new as Room)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
        () => {
          // Bei Spielern (Insert/Update/Delete) laden wir die volle Liste neu,
          // das ist bei max. 6 Spielern trivial günstig und immer konsistent.
          supabase
            .from('players')
            .select('*')
            .eq('room_id', roomId)
            .order('seat')
            .then(({ data }) => {
              if (data) setPlayers(data as Player[])
            })
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'history', filter: `room_id=eq.${roomId}` },
        (payload) => {
          setHistory((prev) => [payload.new as HistoryEntry, ...prev].slice(0, 50))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId, refetchAll])

  return { room, players, history, loading, error, refetchAll }
}
