"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPusherClient } from "@/lib/pusher";
import { UNIQUE_HEROES, RANGED_HERO_NAMES } from "@/lib/heroes";
import type { Hero } from "@/lib/heroes";
import SpyHintChat from "@/components/SpyHintChat";

interface PlayerState { id: string; name: string; isHost: boolean; hasAnswered: boolean; votes: number; }
interface GameAssigned { heroId: string; heroName: string; isSpy: boolean; hint: string | null; }
interface AnswerRecord { playerName: string; answer: string; }
interface RevealData { spyId: string; spyName: string; players: { id: string; name: string; heroName: string; isSpy: boolean; }[]; }

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

function Corners({ color = "#c8a84b" }: { color?: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", color }} aria-hidden="true">
      <div style={{ position: "absolute", top: -2, left: -2 }}><CornerOrnament /></div>
      <div style={{ position: "absolute", top: -2, right: -2, transform: "scaleX(-1)" }}><CornerOrnament /></div>
      <div style={{ position: "absolute", bottom: -2, left: -2, transform: "scaleY(-1)" }}><CornerOrnament /></div>
      <div style={{ position: "absolute", bottom: -2, right: -2, transform: "scale(-1,-1)" }}><CornerOrnament /></div>
    </div>
  );
}

const CDN_OVERRIDES: Record<string, string> = {
  cm: "crystal_maiden",
  drow: "drow_ranger",
  witch_doctor2: "enigma",
  lion2: "natures_prophet",
  razor2: "techies",
  clinkz2: "clinkz",
  ancient_apparition2: "ancient_apparition",
  underlord: "abyssal_underlord",
  icarus: "phoenix",
  outworld_destroyer: "obsidian_destroyer",
};

function heroIconUrl(heroId: string): string {
  const name = CDN_OVERRIDES[heroId] ?? heroId;
  return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${name}.png`;
}

function HeroIcon({ heroId, heroName }: { heroId: string; heroName: string }) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    <div style={{
      width: 80, height: 80,
      border: "1px solid rgba(200,168,75,0.5)",
      boxShadow: "0 0 20px rgba(200,168,75,0.2), inset 0 0 0 1px rgba(0,0,0,0.6)",
      overflow: "hidden",
      background: "rgba(0,0,0,0.4)",
      flexShrink: 0,
    }}>
      <img
        src={heroIconUrl(heroId)}
        alt={heroName}
        width={80}
        height={80}
        style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
        onError={() => setVisible(false)}
      />
    </div>
  );
}

function SpyDotaCrest({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none"
      style={{ filter: "drop-shadow(0 2px 0 #000) drop-shadow(0 0 8px rgba(240,192,64,0.3))", flexShrink: 0 }}>
      <defs>
        <linearGradient id="crestGoldG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8e29b" /><stop offset="0.5" stopColor="#c8a84b" /><stop offset="1" stopColor="#5c4818" />
        </linearGradient>
      </defs>
      <path d="M32 2 L58 16 L58 48 L32 62 L6 48 L6 16 Z" fill="#0a0d12" stroke="url(#crestGoldG)" strokeWidth="2" />
      <path d="M32 7 L54 18 L54 46 L32 57 L10 46 L10 18 Z" stroke="url(#crestGoldG)" strokeWidth="0.7" fill="none" opacity="0.6" />
      <path d="M14 32 Q32 18 50 32 Q32 46 14 32 Z" fill="#1a0606" stroke="#a3251e" strokeWidth="1" />
      <circle cx="32" cy="32" r="7" fill="#d8362c" />
      <circle cx="32" cy="32" r="3" fill="#fff" opacity="0.85" />
      <circle cx="32" cy="32" r="1.4" fill="#0a0306" />
      <path d="M10 50 L24 36" stroke="url(#crestGoldG)" strokeWidth="1.6" />
      <path d="M54 50 L40 36" stroke="url(#crestGoldG)" strokeWidth="1.6" />
    </svg>
  );
}

const HERO_ATTRS = [
  { key: "str" as const, label: "СИЛА", color: "#e05a5a", rgb: "224,90,90" },
  { key: "agi" as const, label: "ЛОВКОСТЬ", color: "#50c878", rgb: "80,200,120" },
  { key: "int" as const, label: "ИНТЕЛЛЕКТ", color: "#5090e0", rgb: "80,144,224" },
  { key: "univ" as const, label: "УНИВЕРСАЛ", color: "#c8a84b", rgb: "200,168,75" },
];

function SpyHeroTable() {
  const [open, setOpen] = useState(false);
  const [attackFilter, setAttackFilter] = useState<"all" | "melee" | "ranged">("all");
  const [crossed, setCrossed] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setCrossed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function getFiltered(attrKey: string): Hero[] {
    return UNIQUE_HEROES.filter(h => {
      if (h.attr !== attrKey) return false;
      if (attackFilter === "melee") return !RANGED_HERO_NAMES.has(h.name);
      if (attackFilter === "ranged") return RANGED_HERO_NAMES.has(h.name);
      return true;
    });
  }

  function toggleAttr(attrKey: string) {
    const heroes = getFiltered(attrKey);
    const allCrossed = heroes.every(h => crossed.has(h.id));
    setCrossed(prev => {
      const next = new Set(prev);
      if (allCrossed) heroes.forEach(h => next.delete(h.id));
      else heroes.forEach(h => next.add(h.id));
      return next;
    });
  }

  const totalCrossed = UNIQUE_HEROES.filter(h => crossed.has(h.id)).length;

  return (
    <div style={{ marginBottom: 14 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", padding: "11px 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "rgba(163,37,30,0.08)",
          border: "1px solid rgba(163,37,30,0.35)",
          cursor: "pointer",
        }}
      >
        <span style={{ fontFamily: "'Cinzel', serif", fontSize: 11, letterSpacing: ".2em", color: "#ff8b7e" }}>
          🔍 ЗАПИСНАЯ КНИЖКА
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {totalCrossed > 0 && (
            <span className="mono" style={{ fontSize: 10, color: "rgba(255,107,94,0.7)", letterSpacing: ".1em" }}>
              ✕{totalCrossed}/{UNIQUE_HEROES.length}
            </span>
          )}
          <span style={{ color: "#ff8b7e", fontSize: 11 }}>{open ? "▲" : "▼"}</span>
        </span>
      </button>

      {open && (
        <div style={{
          padding: "12px",
          border: "1px solid rgba(163,37,30,0.25)",
          borderTop: "none",
          background: "rgba(8,3,3,0.9)",
        }}>
          {/* Filter bar */}
          <div style={{ display: "flex", gap: 5, marginBottom: 12, alignItems: "center" }}>
            {(["all", "melee", "ranged"] as const).map(f => (
              <button key={f} onClick={() => setAttackFilter(f)} style={{
                padding: "5px 10px",
                background: attackFilter === f ? "rgba(163,37,30,0.3)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${attackFilter === f ? "#a3251e" : "#1c2530"}`,
                cursor: "pointer",
                fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: ".12em",
                color: attackFilter === f ? "#ff8b7e" : "var(--text-dim)",
              }}>
                {f === "all" ? "ВСЕ" : f === "melee" ? "⚔ БЛИЖНИК" : "🏹 ДАЛЬНИК"}
              </button>
            ))}
            <button
              onClick={() => setCrossed(new Set())}
              style={{
                marginLeft: "auto", padding: "5px 9px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid #1c2530",
                cursor: "pointer",
                fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: ".1em",
                color: "var(--text-mute)",
              }}
            >
              СБРОС
            </button>
          </div>

          {/* Attr groups */}
          {HERO_ATTRS.map(attr => {
            const heroes = getFiltered(attr.key);
            if (heroes.length === 0) return null;
            const allCrossed = heroes.every(h => crossed.has(h.id));
            return (
              <div key={attr.key} style={{ marginBottom: 12 }}>
                {/* Attr header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{
                    fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: ".18em",
                    color: allCrossed ? "rgba(255,107,94,0.3)" : attr.color,
                    textDecoration: allCrossed ? "line-through" : "none",
                  }}>
                    {attr.label}
                    <span className="mono" style={{ marginLeft: 6, fontSize: 9, opacity: 0.6 }}>
                      {heroes.filter(h => crossed.has(h.id)).length}/{heroes.length}
                    </span>
                  </span>
                  <button onClick={() => toggleAttr(attr.key)} style={{
                    padding: "2px 8px",
                    background: allCrossed ? "rgba(163,37,30,0.25)" : `rgba(${attr.rgb},0.08)`,
                    border: `1px solid ${allCrossed ? "#a3251e" : `rgba(${attr.rgb},0.35)`}`,
                    cursor: "pointer",
                    fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: ".1em",
                    color: allCrossed ? "#ff6b5e" : attr.color,
                  }}>
                    {allCrossed ? "↺ ВЕРНУТЬ" : "✕ ВСЕХ"}
                  </button>
                </div>

                {/* Hero chips */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 3 }}>
                  {heroes.map(hero => {
                    const isCrossed = crossed.has(hero.id);
                    const isRanged = RANGED_HERO_NAMES.has(hero.name);
                    return (
                      <button
                        key={hero.id}
                        onClick={() => toggle(hero.id)}
                        title={hero.name}
                        style={{
                          padding: "5px 7px",
                          background: isCrossed
                            ? "rgba(163,37,30,0.06)"
                            : `rgba(${attr.rgb},0.07)`,
                          border: `1px solid ${isCrossed ? "rgba(163,37,30,0.18)" : `rgba(${attr.rgb},0.22)`}`,
                          cursor: "pointer",
                          textAlign: "left",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          overflow: "hidden",
                          transition: "opacity .12s ease",
                        }}
                      >
                        <span style={{
                          fontSize: 9, flexShrink: 0,
                          opacity: isCrossed ? 0.25 : 0.7,
                        }}>
                          {isRanged ? "🏹" : "⚔"}
                        </span>
                        <span style={{
                          fontFamily: "'Cinzel', serif",
                          fontSize: 10,
                          letterSpacing: ".04em",
                          color: isCrossed ? "rgba(255,107,94,0.25)" : attr.color,
                          textDecoration: isCrossed ? "line-through" : "none",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          opacity: isCrossed ? 0.45 : 1,
                        }}>
                          {hero.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
  const [answers, setAnswers] = useState<Record<string, AnswerRecord[]>>({});
  const [recordingFor, setRecordingFor] = useState<string | null>(null);
  const [recordText, setRecordText] = useState("");
  const [showHint, setShowHint] = useState(false);
  const pusherRef = useRef<ReturnType<typeof getPusherClient> | null>(null);

  useEffect(() => {
    const id = localStorage.getItem(`player_${code}`);
    if (!id) { router.push("/"); return; }
    setMyId(id);

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

    function fetchMyRole() {
      fetch(`/api/game/my-role?code=${code}&playerId=${id}`)
        .then(r => r.json())
        .then(data => { if (!data.error) { setAssigned(data); setWaitingAssign(false); } });
    }
    fetchMyRole();

    const pusher = getPusherClient();
    pusherRef.current = pusher;

    const lobbyChannel = pusher.subscribe(`lobby-${code}`);
    lobbyChannel.bind("game-started", (data: any) => { setMode(data.mode); setRounds(data.rounds); setCurrentRound(data.currentRound); setPlayers(data.players); });
    lobbyChannel.bind("player-answered", (data: { players: PlayerState[] }) => { setPlayers(data.players); });
    lobbyChannel.bind("voting-opened", (data: { players: PlayerState[] }) => { setVotingOpen(true); setMyVote(null); setPlayers(data.players); });
    lobbyChannel.bind("vote-updated", (data: { players: PlayerState[] }) => { setPlayers(data.players); });
    lobbyChannel.bind("round-started", (data: { currentRound: number }) => {
      setCurrentRound(data.currentRound); setVotingOpen(false); setMyVote(null);
      setRevealed(null); setShowHint(false); setWaitingAssign(true); setAssigned(null);
      fetchMyRole();
    });
    lobbyChannel.bind("spy-revealed", (data: RevealData) => { setRevealed(data); });
    lobbyChannel.bind("game-finished", () => { setGameOver(true); });
    lobbyChannel.bind("game-restarted", () => { router.push(`/lobby/${code}`); });
    lobbyChannel.bind("player-kicked", (data: { kickedId: string; players: PlayerState[] }) => {
      setPlayers(data.players);
      if (data.kickedId === id) { alert("Тебя кикнули"); router.push("/"); }
    });

    const playerChannel = pusher.subscribe(`player-${code}-${id}`);
    playerChannel.bind("game-assigned", (data: GameAssigned) => { setAssigned(data); setWaitingAssign(false); });

    return () => { lobbyChannel.unbind_all(); playerChannel.unbind_all(); pusher.unsubscribe(`lobby-${code}`); pusher.unsubscribe(`player-${code}-${id}`); };
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
    setAnswers(prev => ({ ...prev, [playerName]: [...(prev[playerName] || []), { playerName, answer: recordText.trim() }] }));
    setRecordText(""); setRecordingFor(null);
  }

  const myPlayer = players.find(p => p.id === myId);
  const isMeAnswered = myPlayer?.hasAnswered || false;

  // WAITING FOR ASSIGNMENT
  if (waitingAssign) {
    return (
      <>
        <div className="stage-bg" />
        <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="panel" style={{ padding: "48px 56px", textAlign: "center", position: "relative" }}>
            <Corners />
            <SpyDotaCrest size={64} />
            <div className="display heading-gold" style={{ fontSize: 24, letterSpacing: ".2em", marginTop: 18 }}>РАЗДАЧА РОЛЕЙ</div>
            <div style={{ fontFamily: "'Marcellus', serif", fontStyle: "italic", color: "var(--text-dim)", marginTop: 8, fontSize: 15 }}>
              ИИ генерирует подсказки…
            </div>
          </div>
        </main>
      </>
    );
  }

  // GAME OVER
  if (gameOver && revealed) {
    return (
      <>
        <div className="stage-bg" />
        <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem 1rem" }}>
          <div style={{ maxWidth: 500, width: "100%" }}>
            <div className="panel" style={{ padding: "36px 40px", textAlign: "center", marginBottom: 16, position: "relative", overflow: "hidden" }}>
              <Corners />
              <div style={{ position: "absolute", inset: 0, opacity: .12, background: "radial-gradient(ellipse at 50% 30%, #f0c040 0%, transparent 50%)", pointerEvents: "none" }} />
              <div className="mono" style={{ fontSize: 11, color: "var(--gold-bright)", letterSpacing: ".4em" }}>ИГРА ОКОНЧЕНА</div>
              <div className="display heading-gold" style={{ fontSize: 48, letterSpacing: ".08em", lineHeight: 1, marginTop: 6 }}>ФИНАЛ</div>
            </div>

            <div className="panel" style={{ padding: "22px 24px", marginBottom: 16, position: "relative" }}>
              <Corners />
              <div className="dota-label" style={{ marginBottom: 12 }}>ИТОГИ РАУНДА</div>
              {revealed.players.map(p => (
                <div key={p.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px", marginBottom: 6,
                  background: p.isSpy ? "rgba(163,37,30,0.15)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${p.isSpy ? "#a3251e" : "#1c2530"}`,
                }}>
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: 13, letterSpacing: ".1em", color: p.id === myId ? "var(--gold-bright)" : "var(--parchment)" }}>
                    {p.isSpy ? "🕵 " : ""}{p.name.toUpperCase()}{p.id === myId ? " (ТЫ)" : ""}
                  </span>
                  <span className="mono" style={{ fontSize: 11, color: p.isSpy ? "#ff6b5e" : "var(--text-dim)", letterSpacing: ".15em" }}>
                    {p.isSpy ? "ШПИОН" : p.heroName.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>

            {isHost ? (
              <button
                className="dota-btn primary"
                style={{ width: "100%", padding: "16px", marginBottom: 10 }}
                onClick={async () => {
                  await fetch("/api/game/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, playerId: myId, action: "restart-game" }) });
                }}
              >
                🔄 ПЕРЕИГРАТЬ ТОТ ЖЕ СОСТАВ
              </button>
            ) : (
              <div className="panel" style={{ padding: "14px 18px", marginBottom: 10, textAlign: "center", position: "relative" }}>
                <Corners />
                <span style={{ fontFamily: "'Marcellus', serif", fontStyle: "italic", color: "var(--text-dim)", fontSize: 14 }}>
                  ⏳ Ждём хоста…
                </span>
              </div>
            )}
            <button className="dota-btn" style={{ width: "100%", padding: "14px" }} onClick={() => router.push("/")}>
              НА ГЛАВНУЮ
            </button>
          </div>
        </main>
      </>
    );
  }

  // REVEAL SCREEN
  if (revealed) {
    return (
      <>
        <div className="stage-bg" />
        <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem 1rem" }}>
          <div style={{ maxWidth: 500, width: "100%" }}>
            <div className="panel" style={{ padding: "32px 36px", textAlign: "center", marginBottom: 16, position: "relative", overflow: "hidden" }}>
              <Corners color="#a3251e" />
              <div style={{ position: "absolute", inset: 0, opacity: .1, background: "radial-gradient(ellipse at 50% 30%, #d8362c 0%, transparent 50%)", pointerEvents: "none" }} />
              <div className="mono" style={{ fontSize: 11, color: "#ff6b5e", letterSpacing: ".4em" }}>СОВЕТ ВЫНЕС ПРИГОВОР</div>
              <div className="display" style={{ fontSize: 42, letterSpacing: ".1em", lineHeight: 1, marginTop: 8, color: "transparent", background: "linear-gradient(180deg, #ff8b7e 0%, #d8362c 50%, #5a120a 100%)", WebkitBackgroundClip: "text", backgroundClip: "text" }}>
                ШПИОН РАСКРЫТ
              </div>
              <div style={{ fontFamily: "'Marcellus', serif", fontStyle: "italic", color: "var(--parchment-dim)", marginTop: 8, fontSize: 15 }}>
                Шпионом был — <span style={{ color: "var(--gold-bright)", fontStyle: "normal", fontFamily: "'Cinzel', serif" }}>{revealed.spyName.toUpperCase()}</span>
              </div>
            </div>

            <div className="panel" style={{ padding: "22px 24px", marginBottom: 16, position: "relative" }}>
              <Corners />
              <div className="dota-label" style={{ marginBottom: 12 }}>РОЛИ ИГРОКОВ</div>
              {revealed.players.map(p => (
                <div key={p.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px", marginBottom: 6,
                  background: p.isSpy ? "rgba(163,37,30,0.15)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${p.isSpy ? "#a3251e" : "#1c2530"}`,
                }}>
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: 13, letterSpacing: ".1em", color: p.id === myId ? "var(--gold-bright)" : "var(--parchment)" }}>
                    {p.isSpy ? "🕵 " : ""}{p.name.toUpperCase()}{p.id === myId ? " (ТЫ)" : ""}
                  </span>
                  <span className="mono" style={{ fontSize: 11, color: p.isSpy ? "#ff6b5e" : "var(--text-dim)", letterSpacing: ".15em" }}>
                    {p.isSpy ? "ШПИОН" : p.heroName.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>

            {isHost && !gameOver && (
              <div style={{ display: "flex", gap: 10 }}>
                {currentRound < rounds && (
                  <button className="dota-btn primary" style={{ flex: 1, padding: "14px" }} onClick={nextRound}>
                    СЛЕДУЮЩИЙ РАУНД ▶
                  </button>
                )}
                <button className="dota-btn danger" style={{ flex: 1, padding: "14px" }}
                  onClick={() => fetch("/api/game/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, playerId: myId, action: "next-round" }) }).then(r => r.json()).then(d => { if (d.finished) setGameOver(true); })}>
                  ЗАВЕРШИТЬ ИГРУ
                </button>
              </div>
            )}
          </div>
        </main>
      </>
    );
  }

  // MAIN GAME SCREEN
  return (
    <>
      <div className="stage-bg" />
      <main style={{ minHeight: "100vh", padding: "1rem" }}>
        <div style={{ maxWidth: 500, margin: "0 auto" }}>

          {/* Topbar */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 16px", marginBottom: 14,
            background: "linear-gradient(180deg, #1a232f 0%, #0c1117 100%)",
            border: "1px solid #2a2418",
            boxShadow: "inset 0 0 0 1px rgba(200,168,75,0.35), 0 4px 16px rgba(0,0,0,0.6)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <SpyDotaCrest size={30} />
              <span className="display heading-gold" style={{ fontSize: 14, letterSpacing: ".22em" }}>SPY DOTA</span>
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <span className="mono" style={{ fontSize: 11, color: "var(--gold)", letterSpacing: ".15em" }}>{code}</span>
              <span className="mono" style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: ".1em" }}>
                РАУНД <span style={{ color: "var(--gold-bright)" }}>{currentRound}/{rounds}</span>
              </span>
              <span className="mono" style={{ fontSize: 10, color: "var(--text-mute)", letterSpacing: ".1em" }}>
                {mode === "vote" ? "ГОЛОСОВАНИЕ" : "ПРОСТОЙ"}
              </span>
            </div>
          </div>

          {/* Hero / Spy card */}
          {assigned && (
            <div style={{
              position: "relative",
              padding: "24px 24px",
              marginBottom: 14,
              background: assigned.isSpy
                ? "linear-gradient(180deg, rgba(80,20,16,0.7), rgba(20,5,5,0.9))"
                : "linear-gradient(180deg, rgba(40,52,68,0.85), rgba(14,19,26,0.92))",
              border: `1px solid ${assigned.isSpy ? "#a3251e" : "#2a2418"}`,
              boxShadow: assigned.isSpy
                ? "inset 0 0 0 1px rgba(216,54,44,0.55), 0 12px 40px rgba(0,0,0,0.7)"
                : "inset 0 0 0 1px rgba(200,168,75,0.55), 0 12px 40px rgba(0,0,0,0.7)",
              textAlign: "center",
            }}>
              <Corners color={assigned.isSpy ? "#a3251e" : "#c8a84b"} />

              {assigned.isSpy ? (
                <>
                  <div className="mono" style={{ fontSize: 10, color: "#ff6b5e", letterSpacing: ".4em", marginBottom: 12 }}>ТВОЯ РОЛЬ</div>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>🕵</div>
                  <div className="display" style={{ fontSize: 36, letterSpacing: ".25em", color: "transparent", background: "linear-gradient(180deg, #ff8b7e 0%, #d8362c 50%, #5a120a 100%)", WebkitBackgroundClip: "text", backgroundClip: "text" }}>
                    ШПИОН
                  </div>
                  <div style={{ fontFamily: "'Marcellus', serif", fontStyle: "italic", color: "#d8a8a4", marginTop: 10, fontSize: 14, lineHeight: 1.5 }}>
                    Угадай героя прежде, чем тебя раскроют. Отвечай уклончиво.
                  </div>
                </>
              ) : (
                <>
                  <div className="mono" style={{ fontSize: 10, color: "var(--text-mute)", letterSpacing: ".4em", marginBottom: 14 }}>ТВОЙ ГЕРОЙ</div>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                    <HeroIcon heroId={assigned.heroId} heroName={assigned.heroName} />
                  </div>
                  <div className="display heading-gold" style={{ fontSize: 32, letterSpacing: ".15em", marginBottom: 8 }}>
                    {assigned.heroName.toUpperCase()}
                  </div>
                  {assigned.hint && (
                    <>
                      <button
                        className="dota-btn sm"
                        style={{ marginTop: 12 }}
                        onClick={() => setShowHint(!showHint)}
                      >
                        {showHint ? "СКРЫТЬ ПОДСКАЗКИ" : "💡 5 ПОДСКАЗОК ОТ ИИ"}
                      </button>
                      {showHint && (
                        <div style={{
                          marginTop: 14, padding: "14px 16px", textAlign: "left",
                          background: "rgba(200,168,75,0.04)",
                          border: "1px solid rgba(200,168,75,0.2)",
                          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.5)",
                        }}>
                          {assigned.hint.split("\n").map((fact, i) => (
                            <div key={i} style={{ display: "flex", gap: 10, marginBottom: i < 4 ? 10 : 0 }}>
                              <span style={{ fontFamily: "'Cinzel', serif", color: "var(--gold)", fontWeight: 700, fontSize: 11, minWidth: 18 }}>{i + 1}.</span>
                              <span style={{ fontFamily: "'Marcellus', serif", color: "var(--parchment)", fontSize: 14, lineHeight: 1.55 }}>{fact}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  <div style={{ marginTop: 14 }}>
                    <a
                      href={`/hero/${CDN_OVERRIDES[assigned.heroId] ?? assigned.heroId}`}
                      className="dota-btn sm"
                      style={{ textDecoration: "none", fontSize: 10, letterSpacing: ".15em" }}
                      target="_blank"
                      rel="noreferrer"
                    >
                      📊 СТАТИСТИКА ГЕРОЯ
                    </a>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Spy notebook — visible only to the spy */}
          {assigned?.isSpy && <SpyHeroTable />}

          {/* VOTE MODE — players + recording */}
          {mode === "vote" && !votingOpen && (
            <>
              <div className="panel" style={{ padding: "20px 22px", marginBottom: 12, position: "relative" }}>
                <Corners />
                <div className="dota-label" style={{ marginBottom: 12 }}>ИГРОКИ СОВЕТА</div>
                {players.map(p => (
                  <div key={p.id} style={{ marginBottom: 8 }}>
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "8px 12px",
                      background: p.id === myId ? "rgba(200,168,75,0.06)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${p.id === myId ? "rgba(200,168,75,0.25)" : "#1c2530"}`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12 }}>{p.hasAnswered ? "✅" : "⏳"}</span>
                        <span style={{ fontFamily: "'Cinzel', serif", fontSize: 12, letterSpacing: ".1em", color: p.id === myId ? "var(--gold-bright)" : "var(--parchment)" }}>
                          {p.name.toUpperCase()}{p.id === myId ? " (ТЫ)" : ""}
                        </span>
                      </div>
                      {p.id !== myId && (
                        <button
                          className="dota-btn sm"
                          onClick={() => setRecordingFor(recordingFor === p.id ? null : p.id)}
                        >
                          📝 ЗАПИСАТЬ
                        </button>
                      )}
                    </div>
                    {recordingFor === p.id && (
                      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                        <input
                          className="dota-input"
                          value={recordText}
                          onChange={e => setRecordText(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && addAnswer(p.name)}
                          placeholder={`Ответ ${p.name}…`}
                          autoFocus
                          style={{ flex: 1, padding: "8px 12px", fontSize: 14 }}
                        />
                        <button className="dota-btn sm" onClick={() => addAnswer(p.name)}>+</button>
                      </div>
                    )}
                    {(answers[p.name] || []).map((a, i) => (
                      <div key={i} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        marginTop: 4, padding: "5px 12px",
                        background: "rgba(200,168,75,0.05)", border: "1px solid rgba(200,168,75,0.15)",
                        fontFamily: "'Marcellus', serif", fontSize: 13, color: "var(--text-dim)", fontStyle: "italic",
                      }}>
                        <span>«{a.answer}»</span>
                        <button onClick={() => setAnswers(prev => ({ ...prev, [p.name]: prev[p.name].filter((_, j) => j !== i) }))}
                          style={{ background: "none", border: "none", color: "#d8362c", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {!isMeAnswered ? (
                <button className="dota-btn primary" style={{ width: "100%", padding: "14px", marginBottom: 10 }} onClick={markAnswered}>
                  ✅ Я ОТВЕТИЛ
                </button>
              ) : (
                <div className="panel" style={{ padding: "12px 18px", marginBottom: 10, textAlign: "center", position: "relative" }}>
                  <Corners />
                  <span style={{ fontFamily: "'Marcellus', serif", fontStyle: "italic", color: "var(--text-dim)", fontSize: 14 }}>
                    ✅ Ты ответил — ждём остальных
                  </span>
                </div>
              )}

              {isHost && (
                <button className="dota-btn danger" style={{ width: "100%", padding: "14px", marginBottom: 10 }} onClick={openVoting}>
                  🗳 ОТКРЫТЬ ГОЛОСОВАНИЕ
                </button>
              )}
            </>
          )}

          {/* VOTING PHASE */}
          {mode === "vote" && votingOpen && !revealed && (
            <div className="panel" style={{ padding: "22px 24px", marginBottom: 12, position: "relative" }}>
              <Corners color="#a3251e" />
              <div className="mono" style={{ fontSize: 10, color: "#ff6b5e", letterSpacing: ".3em", marginBottom: 14 }}>
                ⚠ ГОЛОСОВАНИЕ — КТО ШПИОН?
              </div>
              {players.filter(p => p.id !== myId).map(p => (
                <button
                  key={p.id}
                  onClick={() => castVote(p.id)}
                  disabled={!!myVote}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    width: "100%", padding: "12px 14px", marginBottom: 8,
                    background: myVote === p.id ? "rgba(163,37,30,0.2)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${myVote === p.id ? "#a3251e" : "#1c2530"}`,
                    cursor: myVote ? "not-allowed" : "pointer",
                    fontFamily: "'Cinzel', serif", fontSize: 12, letterSpacing: ".12em",
                    color: "var(--parchment)", textAlign: "left",
                    transition: "all .15s ease",
                  }}
                >
                  <span>{p.name.toUpperCase()}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {p.votes > 0 && (
                      <span style={{ background: "#d8362c", color: "#fff", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>
                        {p.votes}
                      </span>
                    )}
                    {myVote === p.id && <span className="mono" style={{ fontSize: 10, color: "#ff6b5e" }}>← МОЙ ГОЛОС</span>}
                  </span>
                </button>
              ))}
              {myVote && (
                <div style={{ fontFamily: "'Marcellus', serif", fontStyle: "italic", color: "var(--text-dim)", textAlign: "center", marginTop: 6, fontSize: 13 }}>
                  Ты проголосовал
                </div>
              )}
              {isHost && (
                <button className="dota-btn danger" style={{ width: "100%", padding: "14px", marginTop: 14 }} onClick={revealSpy}>
                  👁 РАСКРЫТЬ ШПИОНА
                </button>
              )}
            </div>
          )}

          {/* SIMPLE MODE */}
          {mode === "simple" && !revealed && (
            <div className="panel" style={{ padding: "22px 24px", marginBottom: 12, position: "relative" }}>
              <Corners />
              <div className="dota-label" style={{ marginBottom: 12 }}>ВСЕ ИГРОКИ</div>
              {players.map(p => (
                <div key={p.id} style={{
                  padding: "10px 14px", marginBottom: 6,
                  background: p.id === myId ? "rgba(200,168,75,0.06)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${p.id === myId ? "rgba(200,168,75,0.25)" : "#1c2530"}`,
                }}>
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: 12, letterSpacing: ".1em", color: p.id === myId ? "var(--gold-bright)" : "var(--parchment)" }}>
                    {p.name.toUpperCase()}{p.id === myId ? " (ТЫ)" : ""}
                  </span>
                </div>
              ))}
              {isHost && (
                <button className="dota-btn danger" style={{ width: "100%", padding: "14px", marginTop: 14 }} onClick={revealSpy}>
                  👁 РАСКРЫТЬ ШПИОНА
                </button>
              )}
            </div>
          )}

          {/* Host kick panel */}
          {isHost && (
            <div className="panel" style={{ padding: "20px 22px", position: "relative" }}>
              <Corners />
              <div className="dota-label" style={{ marginBottom: 12 }}>УПРАВЛЕНИЕ ИГРОКАМИ</div>
              {players.filter(p => !p.isHost).map(p => (
                <div key={p.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 12px", marginBottom: 6,
                  background: "rgba(255,255,255,0.02)", border: "1px solid #1c2530",
                }}>
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: 12, letterSpacing: ".1em", color: "var(--parchment)" }}>
                    {p.name.toUpperCase()}
                  </span>
                  <button
                    className="dota-btn danger sm"
                    onClick={async () => { await fetch("/api/game/kick", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, hostId: myId, targetId: p.id }) }); }}
                  >
                    КИК
                  </button>
                </div>
              ))}
            </div>
          )}

        </div>
      </main>
      <SpyHintChat isSpy={assigned?.isSpy === true} />
    </>
  );
}
