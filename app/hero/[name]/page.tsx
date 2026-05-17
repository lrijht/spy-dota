"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface Hero {
  id: number;
  shortName: string;
  displayName: string;
}

interface PosData {
  pos: number;
  pick: number;
  win: number;
}

interface HeroData {
  hero: Hero;
  positions: PosData[];
  items: {
    start: Record<string, number>;
    early: Record<string, number>;
    mid:   Record<string, number>;
    late:  Record<string, number>;
  };
}

/* ─── Constants ──────────────────────────────────────────────────────────── */

const OPENDOTA = "/api/opendota";
const CDN = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react";

const PHASE_LABELS = ["Стартовые предметы", "Ранняя игра", "Середина игры", "Поздняя игра"];

const POS_LABELS: Record<string, string> = {
  POSITION_1: "Кэрри",
  POSITION_2: "Мид",
  POSITION_3: "Офлейн",
  POSITION_4: "Поддержка 4",
  POSITION_5: "Поддержка 5",
};

/* ─── Fetch helpers ──────────────────────────────────────────────────────── */

async function fetchHeroStats(): Promise<any[]> {
  const res = await fetch(`${OPENDOTA}/heroStats`);
  if (!res.ok) throw new Error(`OpenDota heroStats HTTP ${res.status}`);
  return res.json();
}

async function fetchItemPopularity(heroId: number): Promise<any> {
  const res = await fetch(`${OPENDOTA}/heroes/${heroId}/itemPopularity`);
  if (!res.ok) throw new Error(`OpenDota itemPopularity HTTP ${res.status}`);
  return res.json();
}

/* ─── SVG helpers ────────────────────────────────────────────────────────── */

function CornerOrnament() {
  return (
    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="28" height="28">
      <path d="M2 14 L2 2 L14 2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 14 L5 5 L14 5" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
      <path d="M5 5 L8 2 L11 5 L8 8 Z" fill="currentColor" opacity="0.9" />
      <path d="M7 4 L8 3 L9 4 L8 5 Z" fill="#000" opacity="0.5" />
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

/* ─── Lane Map ───────────────────────────────────────────────────────────── */

function laneColor(wr: number) {
  if (wr >= 55) return "#22b822";
  if (wr >= 50) return "#1a7a1a";
  if (wr >= 45) return "#c8a84b";
  return "#8a2020";
}

function LaneMap({ positions }: { positions: PosData[] }) {
  const B = 22;

  // Each dot sits on its lane: 1/5 on safe lane, 2 on mid, 3/4 on offlane
  const dots = [
    { pos: 5, label: "5", cx: 50,  cy: 172 }, // safe lane near Radiant base
    { pos: 1, label: "1", cx: 172, cy: 132 }, // safe lane right side
    { pos: 2, label: "2", cx: 100, cy: 100 }, // mid diagonal centre
    { pos: 4, label: "4", cx: 28,  cy: 90  }, // offlane left side
    { pos: 3, label: "3", cx: 90,  cy: 28  }, // offlane top (far from base)
  ];

  function posWr(pos: number) {
    const d = positions.find(p => p.pos === pos);
    if (!d || d.pick < 500) return null;
    return Math.round((d.win / d.pick) * 100);
  }

  return (
    <svg viewBox="0 0 200 200" width={190} height={190}
      style={{ border: "1px solid rgba(200,168,75,0.25)", display: "block", flexShrink: 0 }}>
      <rect width="200" height="200" fill="#030c05" />
      <polygon points="85,200 115,200 200,115 200,85" fill="#082030" opacity="0.9" />
      {/* Lane lines always grey */}
      <polyline points={`${B},${200-B} ${200-B},${200-B} ${200-B},${B}`}
        stroke="#1c2e1c" strokeWidth="11" fill="none" strokeLinejoin="round" />
      <polyline points={`${B},${200-B} ${B},${B} ${200-B},${B}`}
        stroke="#1c2e1c" strokeWidth="11" fill="none" strokeLinejoin="round" />
      <line x1={B} y1={200-B} x2={200-B} y2={B} stroke="#1c2e1c" strokeWidth="11" />
      {/* Bases */}
      <circle cx={B} cy={200-B} r="13" fill="#1a2a10" stroke="#c8a84b" strokeWidth="1.5" />
      <text x={B} y={200-B+4} textAnchor="middle" fill="#c8a84b" fontSize="9" fontFamily="monospace" fontWeight="bold">R</text>
      <circle cx={200-B} cy={B} r="13" fill="#2a1010" stroke="#a3251e" strokeWidth="1.5" />
      <text x={200-B} y={B+4} textAnchor="middle" fill="#ff6b5e" fontSize="9" fontFamily="monospace" fontWeight="bold">D</text>
      {/* Position dots */}
      {dots.map(({ pos, label, cx, cy }) => {
        const w = posWr(pos);
        if (w === null) return null;
        return (
          <g key={pos}>
            <circle cx={cx} cy={cy} r="10" fill={laneColor(w)} stroke="#000" strokeWidth="1.5" />
            <text x={cx} y={cy + 4} textAnchor="middle" fill="#fff" fontSize="9"
              fontFamily="monospace" fontWeight="bold">{label}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Item Icon ──────────────────────────────────────────────────────────── */

function ItemIcon({ name, count }: { name: string; count: number }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  const cleanName = name.replace(/^item_/, "");
  return (
    <div title={`${cleanName} · ${count.toLocaleString()} матчей`}
      style={{ width: 44, height: 44, border: "1px solid rgba(200,168,75,0.3)",
        background: "#0a0e0a", overflow: "hidden", flexShrink: 0 }}>
      <img src={`${CDN}/items/${cleanName}.png`} alt={cleanName} width={44} height={44}
        style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
        onError={() => setOk(false)} />
    </div>
  );
}

/* ─── Hero Portrait ──────────────────────────────────────────────────────── */

function HeroPortrait({ shortName, displayName }: { shortName: string; displayName: string }) {
  const [ok, setOk] = useState(true);
  return (
    <div style={{ width: 120, height: 68, border: "1px solid rgba(200,168,75,0.5)",
      background: "#0a0d12", overflow: "hidden", flexShrink: 0 }}>
      {ok ? (
        <img src={`${CDN}/heroes/${shortName}.png`} alt={displayName} width={120} height={68}
          style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
          onError={() => setOk(false)} />
      ) : (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center",
          justifyContent: "center", color: "var(--text-mute)", fontSize: 11 }}>
          {displayName}
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */

export default function HeroPage() {
  const params = useParams();
  const router = useRouter();
  const heroName = (params.name as string) ?? "";

  const [rawStats, setRawStats] = useState<any[]>([]);
  const [allHeroes, setAllHeroes] = useState<Hero[]>([]);
  const [heroListError, setHeroListError] = useState("");
  const [search, setSearch] = useState("");
  const [showList, setShowList] = useState(false);
  const [heroData, setHeroData] = useState<HeroData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Load all heroes once on mount
  useEffect(() => {
    fetchHeroStats()
      .then(data => {
        setRawStats(data);
        const heroes: Hero[] = data
          .filter((h: any) => h.localized_name)
          .map((h: any) => ({
            id: h.id,
            shortName: h.name.replace("npc_dota_hero_", ""),
            displayName: h.localized_name,
          }))
          .sort((a: Hero, b: Hero) => a.displayName.localeCompare(b.displayName));
        setAllHeroes(heroes);
      })
      .catch((e: any) => setHeroListError(e.message ?? "Ошибка загрузки героев"));
  }, []);

  // Load item popularity when hero changes (position data is already in rawStats)
  useEffect(() => {
    if (!heroName || rawStats.length === 0) return;
    const hs = rawStats.find((h: any) => h.name.replace("npc_dota_hero_", "") === heroName);
    if (!hs) return;

    setLoading(true);
    setError("");
    setHeroData(null);

    fetchItemPopularity(hs.id)
      .then(items => {
        setHeroData({
          hero: { id: hs.id, shortName: heroName, displayName: hs.localized_name },
          positions: [1, 2, 3, 4, 5].map(pos => ({
            pos,
            pick: hs[`pos_${pos}_pick`] ?? 0,
            win:  hs[`pos_${pos}_win`]  ?? 0,
          })),
          items: {
            start: items.start_game_items ?? {},
            early: items.early_game_items ?? {},
            mid:   items.mid_game_items   ?? {},
            late:  items.late_game_items  ?? {},
          },
        });
      })
      .catch((e: any) => setError(e.message ?? "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [heroName, rawStats]);

  const selected = allHeroes.find(h => h.shortName === heroName) ?? null;
  const filtered = search.length >= 1
    ? allHeroes.filter(h => h.displayName.toLowerCase().includes(search.toLowerCase()))
    : allHeroes;

  function selectHero(h: Hero) {
    setSearch("");
    setShowList(false);
    router.push(`/hero/${h.shortName}`);
  }

  const totalPick = heroData?.positions.reduce((a, p) => a + p.pick, 0) ?? 0;
  const totalWin  = heroData?.positions.reduce((a, p) => a + p.win,  0) ?? 0;
  const overallWr = totalPick > 1000 ? Math.round(totalWin / totalPick * 100) : null;

  const phases = heroData ? [
    { key: "start", label: PHASE_LABELS[0], items: heroData.items.start },
    { key: "early", label: PHASE_LABELS[1], items: heroData.items.early },
    { key: "mid",   label: PHASE_LABELS[2], items: heroData.items.mid   },
    { key: "late",  label: PHASE_LABELS[3], items: heroData.items.late  },
  ] : [];

  return (
    <>
      <div className="stage-bg" />
      <main style={{ minHeight: "100vh", padding: "1.5rem 1rem", maxWidth: 960, margin: "0 auto" }}>

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="display heading-gold" style={{ fontSize: 18, letterSpacing: ".2em" }}>SPY DOTA</div>
            <div className="mono" style={{ fontSize: 10, color: "var(--text-mute)", letterSpacing: ".25em" }}>
              / БАЗА ДАННЫХ ГЕРОЕВ
            </div>
          </div>
          <button className="dota-btn sm" onClick={() => router.push("/")}>← Главная</button>
        </div>

        {/* Hero selector */}
        <div className="panel" style={{ padding: "20px 24px", marginBottom: 20, position: "relative" }}>
          <Corners />
          <div className="dota-label" style={{ marginBottom: 8 }}>ВЫБОР ГЕРОЯ</div>
          {heroListError && (
            <div style={{ background: "rgba(163,37,30,0.15)", color: "#ff6b5e",
              border: "1px solid #a3251e", padding: "8px 12px", fontSize: 12,
              fontFamily: "monospace", marginBottom: 8 }}>
              {heroListError}
            </div>
          )}
          <div style={{ position: "relative" }}>
            <input
              ref={searchRef}
              className="dota-input mono"
              value={search || (selected && !showList ? selected.displayName : "")}
              onChange={e => { setSearch(e.target.value); setShowList(true); }}
              onFocus={() => { setSearch(""); setShowList(true); }}
              onBlur={() => setTimeout(() => setShowList(false), 150)}
              placeholder={allHeroes.length === 0 && !heroListError ? "Загрузка героев…" : "Поиск героя…"}
              style={{ width: "100%", fontSize: 15 }}
            />
            {showList && allHeroes.length > 0 && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
                background: "#0a0d12", border: "1px solid #2a2418",
                boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
                maxHeight: 280, overflowY: "auto",
              }}>
                {filtered.slice(0, 80).map(h => (
                  <div key={h.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "7px 14px", cursor: "pointer",
                      borderBottom: "1px solid #1a1812",
                      background: h.shortName === heroName ? "rgba(200,168,75,0.1)" : "transparent",
                    }}
                    onMouseDown={() => selectHero(h)}>
                    <span style={{ color: "var(--parchment)", fontSize: 14, fontFamily: "'Marcellus', serif" }}>
                      {h.displayName}
                    </span>
                    <span className="mono" style={{ fontSize: 9, color: "var(--text-mute)", marginLeft: "auto" }}>
                      {h.shortName}
                    </span>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div style={{ padding: "12px 14px", color: "var(--text-mute)", fontSize: 13 }}>
                    Герой не найден
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {loading && (
          <div className="panel" style={{ padding: 24, textAlign: "center" }}>
            <Corners />
            <div className="mono" style={{ color: "var(--text-mute)", letterSpacing: ".2em", fontSize: 13 }}>
              ЗАГРУЗКА ДАННЫХ...
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: "rgba(163,37,30,0.15)", color: "#ff6b5e",
            border: "1px solid #a3251e", padding: "12px 18px", fontSize: 14,
            fontFamily: "'Marcellus', serif", marginBottom: 16 }}>
            {error}
          </div>
        )}

        {heroData && selected && !loading && (
          <>
            {/* Hero header */}
            <div className="panel" style={{ padding: "20px 24px", marginBottom: 16, position: "relative" }}>
              <Corners />
              <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <HeroPortrait shortName={selected.shortName} displayName={selected.displayName} />
                <div>
                  <div className="display heading-gold" style={{ fontSize: "clamp(1.4rem, 4vw, 2.2rem)", lineHeight: 1 }}>
                    {heroData.hero.displayName}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <span className="mono" style={{ fontSize: 10, color: "var(--text-mute)", letterSpacing: ".15em" }}>
                      {selected.shortName}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Lane map + stats */}
            <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
              <div className="panel" style={{ padding: "18px 20px", flex: "0 0 auto", position: "relative" }}>
                <Corners />
                <div className="dota-label" style={{ marginBottom: 10 }}>ПОЗИЦИЯ НА КАРТЕ</div>
                <LaneMap positions={heroData.positions} />
                <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
                  {[1, 2, 3, 4, 5].map(pos => {
                    const d = heroData.positions.find(p => p.pos === pos);
                    if (!d || d.pick < 500) return null;
                    const wr = Math.round(d.win / d.pick * 100);
                    return (
                      <div key={pos} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ display: "inline-block", width: 10, height: 10, background: laneColor(wr) }} />
                        <span className="mono" style={{ fontSize: 9, color: "var(--text-mute)" }}>
                          {POS_LABELS[`POSITION_${pos}`]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="panel" style={{ padding: "18px 20px", flex: "1 1 220px", position: "relative" }}>
                <Corners />
                <div className="dota-label" style={{ marginBottom: 10 }}>СТАТИСТИКА</div>

                {overallWr !== null && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ color: "var(--parchment-dim)", fontSize: 13, fontFamily: "'Marcellus', serif" }}>
                        Общий винрейт
                      </span>
                      <span className="display heading-gold" style={{ fontSize: 18 }}>{overallWr}%</span>
                    </div>
                    <div style={{ height: 8, background: "#1a1412", border: "1px solid #2a2418", position: "relative" }}>
                      <div style={{
                        position: "absolute", inset: 0, right: `${100 - overallWr}%`,
                        background: overallWr >= 52 ? "#22b822" : overallWr >= 48 ? "#c8a84b" : "#8a2020",
                      }} />
                    </div>
                    <div className="mono" style={{ fontSize: 9, color: "var(--text-mute)", marginTop: 4 }}>
                      {totalPick.toLocaleString()} матчей · все брекеты
                    </div>
                  </div>
                )}

                <div className="dota-divider" style={{ margin: "10px 0" }}>
                  <span className="line" /><span className="glyph">◆</span><span className="line" />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {heroData.positions
                    .filter(p => p.pick >= 500)
                    .sort((a, b) => b.pick - a.pick)
                    .map(p => {
                      const pwr = Math.round(p.win / p.pick * 100);
                      return (
                        <div key={p.pos}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <span style={{ color: "var(--text)", fontSize: 12, fontFamily: "'Marcellus', serif" }}>
                              {POS_LABELS[`POSITION_${p.pos}`] ?? `Поз. ${p.pos}`}
                            </span>
                            <span className="mono" style={{ fontSize: 11, color: pwr >= 50 ? "#3ab860" : "#c8a84b" }}>
                              {pwr}%
                            </span>
                          </div>
                          <div style={{ height: 4, background: "#1a1412" }}>
                            <div style={{
                              height: "100%", width: `${pwr}%`,
                              background: pwr >= 52 ? "#22b822" : pwr >= 48 ? "#c8a84b" : "#8a2020",
                            }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Item build — OpenDota pre-groups by phase */}
            <div className="panel" style={{ padding: "18px 20px 22px", position: "relative" }}>
              <Corners />
              <div className="dota-label" style={{ marginBottom: 14 }}>СБОРКА ПРЕДМЕТОВ</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {phases.map(({ key, label, items }) => {
                  const sorted = Object.entries(items)
                    .filter(([name]) => !name.includes("recipe"))
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 12);
                  if (sorted.length === 0) return null;
                  return (
                    <div key={key}>
                      <div className="mono" style={{ fontSize: 10, color: "var(--text-mute)", letterSpacing: ".25em", marginBottom: 10 }}>
                        {label}
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {sorted.map(([name, count]) => (
                          <ItemIcon key={name} name={name} count={count} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {!selected && !loading && (
          <div className="panel" style={{ padding: "40px 24px", textAlign: "center", position: "relative" }}>
            <Corners />
            <div className="mono" style={{ color: "var(--text-mute)", letterSpacing: ".25em", fontSize: 13 }}>
              ВЫБЕРИ ГЕРОЯ ВЫШЕ ДЛЯ ПРОСМОТРА СТАТИСТИКИ
            </div>
          </div>
        )}

      </main>
    </>
  );
}
