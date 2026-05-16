"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [tab, setTab] = useState<"create" | "join">("create");
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

  const inp = { background: "#080b12", border: "1px solid #1e2a3a", color: "#c9d1e0", fontFamily: "inherit" };

  return (
    <main style={{ minHeight: "100vh", background: "#080b12", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 1rem" }}>
      <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
        <div style={{ fontSize: "4rem", marginBottom: "0.5rem" }}>🗡️</div>
        <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: "clamp(2rem,6vw,3.5rem)", color: "#c8a84b", textShadow: "0 0 40px rgba(200,168,75,0.4)", margin: 0 }}>SPY DOTA</h1>
        <p style={{ color: "#4a5568", marginTop: "0.5rem", fontSize: "1.1rem" }}>Шпион по героям Dota 2</p>
      </div>

      <div style={{ width: "100%", maxWidth: 420, background: "#0d1320", border: "1px solid #1e2a3a", borderRadius: 20, padding: "2rem" }}>
        <div style={{ display: "flex", background: "#080b12", borderRadius: 12, overflow: "hidden", marginBottom: "1.5rem" }}>
          {(["create", "join"] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setError(""); }} style={{ flex: 1, padding: "0.75rem", border: "none", cursor: "pointer", fontFamily: "'Cinzel', serif", fontSize: "0.8rem", letterSpacing: "0.05em", fontWeight: 700, background: tab === t ? "#c8a84b" : "transparent", color: tab === t ? "#080b12" : "#4a5568", transition: "all 0.2s" }}>
              {t === "create" ? "Создать" : "Войти"}
            </button>
          ))}
        </div>

        <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4a5568", marginBottom: "0.4rem" }}>Твоё имя</label>
        <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && (tab === "create" ? handleCreate() : handleJoin())} placeholder="Никнейм..." maxLength={20} style={{ ...inp, width: "100%", padding: "0.75rem 1rem", borderRadius: 12, fontSize: "1rem", outline: "none", marginBottom: "1rem" }} />

        {tab === "join" && (
          <>
            <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4a5568", marginBottom: "0.4rem" }}>Код лобби</label>
            <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} onKeyDown={e => e.key === "Enter" && handleJoin()} placeholder="ABCD1" maxLength={5} style={{ ...inp, width: "100%", padding: "0.75rem 1rem", borderRadius: 12, fontSize: "1.8rem", textAlign: "center", letterSpacing: "0.3em", fontFamily: "'Cinzel', serif", color: "#c8a84b", fontWeight: 700, outline: "none", marginBottom: "1rem" }} />
          </>
        )}

        {error && <div style={{ background: "rgba(192,57,43,0.15)", color: "#e74c3c", border: "1px solid #c0392b", borderRadius: 10, padding: "0.6rem 1rem", fontSize: "0.9rem", marginBottom: "1rem" }}>{error}</div>}

        <button onClick={tab === "create" ? handleCreate : handleJoin} disabled={loading} style={{ width: "100%", padding: "1rem", background: loading ? "#4a5568" : "#c8a84b", color: "#080b12", border: "none", borderRadius: 12, fontSize: "1rem", fontWeight: 700, fontFamily: "'Cinzel', serif", letterSpacing: "0.1em", cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s" }}>
          {loading ? "Загрузка..." : tab === "create" ? "Создать игру" : "Войти в лобби"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginTop: "2rem", maxWidth: 420, width: "100%" }}>
        {[["🎭","2 режима"],["🤖","ИИ-подсказки"],["⚔️","До 6 игроков"]].map(([icon, label]) => (
          <div key={label} style={{ background: "#0d1320", border: "1px solid #1e2a3a", borderRadius: 12, padding: "0.75rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem" }}>{icon}</div>
            <div style={{ fontSize: "0.75rem", color: "#4a5568", marginTop: "0.25rem" }}>{label}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
