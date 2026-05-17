"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface Hero {
  id: number;
  shortName: string;
  displayName: string;
  roles: string[];
}

interface BracketStat {
  label: string;
  pick: number;
  win: number;
}

interface HeroData {
  hero: Hero;
  brackets: BracketStat[];
  items: {
    start: Array<[string, number]>;
    early: Array<[string, number]>;
    mid:   Array<[string, number]>;
    late:  Array<[string, number]>;
  };
}

/* ─── Constants ──────────────────────────────────────────────────────────── */

const OPENDOTA = "/api/opendota";
const CDN = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react";

const BRACKET_LABELS = [
  "Геральд", "Страж", "Рыцарь", "Архон",
  "Легенда", "Древний", "Божественный", "Бессмертный",
];
const PHASE_LABELS = ["Стартовые предметы", "Ранняя игра", "Середина игры", "Поздняя игра"];

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

/* ─── Item Icon ──────────────────────────────────────────────────────────── */

function ItemIcon({ name, count }: { name: string; count: number }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    <div title={`${name} · ${count.toLocaleString()} матчей`}
      style={{ width: 44, height: 44, border: "1px solid rgba(200,168,75,0.3)",
        background: "#0a0e0a", overflow: "hidden", flexShrink: 0 }}>
      <img src={`${CDN}/items/${name}.png`} alt={name} width={44} height={44}
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
  const [idMap, setIdMap] = useState<Record<number, string>>({}); // item numeric id → short name
  const [allHeroes, setAllHeroes] = useState<Hero[]>([]);
  const [heroListError, setHeroListError] = useState("");
  const [search, setSearch] = useState("");
  const [showList, setShowList] = useState(false);
  const [heroData, setHeroData] = useState<HeroData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Fetch heroStats + item constants once on mount
  useEffect(() => {
    Promise.all([
      fetch(`${OPENDOTA}/heroStats`).then(r => { if (!r.ok) throw new Error(`heroStats ${r.status}`); return r.json(); }),
      fetch(`${OPENDOTA}/constants/items`).then(r => { if (!r.ok) throw new Error(`constants/items ${r.status}`); return r.json(); }),
    ]).then(([stats, itemConst]) => {
      // Build id → shortName map from constants
      const map: Record<number, string> = {};
      for (const [name, val] of Object.entries(itemConst as Record<string, any>)) {
        if (val?.id != null) map[val.id] = name.replace(/^item_/, "");
      }
      setIdMap(map);
      setRawStats(stats);

      const heroes: Hero[] = (stats as any[])
        .filter(h => h.localized_name)
        .map(h => ({
          id: h.id,
          shortName: h.name.replace("npc_dota_hero_", ""),
          displayName: h.localized_name,
          roles: h.roles ?? [],
        }))
        .sort((a, b) => a.displayName.localeCompare(b.displayName));
      setAllHeroes(heroes);
    }).catch((e: any) => setHeroListError(e.message ?? "Ошибка загрузки героев"));
  }, []);

  // Fetch item popularity when hero + idMap ready
  useEffect(() => {
    if (!heroName || rawStats.length === 0 || Object.keys(idMap).length === 0) return;
    const hs = rawStats.find(h => h.name.replace("npc_dota_hero_", "") === heroName);
    if (!hs) return;

    setLoading(true);
    setError("");
    setHeroData(null);

    fetch(`${OPENDOTA}/heroes/${hs.id}/itemPopularity`)
      .then(r => { if (!r.ok) throw new Error(`itemPopularity ${r.status}`); return r.json(); })
      .then(pop => {
        function resolvePhase(phase: Record<string, number>): Array<[string, number]> {
          return Object.entries(phase)
            .map(([idStr, count]) => [idMap[Number(idStr)] ?? "", count] as [string, number])
            .filter(([name]) => name && !name.includes("recipe"))
            .sort(([, a], [, b]) => b - a)
            .slice(0, 12);
        }

        const brackets: BracketStat[] = BRACKET_LABELS.map((label, i) => ({
          label,
          pick: hs[`${i + 1}_pick`] ?? 0,
          win:  hs[`${i + 1}_win`]  ?? 0,
        })).filter(b => b.pick > 100);

        setHeroData({
          hero: { id: hs.id, shortName: heroName, displayName: hs.localized_name, roles: hs.roles ?? [] },
          brackets,
          items: {
            start: resolvePhase(pop.start_game_items ?? {}),
            early: resolvePhase(pop.early_game_items ?? {}),
            mid:   resolvePhase(pop.mid_game_items   ?? {}),
            late:  resolvePhase(pop.late_game_items  ?? {}),
          },
        });
      })
      .catch((e: any) => setError(e.message ?? "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [heroName, rawStats, idMap]);

  const selected = allHeroes.find(h => h.shortName === heroName) ?? null;
  const filtered = search.length >= 1
    ? allHeroes.filter(h => h.displayName.toLowerCase().includes(search.toLowerCase()))
    : allHeroes;

  function selectHero(h: Hero) {
    setSearch(""); setShowList(false);
    router.push(`/hero/${h.shortName}`);
  }

  const totalPick = heroData?.brackets.reduce((a, b) => a + b.pick, 0) ?? 0;
  const totalWin  = heroData?.brackets.reduce((a, b) => a + b.win,  0) ?? 0;
  const overallWr = totalPick > 0 ? Math.round(totalWin / totalPick * 100) : null;

  const phases = heroData ? [
    { key: "start", label: PHASE_LABELS[0], items: heroData.items.start },
    { key: "early", label: PHASE_LABELS[1], items: heroData.items.early },
    { key: "mid",   label: PHASE_LABELS[2], items: heroData.items.mid   },
    { key: "late",  label: PHASE_LABELS[3], items: heroData.items.late  },
  ] : [];

  function wrColor(wr: number) {
    if (wr >= 52) return "#22b822";
    if (wr >= 48) return "#c8a84b";
    return "#8a2020";
  }

  return (
    <>
      <div className="stage-bg" />
      <main style={{ minHeight: "100vh", padding: "1.5rem 1rem", maxWidth: 960, margin: "0 auto" }}>

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="display heading-gold" style={{ fontSize: 18, letterSpacing: ".2em" }}>SPY DOTA</div>
            <div className="mono" style={{ fontSize: 10, color: "var(--text-mute)", letterSpacing: ".25em" }}>/ БАЗА ДАННЫХ ГЕРОЕВ</div>
          </div>
          <button className="dota-btn sm" onClick={() => router.push("/")}>← Главная</button>
        </div>

        {/* Hero selector */}
        <div className="panel" style={{ padding: "20px 24px", marginBottom: 20, position: "relative" }}>
          <Corners />
          <div className="dota-label" style={{ marginBottom: 8 }}>ВЫБОР ГЕРОЯ</div>
          {heroListError && (
            <div style={{ background: "rgba(163,37,30,0.15)", color: "#ff6b5e", border: "1px solid #a3251e",
              padding: "8px 12px", fontSize: 12, fontFamily: "monospace", marginBottom: 8 }}>
              {heroListError}
            </div>
          )}
          <div style={{ position: "relative" }}>
            <input ref={searchRef} className="dota-input mono"
              value={search || (selected && !showList ? selected.displayName : "")}
              onChange={e => { setSearch(e.target.value); setShowList(true); }}
              onFocus={() => { setSearch(""); setShowList(true); }}
              onBlur={() => setTimeout(() => setShowList(false), 150)}
              placeholder={allHeroes.length === 0 && !heroListError ? "Загрузка героев…" : "Поиск героя…"}
              style={{ width: "100%", fontSize: 15 }} />
            {showList && allHeroes.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
                background: "#0a0d12", border: "1px solid #2a2418",
                boxShadow: "0 8px 32px rgba(0,0,0,0.8)", maxHeight: 280, overflowY: "auto" }}>
                {filtered.slice(0, 80).map(h => (
                  <div key={h.id} onMouseDown={() => selectHero(h)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 14px",
                      cursor: "pointer", borderBottom: "1px solid #1a1812",
                      background: h.shortName === heroName ? "rgba(200,168,75,0.1)" : "transparent" }}>
                    <span style={{ color: "var(--parchment)", fontSize: 14, fontFamily: "'Marcellus', serif" }}>
                      {h.displayName}
                    </span>
                    <span className="mono" style={{ fontSize: 9, color: "var(--text-mute)", marginLeft: "auto" }}>
                      {h.shortName}
                    </span>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div style={{ padding: "12px 14px", color: "var(--text-mute)", fontSize: 13 }}>Герой не найден</div>
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
          <div style={{ background: "rgba(163,37,30,0.15)", color: "#ff6b5e", border: "1px solid #a3251e",
            padding: "12px 18px", fontSize: 14, fontFamily: "'Marcellus', serif", marginBottom: 16 }}>
            {error}
          </div>
        )}

        {heroData && selected && !loading && (
          <>
            {/* Hero header */}
            <div className="panel" style={{ padding: "20px 24px", marginBottom: 16, position: "relative" }}>
              <Corners />
              <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
                <HeroPortrait shortName={selected.shortName} displayName={selected.displayName} />
                <div style={{ flex: 1 }}>
                  <div className="display heading-gold" style={{ fontSize: "clamp(1.4rem, 4vw, 2.2rem)", lineHeight: 1 }}>
                    {heroData.hero.displayName}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                    {heroData.hero.roles.map(role => (
                      <span key={role} className="mono" style={{
                        fontSize: 9, letterSpacing: ".15em", padding: "2px 7px",
                        border: "1px solid rgba(200,168,75,0.35)", color: "var(--parchment-dim)",
                      }}>{role.toUpperCase()}</span>
                    ))}
                  </div>
                </div>
                {overallWr !== null && (
                  <div style={{ textAlign: "right" }}>
                    <div className="mono" style={{ fontSize: 10, color: "var(--text-mute)", letterSpacing: ".2em" }}>ВИНРЕЙТ</div>
                    <div className="display" style={{ fontSize: 36, color: wrColor(overallWr), lineHeight: 1 }}>{overallWr}%</div>
                    <div className="mono" style={{ fontSize: 9, color: "var(--text-mute)" }}>{totalPick.toLocaleString()} матчей</div>
                  </div>
                )}
              </div>
            </div>

            {/* Bracket win rates */}
            <div className="panel" style={{ padding: "18px 20px", marginBottom: 16, position: "relative" }}>
              <Corners />
              <div className="dota-label" style={{ marginBottom: 12 }}>СТАТИСТИКА ПО БРЕКЕТАМ</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {heroData.brackets.map(b => {
                  const wr = Math.round(b.win / b.pick * 100);
                  return (
                    <div key={b.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ color: "var(--parchment-dim)", fontSize: 12, fontFamily: "'Marcellus', serif" }}>
                          {b.label}
                        </span>
                        <span className="mono" style={{ fontSize: 11, color: wrColor(wr) }}>{wr}%</span>
                      </div>
                      <div style={{ height: 4, background: "#1a1412" }}>
                        <div style={{ height: "100%", width: `${wr}%`, background: wrColor(wr) }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Item builds */}
            <div className="panel" style={{ padding: "18px 20px 22px", position: "relative" }}>
              <Corners />
              <div className="dota-label" style={{ marginBottom: 14 }}>СБОРКА ПРЕДМЕТОВ</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {phases.map(({ key, label, items }) => {
                  if (items.length === 0) return null;
                  return (
                    <div key={key}>
                      <div className="mono" style={{ fontSize: 10, color: "var(--text-mute)", letterSpacing: ".25em", marginBottom: 10 }}>
                        {label}
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {items.map(([name, count]) => (
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
