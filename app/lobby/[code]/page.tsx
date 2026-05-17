"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPusherClient } from "@/lib/pusher";

interface PlayerInfo { id: string; name: string; isHost: boolean; }

function CornerOrnament() {
  return (
    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="28" height="28">
      <path d="M2 14 L2 2 L14 2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 14 L5 5 L14 5" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
      <path d="M5 5 L8 2 L11 5 L8 8 Z" fill="currentColor" opacity="0.9" />
      <path d="M7 4 L8 3 L9 4 L8 5 Z" fill="#000" opacity="0.5" />
      <path d="M14 5 Q18 5 20 9 Q21 12 22 14" stroke="currentColor" strokeWidth="0.7" opacity="0.65" fill="none" />
      <circle cx="22" cy="14" r="1.2" fill="currentColor" opacity="0.85" />
      <path d="M5 14 Q5 18 9 20 Q12 21 14 22" stroke="currentColor" strokeWidth="0.7" opacity="0.65" fill="none" />
      <circle cx="14" cy="22" r="1.2" fill="currentColor" opacity="0.85" />
    </svg>
  );
}

function Corners() {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", color: "#c8a84b" }} aria-hidden="true">
      <div style={{ position: "absolute", top: -2, left: -2 }}><CornerOrnament /></div>
      <div style={{ position: "absolute", top: -2, right: -2, transform: "scaleX(-1)" }}><CornerOrnament /></div>
      <div style={{ position: "absolute", bottom: -2, left: -2, transform: "scaleY(-1)" }}><CornerOrnament /></div>
      <div style={{ position: "absolute", bottom: -2, right: -2, transform: "scale(-1,-1)" }}><CornerOrnament /></div>
    </div>
  );
}

function SpyDotaCrest({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: "drop-shadow(0 2px 0 #000) drop-shadow(0 0 8px rgba(240,192,64,0.3))", flexShrink: 0 }}>
      <defs>
        <linearGradient id="crestGoldL" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8e29b" />
          <stop offset="0.5" stopColor="#c8a84b" />
          <stop offset="1" stopColor="#5c4818" />
        </linearGradient>
      </defs>
      <path d="M32 2 L58 16 L58 48 L32 62 L6 48 L6 16 Z" fill="#0a0d12" stroke="url(#crestGoldL)" strokeWidth="2" />
      <path d="M32 7 L54 18 L54 46 L32 57 L10 46 L10 18 Z" stroke="url(#crestGoldL)" strokeWidth="0.7" fill="none" opacity="0.6" />
      <path d="M14 32 Q32 18 50 32 Q32 46 14 32 Z" fill="#1a0606" stroke="#a3251e" strokeWidth="1" />
      <circle cx="32" cy="32" r="7" fill="#d8362c" />
      <circle cx="32" cy="32" r="3" fill="#fff" opacity="0.85" />
      <circle cx="32" cy="32" r="1.4" fill="#0a0306" />
      <path d="M10 50 L24 36" stroke="url(#crestGoldL)" strokeWidth="1.6" />
      <path d="M54 50 L40 36" stroke="url(#crestGoldL)" strokeWidth="1.6" />
    </svg>
  );
}

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

    const pusher = getPusherClient();
    const channel = pusher.subscribe(`lobby-${code}`);
    channel.bind("player-joined", (data: { players: PlayerInfo[] }) => { setPlayers(data.players); });
    channel.bind("settings-updated", (data: { mode: "vote" | "simple"; rounds: number }) => { setMode(data.mode); setRounds(data.rounds); });
    channel.bind("player-kicked", (data: { kickedId: string; players: PlayerInfo[] }) => {
      setPlayers(data.players);
      if (data.kickedId === id) { alert("Тебя кикнули из лобби"); router.push("/"); }
    });
    channel.bind("game-started", () => { router.push(`/game/${code}`); });

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

  const canStart = !!mode && players.length >= 2 && !loading;

  return (
    <>
      <div className="stage-bg" />
      <main style={{ minHeight: "100vh", padding: "1rem" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>

          {/* Top bar */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 18px", marginBottom: 18,
            background: "linear-gradient(180deg, #1a232f 0%, #0c1117 100%)",
            border: "1px solid #2a2418",
            boxShadow: "inset 0 0 0 1px rgba(200,168,75,0.35), inset 0 1px 0 rgba(255,220,150,0.1), 0 4px 16px rgba(0,0,0,0.6)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <SpyDotaCrest size={36} />
              <div>
                <div className="display heading-gold" style={{ fontSize: 16, letterSpacing: ".22em" }}>SPY DOTA</div>
                <div className="mono" style={{ fontSize: 9, color: "var(--text-mute)", letterSpacing: ".2em" }}>СОЦИАЛЬНАЯ ДЕДУКЦИЯ</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
              <div className="mono" style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: ".1em" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--teal-bright)", boxShadow: "0 0 8px var(--teal-bright)", display: "inline-block", marginRight: 6 }} />
                ПОДКЛЮЧЕНО
              </div>
              <div className="mono" style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: ".1em" }}>
                ИГРОКИ · <span style={{ color: "var(--gold)" }}>{players.length}/6</span>
              </div>
            </div>
          </div>

          <div className="lobby-grid">

            {/* MAIN — players + settings */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Players panel */}
              <div className="panel" style={{ padding: "22px 24px" }}>
                <Corners />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div className="dota-label" style={{ margin: 0 }}>СОВЕТ · ИГРОКИ ({players.length}/6)</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {players.map(p => (
                    <div key={p.id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 14px",
                      background: p.id === myId ? "rgba(200,168,75,0.08)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${p.id === myId ? "rgba(200,168,75,0.35)" : "#1c2530"}`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: "50%",
                          background: "var(--teal-bright)", boxShadow: "0 0 6px var(--teal-bright)",
                        }} />
                        <span style={{ fontFamily: "'Cinzel', serif", fontSize: 13, letterSpacing: ".12em", color: p.id === myId ? "var(--gold-bright)" : "var(--parchment)", fontWeight: p.id === myId ? 700 : 400 }}>
                          {p.isHost ? "👑 " : ""}{p.name.toUpperCase()}{p.id === myId ? " (ТЫ)" : ""}
                        </span>
                        {p.isHost && (
                          <span className="mono" style={{ fontSize: 9, padding: "2px 6px", background: "rgba(240,192,64,0.12)", color: "var(--gold-bright)", border: "1px solid rgba(240,192,64,0.4)", letterSpacing: ".2em" }}>ХОСТ</span>
                        )}
                      </div>
                      {isHost && !p.isHost && p.id !== myId && (
                        <button
                          className="dota-btn danger sm"
                          onClick={async () => {
                            await fetch("/api/game/kick", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, hostId: myId, targetId: p.id }) });
                          }}
                        >
                          КИК
                        </button>
                      )}
                    </div>
                  ))}
                  {players.length === 0 && (
                    <div style={{ color: "var(--text-dim)", textAlign: "center", padding: "1.5rem", fontFamily: "'Marcellus', serif", fontStyle: "italic" }}>
                      Ожидание игроков…
                    </div>
                  )}
                </div>
              </div>

              {/* Settings — host only */}
              {isHost && (
                <div className="panel" style={{ padding: "22px 24px" }}>
                  <Corners />
                  <div className="dota-label" style={{ marginBottom: 16 }}>НАСТРОЙКИ ИГРЫ</div>

                  {/* Mode */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontFamily: "'Marcellus', serif", fontSize: 14, color: "var(--parchment)", marginBottom: 10 }}>Режим игры</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {([
                        { id: "vote", icon: "🗳️", label: "Голосование", desc: "Кнопки ответил, запись и голосование" },
                        { id: "simple", icon: "🃏", label: "Простой", desc: "Только карточки с героями" },
                      ] as const).map(m => (
                        <button
                          key={m.id}
                          onClick={() => { setMode(m.id); saveSettings(m.id, rounds); }}
                          style={{
                            padding: "14px", textAlign: "left", cursor: "pointer",
                            background: mode === m.id ? "rgba(200,168,75,0.12)" : "rgba(255,255,255,0.02)",
                            border: `1px solid ${mode === m.id ? "var(--gold)" : "#1c2530"}`,
                            boxShadow: mode === m.id ? "inset 0 0 0 1px rgba(240,192,64,0.4), 0 0 16px rgba(240,192,64,0.15)" : "none",
                            transition: "all .15s ease",
                          }}
                        >
                          <div style={{ fontSize: 20, marginBottom: 6 }}>{m.icon}</div>
                          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 12, letterSpacing: ".15em", color: mode === m.id ? "var(--gold-bright)" : "var(--parchment)" }}>{m.label.toUpperCase()}</div>
                          <div style={{ fontFamily: "'Marcellus', serif", fontSize: 12, color: "var(--text-dim)", marginTop: 4, fontStyle: "italic" }}>{m.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Rounds */}
                  <div>
                    <div style={{ fontFamily: "'Marcellus', serif", fontSize: 14, color: "var(--parchment)", marginBottom: 10 }}>
                      Раундов: <span style={{ color: "var(--gold-bright)", fontFamily: "'Cinzel', serif", fontWeight: 700 }}>{rounds}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {[1, 2, 3, 4, 5, 7, 10].map(n => (
                        <button
                          key={n}
                          onClick={() => { setRounds(n); saveSettings(mode, n); }}
                          style={{
                            flex: 1, padding: "8px 4px",
                            background: rounds === n ? "rgba(200,168,75,0.15)" : "rgba(255,255,255,0.02)",
                            border: `1px solid ${rounds === n ? "var(--gold)" : "#1c2530"}`,
                            cursor: "pointer",
                            fontFamily: "'Cinzel', serif", fontSize: 13, fontWeight: 700,
                            color: rounds === n ? "var(--gold-bright)" : "var(--text-dim)",
                            transition: "all .15s ease",
                          }}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Mode display for guests */}
              {!isHost && mode && (
                <div className="panel" style={{ padding: "16px 20px", textAlign: "center" }}>
                  <Corners />
                  <span className="mono" style={{ fontSize: 11, color: "var(--text-dim)" }}>РЕЖИМ: </span>
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: "var(--gold-bright)", letterSpacing: ".1em" }}>{mode === "vote" ? "ГОЛОСОВАНИЕ" : "ПРОСТОЙ"}</span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--text-dim)" }}> · РАУНДОВ: </span>
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: "var(--gold-bright)", letterSpacing: ".1em" }}>{rounds}</span>
                </div>
              )}

              {!isHost && !mode && (
                <div className="panel" style={{ padding: "16px 20px", textAlign: "center", fontFamily: "'Marcellus', serif", fontStyle: "italic", color: "var(--text-dim)", fontSize: 15 }}>
                  <Corners />
                  ⏳ Хост настраивает игру…
                </div>
              )}

              {error && (
                <div style={{ background: "rgba(163,37,30,0.15)", color: "#ff6b5e", border: "1px solid #a3251e", padding: "10px 14px", fontSize: 14, fontFamily: "'Marcellus', serif" }}>
                  {error}
                </div>
              )}
            </div>

            {/* SIDEBAR */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Minimap room code */}
              <div className="panel" style={{ padding: 18 }}>
                <Corners />
                <div className="dota-label" style={{ textAlign: "center" }}>КОД КОМНАТЫ</div>
                <div style={{
                  position: "relative", marginTop: 10, padding: "18px 10px",
                  background: "radial-gradient(circle at center, #0a1f1f 0%, #050a0a 80%)",
                  border: "1px solid var(--teal)",
                  boxShadow: "inset 0 0 0 1px rgba(75,224,214,0.3), inset 0 0 30px rgba(0,0,0,0.8)",
                }}>
                  {/* Grid */}
                  <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(75,224,214,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(75,224,214,0.08) 1px, transparent 1px)", backgroundSize: "14px 14px", pointerEvents: "none" }} />
                  {/* River */}
                  <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.35 }}>
                    <svg viewBox="0 0 200 80" preserveAspectRatio="none" width="100%" height="100%">
                      <path d="M0 60 Q60 40 100 50 T 200 30" stroke="#1ea3a3" strokeWidth="6" fill="none" opacity="0.7" />
                      <path d="M0 60 Q60 40 100 50 T 200 30" stroke="#4be0d6" strokeWidth="1" fill="none" />
                    </svg>
                  </div>
                  {/* Corner pings */}
                  <div style={{ position: "absolute", left: 8, top: 8, width: 6, height: 6, background: "var(--teal-bright)", borderRadius: "50%", boxShadow: "0 0 8px var(--teal-bright)" }} />
                  <div style={{ position: "absolute", right: 8, bottom: 8, width: 6, height: 6, background: "var(--gold-bright)", borderRadius: "50%", boxShadow: "0 0 8px var(--gold-bright)" }} />
                  <div style={{ position: "relative", textAlign: "center" }}>
                    <div className="mono heading-gold" style={{ fontSize: 42, letterSpacing: ".15em", fontWeight: 900 }}>{code}</div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--teal-bright)", letterSpacing: ".25em", marginTop: 2 }}>ЗАЩИЩЁННЫЙ КАНАЛ</div>
                  </div>
                </div>
                <button
                  className="dota-btn sm"
                  style={{ width: "100%", marginTop: 12 }}
                  onClick={copyCode}
                >
                  {copied ? "✓ СКОПИРОВАНО" : "СКОПИРОВАТЬ КОД"}
                </button>
              </div>

              {/* Info */}
              <div className="panel" style={{ padding: "14px 18px" }}>
                <Corners />
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="mono" style={{ fontSize: 10, color: "var(--text-mute)", letterSpacing: ".2em" }}>ИГРОКОВ</span>
                    <span className="display heading-gold" style={{ fontSize: 18 }}>{players.length}/6</span>
                  </div>
                  <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(200,168,75,0.4), transparent)" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="mono" style={{ fontSize: 10, color: "var(--text-mute)", letterSpacing: ".2em" }}>МИНИМУМ</span>
                    <span className="display" style={{ fontSize: 14, color: players.length >= 2 ? "var(--teal-bright)" : "var(--text-dim)" }}>
                      {players.length >= 2 ? "✦ ГОТОВО" : `НУЖНО ЕЩЁ ${2 - players.length}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Start / waiting */}
              {isHost ? (
                <button
                  className={`dota-btn${canStart ? " primary" : ""}`}
                  style={{ width: "100%", padding: "18px" }}
                  onClick={startGame}
                  disabled={!canStart}
                >
                  ⚔ НАЧАТЬ МАТЧ
                </button>
              ) : (
                <div style={{ textAlign: "center", padding: "18px", fontFamily: "'Marcellus', serif", fontStyle: "italic", color: "var(--text-dim)", fontSize: 15 }}>
                  ⏳ Ожидание хоста…
                </div>
              )}

              <button
                className="dota-btn danger sm"
                style={{ width: "100%" }}
                onClick={() => router.push("/")}
              >
                ПОКИНУТЬ ЛОББИ
              </button>
            </div>

          </div>
        </div>
      </main>
    </>
  );
}
