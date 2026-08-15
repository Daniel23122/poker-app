import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRoom } from '../hooks/useRoom'
import { loadIdentity, saveIdentity } from '../lib/storage'
import { joinRoom } from '../lib/api'
import { LocalIdentity } from '../types'
import PokerTable from '../components/PokerTable'
import ActionBar from '../components/ActionBar'
import HostPanel from '../components/HostPanel'
import HandHistoryPanel from '../components/HandHistoryPanel'

export default function Room() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const [identity, setIdentity] = useState<LocalIdentity | null>(null)
  const [checkedStorage, setCheckedStorage] = useState(false)

  useEffect(() => {
    if (!code) return
    const stored = loadIdentity(code)
    setIdentity(stored)
    setCheckedStorage(true)
  }, [code])

  const { room, players, history, loading, error } = useRoom(identity?.roomId ?? null)

  if (!code) return null

  if (!checkedStorage) {
    return <CenteredMessage text="Lädt …" />
  }

  if (!identity) {
    return <JoinExistingRoom code={code} onJoined={(id) => setIdentity(id)} />
  }

  if (loading) return <CenteredMessage text="Verbinde mit Tisch …" />
  if (error || !room) {
    return <CenteredMessage text={`Raum nicht gefunden: ${error ?? 'unbekannter Fehler'}`} isError />
  }

  const self = players.find((p) => p.id === identity.playerId)
  if (!self) {
    return <CenteredMessage text="Du wurdest aus diesem Raum entfernt." isError />
  }

  const shareUrl = `${window.location.origin}/room/${room.code}`

  return (
    <div className="min-h-screen pb-10">
      <header className="sticky top-0 z-10 bg-ink/90 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="text-muted text-sm hover:text-cream transition-colors">
          ← Verlassen
        </button>
        <div className="text-center">
          <div className="font-display font-semibold text-cream tracking-wide">{room.code}</div>
        </div>
        <ShareButton shareUrl={shareUrl} />
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-6 flex flex-col gap-5">
        <PokerTable room={room} players={players} selfPlayerId={self.id} />

        <ActionBar room={room} self={self} players={players} secret={identity.playerSecret} />

        {identity.hostSecret && <HostPanel room={room} players={players} hostSecret={identity.hostSecret} />}

        <HandHistoryPanel history={history} />
      </main>
    </div>
  )
}

function ShareButton({ shareUrl }: { shareUrl: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(shareUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="text-xs rounded-lg border border-brass/40 text-brasslight px-3 py-1.5 hover:bg-brass/10 transition-colors"
    >
      {copied ? 'Kopiert ✓' : 'Link teilen'}
    </button>
  )
}

function CenteredMessage({ text, isError }: { text: string; isError?: boolean }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <p className={`text-center ${isError ? 'text-danger' : 'text-muted'}`}>{text}</p>
    </div>
  )
}

function JoinExistingRoom({ code, onJoined }: { code: string; onJoined: (identity: LocalIdentity) => void }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Bitte gib deinen Spielernamen ein.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const result = await joinRoom({ code, name: name.trim() })
      const identity: LocalIdentity = {
        roomId: result.room_id,
        roomCode: code.toUpperCase(),
        playerId: result.player_id,
        playerSecret: result.player_secret,
      }
      saveIdentity(identity)
      onJoined(identity)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Beitritt fehlgeschlagen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-panel border border-white/10 rounded-2xl p-6 shadow-card"
      >
        <h2 className="font-display text-xl font-semibold text-cream mb-1">Raum {code}</h2>
        <p className="text-muted text-sm mb-5">Gib deinen Namen ein, um beizutreten.</p>
        <input
          className="w-full rounded-xl bg-ink border border-white/10 px-4 py-3 text-cream mb-3 focus:border-brass/60"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Dein Name"
          maxLength={24}
          autoFocus
        />
        {error && <p className="text-danger text-sm mb-3">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-brass hover:bg-brasslight text-ink font-display font-semibold py-3 transition-colors disabled:opacity-50"
        >
          {busy ? 'Trete bei …' : 'Beitreten'}
        </button>
      </form>
    </div>
  )
}
