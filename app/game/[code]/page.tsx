"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPusherClient } from "@/lib/pusher";

interface PlayerState { id: string; name: string; isHost: boolean; hasAnswered: boolean; votes: number; }
interface GameAssigned { heroId: string; heroName: string; isSpy: boolean; hint: string | null; }
interface AnswerRecord { playerName: string; answer: string; }
interface RevealData { spyId: string; spyName: string; players: { id: string; name: string; heroName: string; isSpy: boolean; }[]; }

export default function GamePage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [myId, setMyId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [mode, setMode] = useState<"vote" | "simple" | null>(null);
  const [rounds, setRounds] = useState(3);
  const [currentRound, setCurrentRound] = useState(1);
  const [assigned, setAssigned] = useState<GameAssigned | null>(null);
  const [waitingAssign, setWaitingAssign] = useState(true);
  const [votingOpen, setVotingOpen] = useState(false);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<RevealData | null>(null);
  const [gameOver, setGameOver] = useState(false);
  // Vote mode: answer recording
  const [answers, setAnswers] = useState<Record<string, AnswerRecord[]>>({}); // playerName -> answers
  const [recordingFor, setRecordingFor] = useState<string | null>(null);
  const [recordText, setRecordText] = useState("");
  const [showHint, setShowHint] = useState(false);
  const pusherRef = useRef<ReturnType<typeof getPusherClient> | null>(null);

  useEffect(() => {
    const id = localStorage.getItem(`player_${code}`);
    if (!id) { router.push("/"); return; }
    setMyId(id);

    // Get lobby state first
    fetch(`/api/lobby/state?code=${code}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { router.push("/"); return; }
        setMode(data.mode);
        setRounds(data.rounds);
        setCurrentRound(data.currentRound);
        setPlayers(data.players);
        setVotingOpen(data.votingOpen);
        const me = data.players.find((p: PlayerState) => p.id === id);
        setIsHost(me?.isHost || false);
        if (data.status === "waiting") router.push(`/lobby/${code}`);
      });

    // Fetch personal assignment (handles Pusher race condition — event fires before subscription)
    fetch(`/api/game/my-role?code=${code}&playerId=${id}`)
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          setAssigned(data);
          setWaitingAssign(false);
        }
      });

    const pusher = getPusherClient();
    pusherRef.current = pusher;

    // Subscribe to lobby channel (public events)
    const lobbyChannel = pusher.subscribe(`lobby-${code}`);
    lobbyChannel.bind("game-started", (data: any) => {
      setMode(data.mode);
      setRounds(data.rounds);
      setCurrentRound(data.currentRound);
      setPlayers(data.players);
    });
    lobbyChannel.bind("player-answered", (data: { players: PlayerState[]; allAnswered: boolean }) => {
      setPlayers(data.players);
    });
    lobbyChannel.bind("voting-opened", (data: { players: PlayerState[] }) => {
      setVotingOpen(true);
      setMyVote(null);
      setPlayers(data.players);
    });
    lobbyChannel.bind("vote-updated", (data: { players: PlayerState[] }) => {
      setPlayers(data.players);
    });
    lobbyChannel.bind("round-started", (data: { currentRound: number }) => {
      setCurrentRound(data.currentRound);
      setVotingOpen(false);
      setMyVote(null);
      setRevealed(null);
      setShowHint(false);
    });
    lobbyChannel.bind("spy-revealed", (data: RevealData) => {
      setRevealed(data);
    });
    lobbyChannel.bind("game-finished", () => {
      setGameOver(true);
    });
    lobbyChannel.bind("player-kicked", (data: { kickedId: string; players: PlayerState[] }) => {
      setPlayers(data.players);
      if (data.kickedId === id) { alert("Тебя кикнули"); router.push("/"); }
    });

    // Subscribe to private player channel for hero assignment
    const playerChannel = pusher.subscribe(`player-${code}-${id}`);
    playerChannel.bind("game-assigned", (data: GameAssigned) => {
      setAssigned(data);
      setWaitingAssign(false);
    });

    return () => {
      lobbyChannel.unbind_all();
      playerChannel.unbind_all();
      pusher.unsubscribe(`lobby-${code}`);
      pusher.unsubscribe(`player-${code}-${id}`);
    };
  }, [code, router]);

  async function markAnswered() {
    await fetch("/api/game/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, playerId: myId, action: "answered" }) });
  }

  async function openVoting() {
    await fetch("/api/game/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, playerId: myId, action: "open-voting" }) });
  }

  async function castVote(targetId: string) {
    if (myVote) return;
    setMyVote(targetId);
    await fetch("/api/game/vote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, voterId: myId, targetId }) });
  }

  async function revealSpy() {
    await fetch("/api/game/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, playerId: myId, action: "reveal" }) });
  }

  async function nextRound() {
    await fetch("/api/game/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, playerId: myId, action: "next-round" }) });
  }

  function addAnswer(playerName: string) {
    if (!recordText.trim()) return;
    setAnswers(prev => ({
      ...prev,
      [playerName]: [...(prev[playerName] || []), { playerName, answer: recordText.trim() }]
    }));
    setRecordText("");
    setRecordingFor(null);
  }

  const myPlayer = players.find(p => p.id === myId);
  const isMeAnswered = myPlayer?.hasAnswered || false;

  // Styles
  const cardStyle = { background: "#0d1320", border: "1px solid #1e2a3a", borderRadius: 16, padding: "1.25rem" };

  // GAME OVER / RESULTS
  if (gameOver && revealed) {
    return (
      <main style={{ minHeight: "100vh", background: "#080b12", padding: "1.5rem 1rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🎭</div>
          <h2 style={{ fontFamily: "'Cinzel', serif", color: "#c8a84b", fontSize: "2rem", marginBottom: "0.5rem" }}>Игра окончена!</h2>
          <div style={{ ...cardStyle, marginBottom: "1rem" }}>
            {revealed.players.map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.6rem 0.75rem", background: p.isSpy ? "rgba(139,26,26,0.2)" : "rgba(255,255,255,0.03)", borderRadius: 10, marginBottom: "0.4rem", border: p.isSpy ? "1px solid #8b1a1a" : "1px solid transparent" }}>
                <span style={{ color: p.id === myId ? "#c8a84b" : "#c9d1e0", fontWeight: p.isSpy ? 700 : 400 }}>
                  {p.isSpy ? "🕵️ " : ""}{p.name}{p.id === myId ? " (ты)" : ""}
                </span>
                <span style={{ color: p.isSpy ? "#e74c3c" : "#4a5568", fontSize: "0.85rem" }}>{p.isSpy ? "ШПИОН" : p.heroName}</span>
              </div>
            ))}
          </div>
          <button onClick={() => router.push("/")} style={{ padding: "0.75rem 2rem", background: "#c8a84b", color: "#080b12", border: "none", borderRadius: 12, fontSize: "1rem", fontWeight: 700, fontFamily: "'Cinzel', serif", cursor: "pointer" }}>
            На главную
          </button>
        </div>
      </main>
    );
  }

  // REVEAL SCREEN
  if (revealed) {
    return (
      <main style={{ minHeight: "100vh", background: "#080b12", padding: "1.5rem 1rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🕵️</div>
          <h2 style={{ fontFamily: "'Cinzel', serif", color: "#e74c3c", fontSize: "1.8rem", marginBottom: "0.25rem" }}>Шпион раскрыт!</h2>
          <p style={{ color: "#4a5568", marginBottom: "1.5rem" }}>
            Шпион был — <span style={{ color: "#c8a84b", fontWeight: 700 }}>{revealed.spyName}</span>
          </p>
          <div style={{ ...cardStyle, marginBottom: "1rem" }}>
            {revealed.players.map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.6rem 0.75rem", background: p.isSpy ? "rgba(139,26,26,0.2)" : "rgba(255,255,255,0.03)", borderRadius: 10, marginBottom: "0.4rem", border: p.isSpy ? "1px solid #8b1a1a" : "1px solid transparent" }}>
                <span style={{ color: p.id === myId ? "#c8a84b" : "#c9d1e0" }}>{p.isSpy ? "🕵️ " : ""}{p.name}{p.id === myId ? " (ты)" : ""}</span>
                <span style={{ color: p.isSpy ? "#e74c3c" : "#4a5568", fontSize: "0.85rem" }}>{p.isSpy ? "ШПИОН" : p.heroName}</span>
              </div>
            ))}
          </div>
          {isHost && !gameOver && (
            <div style={{ display: "flex", gap: "0.75rem" }}>
              {currentRound < rounds && (
                <button onClick={nextRound} style={{ flex: 1, padding: "0.75rem", background: "#c8a84b", color: "#080b12", border: "none", borderRadius: 12, fontSize: "0.9rem", fontWeight: 700, fontFamily: "'Cinzel', serif", cursor: "pointer" }}>
                  Следующий раунд ▶
                </button>
              )}
              <button onClick={() => { fetch("/api/game/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, playerId: myId, action: "next-round" }) }).then(r => r.json()).then(d => { if (d.finished) setGameOver(true); }); }} style={{ flex: 1, padding: "0.75rem", background: "rgba(192,57,43,0.2)", color: "#e74c3c", border: "1px solid #c0392b", borderRadius: 12, fontSize: "0.9rem", fontWeight: 700, fontFamily: "'Cinzel', serif", cursor: "pointer" }}>
                Завершить игру
              </button>
            </div>
          )}
        </div>
      </main>
    );
  }

  // WAITING FOR ASSIGNMENT
  if (waitingAssign) {
    return (
      <main style={{ minHeight: "100vh", background: "#080b12", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚔️</div>
          <h2 style={{ fontFamily: "'Cinzel', serif", color: "#c8a84b" }}>Раздача ролей...</h2>
          <p style={{ color: "#4a5568", marginTop: "0.5rem" }}>ИИ генерирует подсказки</p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#080b12", padding: "1rem", fontFamily: "'Rajdhani', sans-serif" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <span style={{ fontFamily: "'Cinzel', serif", color: "#c8a84b", fontSize: "1.1rem", fontWeight: 700 }}>{code}</span>
            <span style={{ color: "#4a5568", fontSize: "0.85rem", marginLeft: "0.5rem" }}>·</span>
            <span style={{ color: "#4a5568", fontSize: "0.85rem", marginLeft: "0.5rem" }}>Раунд {currentRound}/{rounds}</span>
          </div>
          <div style={{ fontSize: "0.75rem", color: "#4a5568" }}>
            {mode === "vote" ? "🗳️ Голосование" : "🃏 Простой"}
          </div>
        </div>

        {/* My hero card */}
        {assigned && (
          <div style={{ ...cardStyle, marginBottom: "1rem", background: assigned.isSpy ? "rgba(139,26,26,0.15)" : "rgba(200,168,75,0.05)", border: assigned.isSpy ? "1px solid #8b1a1a" : "1px solid rgba(200,168,75,0.3)", textAlign: "center" }}>
            {assigned.isSpy ? (
              <>
                <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🕵️</div>
                <h2 style={{ fontFamily: "'Cinzel', serif", color: "#e74c3c", fontSize: "1.8rem", margin: "0 0 0.5rem" }}>ТЫ ШПИОН</h2>
                <p style={{ color: "#4a5568", fontSize: "0.9rem" }}>Пытайся не раскрыться. Отвечай уклончиво!</p>
              </>
            ) : (
              <>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4a5568", marginBottom: "0.5rem" }}>Твой герой</div>
                <h2 style={{ fontFamily: "'Cinzel', serif", color: "#c8a84b", fontSize: "1.8rem", margin: "0 0 0.75rem" }}>{assigned.heroName}</h2>
                {assigned.hint && (
                  <>
                    <button onClick={() => setShowHint(!showHint)} style={{ background: "rgba(200,168,75,0.1)", border: "1px solid rgba(200,168,75,0.3)", borderRadius: 8, padding: "0.4rem 0.75rem", color: "#c8a84b", cursor: "pointer", fontSize: "0.8rem", fontFamily: "inherit", marginBottom: "0.75rem" }}>
                      {showHint ? "🙈 Скрыть подсказку" : "💡 Показать подсказку ИИ"}
                    </button>
                    {showHint && (
                      <div style={{ background: "rgba(200,168,75,0.05)", border: "1px solid rgba(200,168,75,0.15)", borderRadius: 10, padding: "0.75rem", fontSize: "0.9rem", color: "#c9d1e0", textAlign: "left", lineHeight: 1.5 }}>
                        {assigned.hint}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* VOTE MODE */}
        {mode === "vote" && !votingOpen && (
          <>
            {/* Players with answered status + answer recording */}
            <div style={{ ...cardStyle, marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4a5568", marginBottom: "0.75rem" }}>Игроки</div>
              {players.map(p => (
                <div key={p.id} style={{ marginBottom: "0.6rem" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 0.75rem", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid #1e2a3a" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "0.7rem" }}>{p.hasAnswered ? "✅" : "⏳"}</span>
                      <span style={{ color: p.id === myId ? "#c8a84b" : "#c9d1e0", fontSize: "0.9rem" }}>{p.name}{p.id === myId ? " (ты)" : ""}</span>
                    </div>
                    {p.id !== myId && (
                      <button onClick={() => setRecordingFor(recordingFor === p.id ? null : p.id)} style={{ background: "rgba(26,110,181,0.15)", border: "1px solid #1a6eb5", borderRadius: 6, padding: "0.2rem 0.5rem", color: "#3498db", cursor: "pointer", fontSize: "0.7rem", fontFamily: "inherit" }}>
                        📝 Записать
                      </button>
                    )}
                  </div>
                  {/* Record input */}
                  {recordingFor === p.id && (
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.35rem", padding: "0 0.25rem" }}>
                      <input value={recordText} onChange={e => setRecordText(e.target.value)} onKeyDown={e => e.key === "Enter" && addAnswer(p.name)} placeholder={`Ответ ${p.name}...`} style={{ flex: 1, background: "#080b12", border: "1px solid #1a6eb5", borderRadius: 8, padding: "0.4rem 0.7rem", color: "#c9d1e0", fontSize: "0.85rem", outline: "none", fontFamily: "inherit" }} autoFocus />
                      <button onClick={() => addAnswer(p.name)} style={{ background: "#1a6eb5", border: "none", borderRadius: 8, padding: "0.4rem 0.7rem", color: "#fff", cursor: "pointer", fontSize: "0.85rem", fontFamily: "inherit" }}>+</button>
                    </div>
                  )}
                  {/* Recorded answers */}
                  {(answers[p.name] || []).map((a, i) => (
                    <div key={i} style={{ marginTop: "0.25rem", padding: "0.3rem 0.75rem", background: "rgba(26,110,181,0.05)", borderRadius: 6, fontSize: "0.8rem", color: "#4a5568", display: "flex", justifyContent: "space-between" }}>
                      <span>«{a.answer}»</span>
                      <button onClick={() => setAnswers(prev => ({ ...prev, [p.name]: prev[p.name].filter((_, j) => j !== i) }))} style={{ background: "none", border: "none", color: "#c0392b", cursor: "pointer", fontSize: "0.8rem", padding: 0 }}>×</button>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* My answered button */}
            {!isMeAnswered ? (
              <button onClick={markAnswered} style={{ width: "100%", padding: "1rem", background: "#c8a84b", color: "#080b12", border: "none", borderRadius: 12, fontSize: "1rem", fontWeight: 700, fontFamily: "'Cinzel', serif", letterSpacing: "0.05em", cursor: "pointer", marginBottom: "0.75rem" }}>
                ✅ Я ответил
              </button>
            ) : (
              <div style={{ textAlign: "center", color: "#4a5568", fontSize: "0.9rem", padding: "0.75rem", marginBottom: "0.75rem" }}>✅ Ты ответил — ждём остальных</div>
            )}

            {/* Host controls */}
            {isHost && (
              <button onClick={openVoting} style={{ width: "100%", padding: "0.75rem", background: "rgba(192,57,43,0.15)", color: "#e74c3c", border: "1px solid #c0392b", borderRadius: 12, fontSize: "0.9rem", fontWeight: 700, fontFamily: "'Cinzel', serif", cursor: "pointer", marginBottom: "0.75rem" }}>
                🗳️ Открыть голосование
              </button>
            )}
          </>
        )}

        {/* VOTING PHASE */}
        {mode === "vote" && votingOpen && !revealed && (
          <div style={{ ...cardStyle, marginBottom: "1rem" }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#e74c3c", marginBottom: "0.75rem" }}>🗳️ Голосование — кто шпион?</div>
            {players.filter(p => p.id !== myId).map(p => (
              <button key={p.id} onClick={() => castVote(p.id)} disabled={!!myVote} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "0.75rem", background: myVote === p.id ? "rgba(192,57,43,0.2)" : "rgba(255,255,255,0.03)", border: `1px solid ${myVote === p.id ? "#c0392b" : "#1e2a3a"}`, borderRadius: 10, cursor: myVote ? "not-allowed" : "pointer", marginBottom: "0.5rem", color: "#c9d1e0", fontFamily: "inherit", fontSize: "0.95rem", textAlign: "left", transition: "all 0.15s" }}>
                <span>{p.name}</span>
                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {p.votes > 0 && <span style={{ background: "#c0392b", color: "#fff", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700 }}>{p.votes}</span>}
                  {myVote === p.id && <span style={{ color: "#e74c3c", fontSize: "0.8rem" }}>← твой голос</span>}
                </span>
              </button>
            ))}
            {myVote && <p style={{ color: "#4a5568", fontSize: "0.85rem", textAlign: "center", marginTop: "0.5rem" }}>Ты проголосовал</p>}
            {isHost && (
              <button onClick={revealSpy} style={{ width: "100%", padding: "0.75rem", background: "#c0392b", color: "#fff", border: "none", borderRadius: 10, fontSize: "0.9rem", fontWeight: 700, fontFamily: "'Cinzel', serif", cursor: "pointer", marginTop: "0.75rem" }}>
                👁️ Раскрыть шпиона
              </button>
            )}
          </div>
        )}

        {/* SIMPLE MODE */}
        {mode === "simple" && !revealed && (
          <div style={{ ...cardStyle, marginBottom: "1rem" }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4a5568", marginBottom: "0.75rem" }}>Все игроки</div>
            {players.map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", padding: "0.6rem 0.75rem", background: "rgba(255,255,255,0.03)", borderRadius: 10, marginBottom: "0.4rem", border: p.id === myId ? "1px solid rgba(200,168,75,0.3)" : "1px solid transparent" }}>
                <span style={{ color: p.id === myId ? "#c8a84b" : "#c9d1e0" }}>{p.name}{p.id === myId ? " (ты)" : ""}</span>
              </div>
            ))}
            {isHost && (
              <button onClick={revealSpy} style={{ width: "100%", padding: "0.75rem", background: "#c0392b", color: "#fff", border: "none", borderRadius: 10, fontSize: "0.9rem", fontWeight: 700, fontFamily: "'Cinzel', serif", cursor: "pointer", marginTop: "0.75rem" }}>
                👁️ Раскрыть шпиона
              </button>
            )}
          </div>
        )}

        {/* Host kick panel */}
        {isHost && (
          <div style={{ ...cardStyle }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4a5568", marginBottom: "0.75rem" }}>Управление игроками</div>
            {players.filter(p => !p.isHost).map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 0.75rem", background: "rgba(255,255,255,0.02)", borderRadius: 10, marginBottom: "0.4rem" }}>
                <span style={{ color: "#c9d1e0", fontSize: "0.9rem" }}>{p.name}</span>
                <button onClick={async () => { await fetch("/api/game/kick", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, hostId: myId, targetId: p.id }) }); }} style={{ background: "rgba(192,57,43,0.15)", border: "1px solid #c0392b", borderRadius: 6, padding: "0.2rem 0.5rem", color: "#e74c3c", cursor: "pointer", fontSize: "0.7rem", fontFamily: "inherit" }}>Кик</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
