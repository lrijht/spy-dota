"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

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

function SpyDotaCrest({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: "drop-shadow(0 2px 0 #000) drop-shadow(0 0 12px rgba(240,192,64,0.4))", flexShrink: 0 }}>
      <defs>
        <linearGradient id="crestGoldH" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8e29b" />
          <stop offset="0.5" stopColor="#c8a84b" />
          <stop offset="1" stopColor="#5c4818" />
        </linearGradient>
      </defs>
      <path d="M32 2 L58 16 L58 48 L32 62 L6 48 L6 16 Z" fill="#0a0d12" stroke="url(#crestGoldH)" strokeWidth="2" />
      <path d="M32 7 L54 18 L54 46 L32 57 L10 46 L10 18 Z" stroke="url(#crestGoldH)" strokeWidth="0.7" fill="none" opacity="0.6" />
      <path d="M14 32 Q32 18 50 32 Q32 46 14 32 Z" fill="#1a0606" stroke="#a3251e" strokeWidth="1" />
      <circle cx="32" cy="32" r="7" fill="#d8362c" />
      <circle cx="32" cy="32" r="3" fill="#fff" opacity="0.85" />
      <circle cx="32" cy="32" r="1.4" fill="#0a0306" />
      <path d="M10 50 L24 36" stroke="url(#crestGoldH)" strokeWidth="1.6" />
      <path d="M54 50 L40 36" stroke="url(#crestGoldH)" strokeWidth="1.6" />
      <circle cx="10" cy="50" r="1.6" fill="url(#crestGoldH)" />
      <circle cx="54" cy="50" r="1.6" fill="url(#crestGoldH)" />
    </svg>
  );
}

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!name.trim()) return setError("Введи имя");
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/lobby", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hostName: name.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem(`player_${data.code}`, data.playerId);
      localStorage.setItem(`name_${data.code}`, name.trim());
      router.push(`/lobby/${data.code}`);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  async function handleJoin() {
    if (!name.trim()) return setError("Введи имя");
    if (!code.trim()) return setError("Введи код лобби");
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/lobby/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: code.trim().toUpperCase(), playerName: name.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem(`player_${data.code}`, data.playerId);
      localStorage.setItem(`name_${data.code}`, name.trim());
      router.push(`/lobby/${data.code}`);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  return (
    <>
      <div className="stage-bg" />
      <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 1rem" }}>
        <div className="home-grid">

          {/* LEFT — title + lore */}
          <div className="panel" style={{ padding: "48px 40px", minHeight: 520, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <Corners />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 20 }}>
                <SpyDotaCrest size={80} />
                <div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--text-mute)", letterSpacing: ".4em", marginBottom: 4 }}>ИГРА НА ДЕДУКЦИЮ</div>
                  <div className="display heading-gold" style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)", lineHeight: 1 }}>SPY DOTA</div>
                  <div style={{ fontFamily: "'Marcellus', serif", fontStyle: "italic", color: "var(--parchment-dim)", fontSize: 16, marginTop: 4 }}>
                    Шпион среди героев Dota 2
                  </div>
                </div>
              </div>

              <div className="dota-divider"><span className="line" /><span className="glyph">◆</span><span className="line" /></div>

              <p style={{ color: "var(--parchment-dim)", fontSize: 16, lineHeight: 1.55, margin: 0 }}>
                Все игроки получают одного героя. Все, кроме шпиона.
                <strong style={{ color: "#ff6b5e", fontStyle: "italic" }}> Он должен угадать героя</strong> прежде, чем совет раскроет его. Задавай вопросы. Ври осторожно. Голосуй мудро.
              </p>

              <div style={{ display: "flex", gap: 24, marginTop: 28, padding: "14px 18px", background: "rgba(0,0,0,0.45)", border: "1px solid #2a2418", boxShadow: "inset 0 0 0 1px rgba(200,168,75,0.3)" }}>
                {[["Игроки", "2–6"], ["Раунды", "3+"], ["ИИ-подсказки", "ВКЛ"]].map(([label, value]) => (
                  <div key={label}>
                    <div className="mono" style={{ fontSize: 10, color: "var(--text-mute)", letterSpacing: ".25em" }}>{label}</div>
                    <div className="display heading-gold" style={{ fontSize: 18, letterSpacing: ".1em" }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24 }}>
              <div className="mono" style={{ fontSize: 10, color: "var(--text-mute)", letterSpacing: ".2em" }}>
                {"// 2 РЕЖИМА · ГОЛОСОВАНИЕ · ПРОСТОЙ"}
              </div>
              <a href="/hero" className="dota-btn sm" style={{ textDecoration: "none", fontSize: 10, letterSpacing: ".15em" }}>
                ✦ HERO CODEX
              </a>
            </div>
          </div>

          {/* RIGHT — form */}
          <div className="panel" style={{ padding: "36px 32px", display: "flex", flexDirection: "column", gap: 20 }}>
            <Corners />

            <div style={{ textAlign: "center" }}>
              <div className="display heading-gold" style={{ fontSize: 20, letterSpacing: ".22em" }}>ПРИЗЫВ ЗНАМЕНИ</div>
              <div className="mono" style={{ fontSize: 10, color: "var(--text-mute)", letterSpacing: ".25em", marginTop: 4 }}>ВОЙДИ В РОСТЕР</div>
            </div>

            <div>
              <label className="dota-label">ИМЯ ПРИЗЫВАТЕЛЯ</label>
              <input
                className="dota-input"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreate()}
                placeholder="введи своё имя, герой…"
                maxLength={20}
              />
            </div>

            <div className="dota-divider"><span className="line" /><span className="glyph">◆</span><span className="line" /></div>

            {error && (
              <div style={{ background: "rgba(163,37,30,0.15)", color: "#ff6b5e", border: "1px solid #a3251e", padding: "10px 14px", fontSize: 14, fontFamily: "'Marcellus', serif" }}>
                {error}
              </div>
            )}

            <button
              className="dota-btn primary"
              style={{ width: "100%", padding: "16px 28px" }}
              onClick={handleCreate}
              disabled={loading || !name.trim()}
            >
              ⚔ СОЗДАТЬ НОВУЮ ИГРУ
            </button>

            <div style={{ display: "flex", gap: 10 }}>
              <input
                className="dota-input mono"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase().slice(0, 5))}
                onKeyDown={e => e.key === "Enter" && handleJoin()}
                placeholder="КОД ЛОББИ"
                maxLength={5}
                style={{ flex: 1, color: "var(--gold)", fontSize: 18, letterSpacing: ".25em", textTransform: "uppercase" }}
              />
              <button
                className="dota-btn"
                onClick={handleJoin}
                disabled={loading || !name.trim() || code.length < 4}
                style={{ minWidth: 130 }}
              >
                ВОЙТИ
              </button>
            </div>

            <div className="mono" style={{ fontSize: 10, color: "var(--text-mute)", letterSpacing: ".25em", textAlign: "center" }}>
              {"// ПРЕДАТЕЛЬСТВО — ЭТО ВЕСЕЛО"}
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
