import { Player, Room } from '../types'
import PlayerSeat from './PlayerSeat'

interface Props {
  room: Room
  players: Player[]
  selfPlayerId: string
}

// Positioniert bis zu 6 Sitzplätze gleichmäßig auf einer Ellipse rund um den Tisch.
function seatStyle(seat: number, totalSeats: number): React.CSSProperties {
  // Seat 0 startet unten (Position des eigenen Spielers ist meist unten),
  // danach gegen den Uhrzeigersinn verteilt.
  const angle = Math.PI / 2 + (seat / totalSeats) * Math.PI * 2
  const rx = 44 // % horizontal
  const ry = 40 // % vertikal
  const left = 50 + rx * Math.cos(angle)
  const top = 50 + ry * Math.sin(angle)
  return { left: `${left}%`, top: `${top}%` }
}

export default function PokerTable({ room, players, selfPlayerId }: Props) {
  const totalSeats = room.player_count

  return (
    <div className="relative w-full aspect-[4/5] sm:aspect-[16/10] max-w-3xl mx-auto">
      <div className="absolute inset-[6%] rounded-[46%] bg-felt shadow-felt border-[3px] border-rail" />

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 text-center">
        <span className="text-[11px] uppercase tracking-[0.2em] text-cream/50">Hand #{room.hand_number}</span>
        <span
          key={room.pot}
          className={`font-display font-bold text-3xl sm:text-4xl text-brasslight ${
            room.pot > 0 ? 'animate-potPulse' : ''
          }`}
        >
          {room.pot.toLocaleString('de-DE')}
        </span>
        <span className="text-[11px] text-cream/50 font-mono tabular">Pot</span>
        {room.small_blind > 0 || room.big_blind > 0 ? (
          <span className="mt-1 text-[11px] text-cream/40 font-mono tabular">
            Blinds {room.small_blind}/{room.big_blind}
          </span>
        ) : null}
        {!room.hand_active && (
          <span className="mt-1 text-[10px] uppercase tracking-wide text-muted">Zwischen den Händen</span>
        )}
      </div>

      {players.map((p) => (
        <PlayerSeat
          key={p.id}
          player={p}
          room={room}
          isSelf={p.id === selfPlayerId}
          style={seatStyle(p.seat, totalSeats)}
        />
      ))}
    </div>
  )
}
