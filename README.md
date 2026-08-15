# Chip Table — Poker Chip Manager

Digitaler Chip-/Pot-/Stack-Manager für private Poker-Runden mit echten Karten
(Video via Discord). Kein Kartenspiel, keine Zufallslogik — nur Chips, Pot,
Blinds, Hand-Historie und Echtzeit-Sync zwischen Spielern.

## 1. Lokal starten

```bash
npm install
cp .env.example .env    # dann Werte aus Supabase eintragen (siehe unten)
npm run dev
```

Die App läuft dann auf http://localhost:5173

## 2. Supabase einrichten (kostenlos)

1. Auf https://supabase.com ein kostenloses Konto erstellen und ein neues
   Projekt anlegen (Region z. B. Frankfurt).
2. Im Dashboard: **SQL Editor → New query**.
3. Den kompletten Inhalt von `supabase/schema.sql` einfügen und **Run**
   klicken. Das legt alle Tabellen, Sicherheitsregeln (Row Level Security)
   und die serverseitigen Funktionen an, über die *alle* Spielaktionen
   laufen (Chips setzen, Hand starten, Pot auszahlen, Rebuy, …). Der Client
   kann Tabellen nur lesen, niemals direkt schreiben — Schreibzugriffe sind
   ausschließlich über diese geprüften Funktionen möglich. Das verhindert
   negative Stacks, doppeltes Auszahlen und manipulierte Chipstände.
4. **Project Settings → API**: dort stehen die `Project URL` und der
   `anon public` Key. Beide in die `.env`-Datei eintragen:

```
VITE_SUPABASE_URL=https://dein-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=dein-anon-key
```

5. **Database → Replication**: prüfen, dass `rooms`, `players` und
   `history` für Realtime aktiviert sind (das Schema-Skript macht das
   bereits automatisch über `alter publication supabase_realtime add table …`,
   ein Blick ins Dashboard schadet aber nicht).

Der `anon` Key ist bewusst öffentlich nutzbar — die eigentliche Absicherung
passiert über die RLS-Policies und die SECURITY DEFINER-Funktionen in der
Datenbank, nicht über Geheimhaltung des Keys.

## 3. Kostenlos deployen (Vercel)

1. Projekt in ein eigenes GitHub-Repository pushen.
2. Auf https://vercel.com mit GitHub anmelden, "New Project" und das Repo
   auswählen. Vercel erkennt Vite automatisch (Build Command `npm run build`,
   Output `dist`).
3. Unter **Environment Variables** dieselben zwei Werte wie in der `.env`
   eintragen (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
4. Deploy klicken. Fertig — die App ist unter einer `*.vercel.app`-Domain
   erreichbar und kostenlos.

## 4. Projektstruktur

```
src/
  lib/
    supabase.ts      Supabase-Client
    api.ts            RPC-Aufrufe (place_bet, start_new_hand, end_hand, …)
    storage.ts         Spieler-Identität pro Raum im localStorage
  hooks/
    useRoom.ts         Lädt Raum/Spieler/Historie + Realtime-Subscription
  pages/
    Home.tsx           Startseite: Raum erstellen / beitreten
    Room.tsx            Tisch-Ansicht (Route /room/:code)
  components/
    PokerTable.tsx      Visueller Tisch mit Pot in der Mitte
    PlayerSeat.tsx       Einzelner Sitzplatz
    ActionBar.tsx         Chip-Buttons + Bet/Call/Check/Raise/Fold/All-In
    HostPanel.tsx          Host-Steuerung
    HandHistoryPanel.tsx    Verlauf
supabase/
  schema.sql            Komplettes DB-Schema inkl. RPC-Funktionen
```

## 5. Wie die Sicherheit funktioniert (Punkt 15 aus der Anforderung)

- Row Level Security ist auf allen Tabellen aktiv. Der Client darf nur
  **lesen** (`select`), niemals direkt `insert`/`update`/`delete`.
- Jede Spielaktion läuft über eine `SECURITY DEFINER`-Postgres-Funktion
  (z. B. `place_bet`, `end_hand`, `rebuy`), die serverseitig prüft:
  - Stimmt das übermittelte Spieler-/Host-Secret?
  - Ist genug Stack für den Einsatz vorhanden (keine negativen Stacks)?
  - Läuft überhaupt eine aktive Hand (`hand_active`)?
  - Wurde der Pot schon ausgezahlt (`end_hand` schlägt beim zweiten Aufruf
    fehl, weil `hand_active` dann bereits `false` ist)?
- `place_bet` arbeitet mit einem **absoluten Zielbetrag** (nicht mit einer
  Differenz), dadurch ist ein doppelter Klick ungefährlich (idempotent).

## 6. Aktueller Stand / bewusste Vereinfachungen für die MVP-Version

- **Side Pots**: Noch nicht implementiert. Die Datenstruktur (`current_bet`
  pro Spieler pro Runde, Status `allin`) ist aber genau so aufgebaut, dass
  eine Side-Pot-Berechnung später als zusätzliche Funktion ergänzt werden
  kann, ohne das Schema zu ändern.
- **Turn-Order**: Wird bewusst NICHT im Client erzwungen, weil die
  eigentliche Spielreihenfolge über die physischen Karten am Tisch bzw. via
  Discord-Video gesteuert wird. Jeder aktive Spieler kann jederzeit seine
  Aktion eintragen, sobald er laut Tischrunde dran ist.
- **Kein Login**: Identität pro Raum wird über ein zufälliges Secret im
  `localStorage` des Browsers gespeichert. Wer den Browser wechselt oder
  den Verlauf löscht, muss dem Raum erneut beitreten (als neuer Spieler).

## 7. Später ergänzbar (Punkt 16)

Die Architektur (getrennte `lib/api.ts`, saubere RPC-Grenzen, `history`-
Tabelle mit `type`-Feld) ist so angelegt, dass sich Blind-Timer,
Turniermodus, Chip-Farben, mehrere Tische, Statistiken, Export der
Hand-History, Soundeffekte etc. ergänzen lassen, ohne bestehende Teile
umzubauen.
