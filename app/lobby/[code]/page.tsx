"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPusherClient } from "@/lib/pusher";

interface PlayerInfo { id: string; name: string; isHost: boolean; }

export default function LobbyPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [myId, setMyId] = useState<string | null>(null);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [mode, setMode] = useState<"vote" | "simple" | null>(null);
  const [rounds, setRounds] = useState(3);
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = localStorage.getItem(`player_${code}`);
    if (!id) { router.push("/"); return; }
    setMyId(id);

    // Load initial state
    fetch(`/api/lobby/state?code=${code}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { router.push("/"); return; }
        setPlayers(data.players);
        setMode(data.mode);
        setRounds(data.rounds || 3);
        const me = data.players.find((p: PlayerInfo) => p.id === id);
        setIsHost(me?.isHost || false);
        if (data.status === "playing") router.push(`/game/${code}`);
      });

    // Subscribe to Pusher
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`lobby-${code}`);

    channel.bind("player-joined", (data: { players: PlayerInfo[] }) => {
      setPlayers(data.players);
    });
    channel.bind("settings-updated", (data: { mode: "vote" | "simple"; rounds: number }) => {
      setMode(data.mode);
      setRounds(data.rounds);
    });
    channel.bind("player-kicked", (data: { kickedId: string; players: PlayerInfo[] }) => {
      setPlayers(data.players);
      if (data.kickedId === id) { alert("Тебя кикнули из лобби"); router.push("/"); }
    });
    channel.bind("game-started", () => {
      router.push(`/game/${code}`);
    });

    return () => { channel.unbind_all(); pusher.unsubscribe(`lobby-${code}`); };
  }, [code, router]);

  async function saveSettings(newMode: "vote" | "simple" | null, newRounds: number) {
    if (!isHost || !newMode) return;
    await fetch("/api/lobby/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, playerId: myId, mode: newMode, rounds: newRounds }),
    });
  }

  async function startGame() {
    if (!mode) return setError("Выбери режим игры");
    if (players.length < 2) return setError("Нужно минимум 2 игрока");
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/game/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, playerId: myId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  function copyCode() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const s = { background: "#080b12", border: "1px solid #1e2a3a", borderRadius: 12, padding: "1rem" };

  return (
    <main style={{ minHeight: "100vh", background: "#080b12", padding: "1.5rem 1rem", fontFamily: "'Rajdhani', sans-serif" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "0.75rem", color: "#4a5568", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "0.5rem" }}>Лобби</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem" }}>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: "2.5rem", color: "#c8a84b", letterSpacing: "0.2em", fontWeight: 700 }}>{code}</span>
            <button onClick={copyCode} style={{ background: copied ? "rgba(200,168,75,0.2)" : "#0d1320", border: "1px solid #1e2a3a", borderRadius: 8, padding: "0.4rem 0.75rem", color: copied ? "#c8a84b" : "#4a5568", cursor: "pointer", fontSize: "0.8rem", fontFamily: "inherit" }}>
              {copied ? "✓ Скопировано" : "Скопировать"}
            </button>
          </div>
          <p style={{ color: "#4a5568", fontSize: "0.85rem", marginTop: "0.25rem" }}>Поделись кодом с друзьями</p>
        </div>

        {/* Players */}
        <div style={{ ...s, marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4a5568" }}>Игроки ({players.length}/6)</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {players.map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.6rem 0.75rem", background: p.id === myId ? "rgba(200,168,75,0.08)" : "rgba(255,255,255,0.03)", borderRadius: 10, border: p.id === myId ? "1px solid rgba(200,168,75,0.3)" : "1px solid transparent" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.85rem", color: p.id === myId ? "#c8a84b" : "#c9d1e0", fontWeight: p.id === myId ? 700 : 400 }}>
                    {p.isHost ? "👑 " : ""}{p.name}{p.id === myId ? " (ты)" : ""}
                  </span>
                </div>
                {isHost && !p.isHost && p.id !== myId && (
                  <button onClick={async () => {
                    await fetch("/api/game/kick", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, hostId: myId, targetId: p.id }) });
                  }} style={{ background: "rgba(192,57,43,0.15)", border: "1px solid #c0392b", borderRadius: 6, padding: "0.2rem 0.5rem", color: "#e74c3c", cursor: "pointer", fontSize: "0.7rem", fontFamily: "inherit" }}>
                    Кик
                  </button>
                )}
              </div>
            ))}
            {players.length === 0 && <div style={{ color: "#4a5568", textAlign: "center", padding: "1rem", fontSize: "0.9rem" }}>Ожидание игроков...</div>}
          </div>
        </div>

        {/* Settings (host only) */}
        {isHost && (
          <div style={{ ...s, marginBottom: "1rem" }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4a5568", marginBottom: "1rem" }}>Настройки игры</div>

            {/* Mode */}
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.85rem", color: "#c9d1e0", marginBottom: "0.5rem" }}>Режим игры</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                {([
                  { id: "vote", icon: "🗳️", label: "Голосование", desc: "Кнопки ответил, запись и голосование" },
                  { id: "simple", icon: "🃏", label: "Простой", desc: "Только карточки с героями" },
                ] as const).map(m => (
                  <button key={m.id} onClick={() => { setMode(m.id); saveSettings(m.id, rounds); }} style={{ padding: "0.75rem", background: mode === m.id ? "rgba(200,168,75,0.15)" : "rgba(255,255,255,0.03)", border: `1px solid ${mode === m.id ? "#c8a84b" : "#1e2a3a"}`, borderRadius: 10, cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}>
                    <div style={{ fontSize: "1.2rem", marginBottom: "0.25rem" }}>{m.icon}</div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: mode === m.id ? "#c8a84b" : "#c9d1e0", fontFamily: "inherit" }}>{m.label}</div>
                    <div style={{ fontSize: "0.7rem", color: "#4a5568", marginTop: "0.2rem", fontFamily: "inherit" }}>{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Rounds */}
            <div>
              <div style={{ fontSize: "0.85rem", color: "#c9d1e0", marginBottom: "0.5rem" }}>Раундов: <span style={{ color: "#c8a84b", fontWeight: 700 }}>{rounds}</span></div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {[1, 2, 3, 4, 5, 7, 10].map(n => (
                  <button key={n} onClick={() => { setRounds(n); saveSettings(mode, n); }} style={{ flex: 1, padding: "0.5rem", background: rounds === n ? "rgba(200,168,75,0.15)" : "rgba(255,255,255,0.03)", border: `1px solid ${rounds === n ? "#c8a84b" : "#1e2a3a"}`, borderRadius: 8, cursor: "pointer", color: rounds === n ? "#c8a84b" : "#c9d1e0", fontSize: "0.85rem", fontWeight: 700, fontFamily: "inherit" }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Settings display for non-host */}
        {!isHost && mode && (
          <div style={{ ...s, marginBottom: "1rem", textAlign: "center" }}>
            <span style={{ color: "#4a5568", fontSize: "0.85rem" }}>Режим: </span>
            <span style={{ color: "#c8a84b", fontWeight: 700 }}>{mode === "vote" ? "Голосование" : "Простой"}</span>
            <span style={{ color: "#4a5568", fontSize: "0.85rem" }}> · Раундов: </span>
            <span style={{ color: "#c8a84b", fontWeight: 700 }}>{rounds}</span>
          </div>
        )}

        {!isHost && !mode && (
          <div style={{ ...s, marginBottom: "1rem", textAlign: "center", color: "#4a5568", fontSize: "0.9rem" }}>
            ⏳ Хост настраивает игру...
          </div>
        )}

        {/* Error */}
        {error && <div style={{ background: "rgba(192,57,43,0.15)", color: "#e74c3c", border: "1px solid #c0392b", borderRadius: 10, padding: "0.6rem 1rem", fontSize: "0.9rem", marginBottom: "1rem" }}>{error}</div>}

        {/* Start button (host only) */}
        {isHost && (
          <button onClick={startGame} disabled={loading || !mode || players.length < 2} style={{ width: "100%", padding: "1rem", background: (!mode || players.length < 2 || loading) ? "#1e2a3a" : "#c8a84b", color: (!mode || players.length < 2 || loading) ? "#4a5568" : "#080b12", border: "none", borderRadius: 12, fontSize: "1rem", fontWeight: 700, fontFamily: "'Cinzel', serif", letterSpacing: "0.1em", cursor: (!mode || players.length < 2 || loading) ? "not-allowed" : "pointer", transition: "all 0.2s" }}>
            {loading ? "Запуск..." : "⚔️ Начать игру"}
          </button>
        )}

        {!isHost && (
          <div style={{ textAlign: "center", color: "#4a5568", fontSize: "0.9rem", padding: "1rem" }}>
            ⏳ Ожидание хоста...
          </div>
        )}
      </div>
    </main>
  );
}
