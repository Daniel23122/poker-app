export type PlayerStatus = 'active' | 'folded' | 'allin' | 'out'

export interface Room {
  id: string
  code: string
  host_secret: string
  player_count: number
  start_stack: number
  small_blind: number
  big_blind: number
  pot: number
  hand_number: number
  dealer_seat: number
  sb_seat: number | null
  bb_seat: number | null
  hand_active: boolean
  created_at: string
}

export interface Player {
  id: string
  room_id: string
  secret: string
  name: string
  seat: number
  stack: number
  current_bet: number
  status: PlayerStatus
  is_host: boolean
  created_at: string
}

export type HistoryType = 'hand_win' | 'rebuy' | 'new_hand' | 'remove'

export interface HistoryEntry {
  id: string
  room_id: string
  hand_number: number | null
  type: HistoryType
  player_name: string | null
  amount: number | null
  detail: string | null
  created_at: string
}

export interface LocalIdentity {
  roomId: string
  roomCode: string
  playerId: string
  playerSecret: string
  hostSecret?: string
}
