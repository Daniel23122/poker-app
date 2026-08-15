import { supabase } from './supabase'

async function callRpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new Error(error.message)
  return data as T
}

export async function createRoom(params: {
  hostName: string
  playerCount: number
  startStack: number
  smallBlind: number
  bigBlind: number
}) {
  const rows = await callRpc<
    { room_id: string; room_code: string; player_id: string; player_secret: string; host_secret: string }[]
  >('create_room', {
    p_host_name: params.hostName,
    p_player_count: params.playerCount,
    p_start_stack: params.startStack,
    p_small_blind: params.smallBlind,
    p_big_blind: params.bigBlind,
  })
  return rows[0]
}

export async function joinRoom(params: { code: string; name: string }) {
  const rows = await callRpc<{ room_id: string; player_id: string; player_secret: string }[]>(
    'join_room',
    { p_code: params.code.toUpperCase().trim(), p_name: params.name }
  )
  return rows[0]
}

export async function placeBet(params: { playerId: string; secret: string; targetBet: number }) {
  await callRpc('place_bet', {
    p_player_id: params.playerId,
    p_secret: params.secret,
    p_target_bet: params.targetBet,
  })
}

export async function foldPlayer(params: { playerId: string; secret: string }) {
  await callRpc('fold_player', { p_player_id: params.playerId, p_secret: params.secret })
}

export async function startNewHand(params: { roomId: string; hostSecret: string }) {
  await callRpc('start_new_hand', { p_room_id: params.roomId, p_host_secret: params.hostSecret })
}

export async function endHand(params: { roomId: string; hostSecret: string; winnerId: string }) {
  await callRpc('end_hand', {
    p_room_id: params.roomId,
    p_host_secret: params.hostSecret,
    p_winner_player_id: params.winnerId,
  })
}

export async function rebuyPlayer(params: {
  roomId: string
  hostSecret: string
  playerId: string
  amount: number
}) {
  await callRpc('rebuy', {
    p_room_id: params.roomId,
    p_host_secret: params.hostSecret,
    p_player_id: params.playerId,
    p_amount: params.amount,
  })
}

export async function removePlayer(params: { roomId: string; hostSecret: string; playerId: string }) {
  await callRpc('remove_player', {
    p_room_id: params.roomId,
    p_host_secret: params.hostSecret,
    p_player_id: params.playerId,
  })
}

export async function updateRoomSettings(params: {
  roomId: string
  hostSecret: string
  smallBlind: number
  bigBlind: number
}) {
  await callRpc('update_room_settings', {
    p_room_id: params.roomId,
    p_host_secret: params.hostSecret,
    p_small_blind: params.smallBlind,
    p_big_blind: params.bigBlind,
  })
}
