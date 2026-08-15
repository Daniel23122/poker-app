import { LocalIdentity } from '../types'

const KEY_PREFIX = 'chiptable:identity:'

export function saveIdentity(identity: LocalIdentity) {
  localStorage.setItem(KEY_PREFIX + identity.roomCode, JSON.stringify(identity))
}

export function loadIdentity(roomCode: string): LocalIdentity | null {
  const raw = localStorage.getItem(KEY_PREFIX + roomCode)
  if (!raw) return null
  try {
    return JSON.parse(raw) as LocalIdentity
  } catch {
    return null
  }
}

export function clearIdentity(roomCode: string) {
  localStorage.removeItem(KEY_PREFIX + roomCode)
}
