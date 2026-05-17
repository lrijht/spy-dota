"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface Hero {
  id: number;
  shortName: string;
  displayName: string;
  roles: string[];
  attr: string;
  attackType: string;
}

interface BracketStat {
  label: string;
  pick: number;
  win: number;
}

interface MatchupEntry {
  hero: Hero;
  games: number;
  wins: number;
  wr: number;
}

interface HeroData {
  hero: Hero;
  brackets: BracketStat[];
  overallWr: number | null;
  totalPick: number;
  items: {
    start: Array<[string, number]>;
    early: Array<[string, number]>;
    mid:   Array<[string, number]>;
    late:  Array<[string, number]>;
  };
  abilities: string[];
  matchups: {
    easiest: MatchupEntry[];
    hardest: MatchupEntry[];
  };
}

/* ─── Constants ──────────────────────────────────────────────────────────── */

const OPENDOTA = "/api/opendota";
const CDN = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react";

const BRACKET_LABELS = [
  "Геральд", "Страж", "Рыцарь", "Архон",
  "Легенда", "Древний", "Божественный", "Бессмертный",
];

const PHASES: Array<{ key: keyof HeroData["items"]; label: string }> = [
  { key: "start", label: "СТАРТОВЫЕ ПРЕДМЕТЫ" },
  { key: "early", label: "РАННЯЯ ИГРА" },
  { key: "mid",   label: "СЕРЕДИНА ИГРЫ" },
  { key: "late",  label: "ПОЗДНЯЯ ИГРА" },
];

const ATTR_LABEL: Record<string, string> = {
  str: "СИЛА", agi: "ЛОВКОСТЬ", int: "ИНТЕЛЛЕКТ", all: "УНИВЕРСАЛ",
};
const ATTR_COLOR: Record<string, string> = {
  str: "#e05c5c", agi: "#3dbe4a", int: "#7baef5", all: "#c8a84b",
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function wrColor(wr: number) {
  if (wr >= 52) return "#22b822";
  if (wr >= 48) return "#c8a84b";
  return "#8a2020";
}

function abilityDisplay(heroShort: string, abilityName: string) {
  const prefix = heroShort + "_";
  const base = abilityName.startsWith(prefix)
    ? abilityName.slice(prefix.length)
    : abilityName;
  return base.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/* ─── SVG ────────────────────────────────────────────────────────────────── */

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

/* ─── Hero Portrait ──────────────────────────────────────────────────────── */

function HeroPortrait({ shortName, displayName }: { shortName: string; displayName: string }) {
  const [src, setSrc] = useState(`${CDN}/heroes/${shortName}_vert.jpg`);
  const [ok, setOk] = useState(true);
  return (
    <div style={{
      width: 116, height: 164,
      border: "1px solid rgba(200,168,75,0.5)",
      background: "#0a0d12", overflow: "hidden", flexShrink: 0,
    }}>
      {ok ? (
        <img src={src} alt={displayName} width={116} height={164}
          style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
          onError={() => {
            if (src.includes("_vert")) {
              setSrc(`${CDN}/heroes/${shortName}.png`);
            } else {
              setOk(false);
            }
          }} />
      ) : (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center",
          justifyContent: "center", color: "var(--text-mute)", fontSize: 11, textAlign: "center", padding: 8 }}>
          {displayName}
        </div>
      )}
    </div>
  );
}

/* ─── Ability Icon ───────────────────────────────────────────────────────── */

function AbilityIcon({ heroShort, name }: { heroShort: string; name: string }) {
  const [ok, setOk] = useState(true);
  const label = abilityDisplay(heroShort, name);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, width: 74 }}>
      <div title={label} style={{
        width: 64, height: 64,
        border: "1px solid rgba(200,168,75,0.4)",
        background: "#0a0e0a", overflow: "hidden",
        boxShadow: "0 0 0 1px rgba(0,0,0,0.6), inset 0 0 10px rgba(0,0,0,0.6)",
        flexShrink: 0,
      }}>
        {ok ? (
          <img src={`${CDN}/abilities/${name}.png`} alt={label} width={64} height={64}
            style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
            onError={() => setOk(false)} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center",
            justifyContent: "center", color: "var(--text-mute)", fontSize: 8,
            textAlign: "center", padding: 4, fontFamily: "monospace" }}>
            {label}
          </div>
        )}
      </div>
      <div className="mono" style={{
        fontSize: 8, color: "var(--parchment-dim)", letterSpacing: ".04em",
        textAlign: "center", lineHeight: 1.25,
        maxWidth: 74, overflow: "hidden",
      }}>
        {label}
      </div>
    </div>
  );
}

/* ─── Item Icon ──────────────────────────────────────────────────────────── */

function ItemIcon({ name, count }: { name: string; count: number }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    <div title={`${name} · ${count.toLocaleString()} матчей`}
      style={{ width: 46, height: 46, border: "1px solid rgba(200,168,75,0.25)",
        background: "#0a0e0a", overflow: "hidden", flexShrink: 0 }}>
      <img src={`${CDN}/items/${name}.png`} alt={name} width={46} height={46}
        style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
        onError={() => setOk(false)} />
    </div>
  );
}

/* ─── Matchup Row ────────────────────────────────────────────────────────── */

function MatchupRow({ entry }: { entry: MatchupEntry }) {
  const [imgOk, setImgOk] = useState(true);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10,
      padding: "6px 0", borderBottom: "1px solid rgba(200,168,75,0.08)" }}>
      <div style={{ width: 48, height: 27, flexShrink: 0, background: "#0a0d12",
        overflow: "hidden", border: "1px solid rgba(200,168,75,0.2)" }}>
        {imgOk && (
          <img src={`${CDN}/heroes/${entry.hero.shortName}.png`}
            alt={entry.hero.displayName} width={48} height={27}
            style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
            onError={() => setImgOk(false)} />
        )}
      </div>
      <span style={{ flex: 1, fontFamily: "'Marcellus', serif", fontSize: 13,
        color: "var(--parchment)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
        {entry.hero.displayName}
      </span>
      <span className="mono" style={{ fontSize: 13, fontWeight: 700,
        color: wrColor(entry.wr), flexShrink: 0 }}>
        {entry.wr}%
      </span>
      <span className="mono" style={{ fontSize: 9, color: "var(--text-mute)",
        width: 58, textAlign: "right", flexShrink: 0 }}>
        {entry.games.toLocaleString()}
      </span>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */

export default function HeroPage() {
  const params   = useParams();
  const router   = useRouter();
  const heroName = (params.name as string) ?? "";

  const [rawStats,      setRawStats]      = useState<any[]>([]);
  const [idMap,         setIdMap]         = useState<Record<number, string>>({});
  const [heroAbilities, setHeroAbilities] = useState<Record<string, string[]>>({});
  const [allHeroes,     setAllHeroes]     = useState<Hero[]>([]);
  const [heroById,      setHeroById]      = useState<Record<number, Hero>>({});
  const [heroListError, setHeroListError] = useState("");
  const [heroData,      setHeroData]      = useState<HeroData | null>(null);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const [search,        setSearch]        = useState("");
  const [showList,      setShowList]      = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  /* ── Global fetch: heroStats + items + hero_abilities ── */
  useEffect(() => {
    Promise.all([
      fetch(`${OPENDOTA}/heroStats`).then(r => { if (!r.ok) throw new Error(`heroStats ${r.status}`); return r.json(); }),
      fetch(`${OPENDOTA}/constants/items`).then(r => { if (!r.ok) throw new Error(`items ${r.status}`); return r.json(); }),
      fetch(`${OPENDOTA}/constants/hero_abilities`).then(r => r.ok ? r.json() : {} ),
    ]).then(([stats, itemConst, abilitiesConst]) => {
      const iMap: Record<number, string> = {};
      for (const [name, val] of Object.entries(itemConst as Record<string, any>)) {
        if (val?.id != null) iMap[val.id] = name.replace(/^item_/, "");
      }
      setIdMap(iMap);

      const aMap: Record<string, string[]> = {};
      for (const [key, data] of Object.entries(abilitiesConst as Record<string, any>)) {
        aMap[key] = ((data as any).abilities ?? []).filter(
          (a: string) => !a.startsWith("special_bonus_") && !a.startsWith("generic_")
        );
      }
      setHeroAbilities(aMap);

      const heroes: Hero[] = (stats as any[])
        .filter(h => h.localized_name)
        .map(h => ({
          id:          h.id,
          shortName:   h.name.replace("npc_dota_hero_", ""),
          displayName: h.localized_name,
          roles:       h.roles ?? [],
          attr:        h.primary_attr ?? "str",
          attackType:  h.attack_type  ?? "Melee",
        }))
        .sort((a, b) => a.displayName.localeCompare(b.displayName));

      setAllHeroes(heroes);
      setRawStats(stats);

      const byId: Record<number, Hero> = {};
      heroes.forEach(h => { byId[h.id] = h; });
      setHeroById(byId);
    }).catch((e: any) => setHeroListError(e.message ?? "Ошибка загрузки"));
  }, []);

  /* ── Per-hero fetch: itemPopularity + matchups ── */
  useEffect(() => {
    if (!heroName || !rawStats.length || !Object.keys(idMap).length || !Object.keys(heroById).length) return;
    const hs = rawStats.find(h => h.name.replace("npc_dota_hero_", "") === heroName);
    if (!hs) return;

    setLoading(true);
    setError("");
    setHeroData(null);

    Promise.all([
      fetch(`${OPENDOTA}/heroes/${hs.id}/itemPopularity`).then(r => { if (!r.ok) throw new Error(`itemPopularity ${r.status}`); return r.json(); }),
      fetch(`${OPENDOTA}/heroes/${hs.id}/matchups`).then(r => r.ok ? r.json() : []),
    ]).then(([pop, rawMatchups]) => {
      function resolvePhase(phase: Record<string, number>): Array<[string, number]> {
        return Object.entries(phase)
          .map(([idStr, count]) => [idMap[Number(idStr)] ?? "", count] as [string, number])
          .filter(([name]) => name && !name.includes("recipe") && !name.includes("river_painter"))
          .sort(([, a], [, b]) => b - a)
          .slice(0, 14);
      }

      const brackets: BracketStat[] = BRACKET_LABELS.map((label, i) => ({
        label,
        pick: hs[`${i + 1}_pick`] ?? 0,
        win:  hs[`${i + 1}_win`]  ?? 0,
      })).filter(b => b.pick > 100);

      const totalPick = brackets.reduce((s, b) => s + b.pick, 0);
      const totalWin  = brackets.reduce((s, b) => s + b.win,  0);
      const overallWr = totalPick > 0 ? Math.round(totalWin / totalPick * 100) : null;

      const withWr: MatchupEntry[] = (rawMatchups as any[])
        .filter((m: any) => m.games_played >= 300 && heroById[m.hero_id])
        .map((m: any) => ({
          hero:  heroById[m.hero_id],
          games: m.games_played,
          wins:  m.wins,
          wr:    Math.round(m.wins / m.games_played * 100),
        }));

      const heroKey = `npc_dota_hero_${heroName}`;
      const abilities = heroAbilities[heroKey] ?? [];

      const hero: Hero = {
        id:          hs.id,
        shortName:   heroName,
        displayName: hs.localized_name,
        roles:       hs.roles ?? [],
        attr:        hs.primary_attr ?? "str",
        attackType:  hs.attack_type  ?? "Melee",
      };

      setHeroData({
        hero,
        brackets,
        overallWr,
        totalPick,
        items: {
          start: resolvePhase(pop.start_game_items ?? {}),
          early: resolvePhase(pop.early_game_items ?? {}),
          mid:   resolvePhase(pop.mid_game_items   ?? {}),
          late:  resolvePhase(pop.late_game_items  ?? {}),
        },
        abilities,
        matchups: {
          easiest: [...withWr].sort((a, b) => b.wr - a.wr).slice(0, 8),
          hardest: [...withWr].sort((a, b) => a.wr - b.wr).slice(0, 8),
        },
      });
    })
    .catch((e: any) => setError(e.message ?? "Ошибка загрузки"))
    .finally(() => setLoading(false));
  }, [heroName, rawStats, idMap, heroById, heroAbilities]);

  const selected = allHeroes.find(h => h.shortName === heroName) ?? null;
  const filtered = search.length >= 1
    ? allHeroes.filter(h => h.displayName.toLowerCase().includes(search.toLowerCase()))
    : allHeroes;

  function selectHero(h: Hero) {
    setSearch(""); setShowList(false);
    router.push(`/hero/${h.shortName}`);
  }

  /* ── Render ── */
  return (
    <>
      <div className="stage-bg" />
      <main style={{ minHeight: "100vh", padding: "1.5rem 1rem", maxWidth: 1100, margin: "0 auto" }}>

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="display heading-gold" style={{ fontSize: 18, letterSpacing: ".2em" }}>SPY DOTA</div>
            <div className="mono" style={{ fontSize: 10, color: "var(--text-mute)", letterSpacing: ".25em" }}>/ БАЗА ДАННЫХ ГЕРОЕВ</div>
          </div>
          <button className="dota-btn sm" onClick={() => router.push("/")}>← Главная</button>
        </div>

        {/* Hero selector */}
        <div className="panel" style={{ padding: "16px 20px", marginBottom: 20, position: "relative" }}>
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
                      {h.roles.join(" · ")}
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

        {/* Loading */}
        {loading && (
          <div className="panel" style={{ padding: 28, textAlign: "center" }}>
            <Corners />
            <div className="mono" style={{ color: "var(--text-mute)", letterSpacing: ".2em", fontSize: 13 }}>
              ЗАГРУЗКА ДАННЫХ...
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: "rgba(163,37,30,0.15)", color: "#ff6b5e", border: "1px solid #a3251e",
            padding: "12px 18px", fontSize: 14, fontFamily: "'Marcellus', serif", marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Hero content */}
        {heroData && !loading && (
          <div className="anim-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* ── Hero showcase ── */}
            <div className="panel" style={{ padding: "24px 28px", position: "relative", overflow: "hidden" }}>
              <Corners />
              {/* Attribute glow */}
              <div style={{
                position: "absolute", right: 0, top: 0, bottom: 0, width: "50%", pointerEvents: "none",
                background: `radial-gradient(ellipse at 80% 50%, ${ATTR_COLOR[heroData.hero.attr] ?? "#c8a84b"}14 0%, transparent 65%)`,
              }} />
              <div style={{ display: "flex", alignItems: "center", gap: 24, position: "relative", flexWrap: "wrap" }}>

                <HeroPortrait shortName={heroData.hero.shortName} displayName={heroData.hero.displayName} />

                <div style={{ flex: 1, minWidth: 200 }}>
                  <div className="display heading-gold"
                    style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", lineHeight: 1, marginBottom: 10 }}>
                    {heroData.hero.displayName}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <span className="mono" style={{
                      fontSize: 11, letterSpacing: ".22em", fontWeight: 600,
                      color: ATTR_COLOR[heroData.hero.attr] ?? "var(--gold)",
                    }}>
                      {ATTR_LABEL[heroData.hero.attr] ?? heroData.hero.attr}
                    </span>
                    <span className="mono" style={{ fontSize: 10, color: "var(--text-mute)", letterSpacing: ".15em" }}>
                      · {heroData.hero.attackType.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {heroData.hero.roles.map(role => (
                      <span key={role} className="mono" style={{
                        fontSize: 9, letterSpacing: ".15em", padding: "3px 9px",
                        border: "1px solid rgba(200,168,75,0.35)", color: "var(--parchment-dim)",
                      }}>
                        {role.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>

                {heroData.overallWr !== null && (
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div className="mono" style={{ fontSize: 10, color: "var(--text-mute)", letterSpacing: ".2em" }}>
                      ОБЩИЙ ВИНРЕЙТ
                    </div>
                    <div className="display" style={{
                      fontSize: "clamp(2.4rem, 6vw, 3.8rem)",
                      color: wrColor(heroData.overallWr), lineHeight: 1,
                    }}>
                      {heroData.overallWr}%
                    </div>
                    <div className="mono" style={{ fontSize: 9, color: "var(--text-mute)", marginTop: 4 }}>
                      {heroData.totalPick.toLocaleString()} матчей
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Abilities ── */}
            {heroData.abilities.length > 0 && (
              <div className="panel" style={{ padding: "18px 24px", position: "relative" }}>
                <Corners />
                <div className="dota-label" style={{ marginBottom: 16 }}>СПОСОБНОСТИ</div>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  {heroData.abilities.map(name => (
                    <AbilityIcon key={name} heroShort={heroData.hero.shortName} name={name} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Two-column: brackets + items ── */}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 16 }}>

              {/* Bracket winrates */}
              <div className="panel" style={{ padding: "18px 22px", position: "relative" }}>
                <Corners />
                <div className="dota-label" style={{ marginBottom: 16 }}>СТАТИСТИКА ПО БРЕКЕТАМ</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {heroData.brackets.map(b => {
                    const wr    = Math.round(b.win / b.pick * 100);
                    const color = wrColor(wr);
                    return (
                      <div key={b.label}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                          <span style={{ fontFamily: "'Marcellus', serif", fontSize: 13, color: "var(--parchment-dim)" }}>
                            {b.label}
                          </span>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                            <span className="mono" style={{ fontSize: 9, color: "var(--text-mute)" }}>
                              {b.pick.toLocaleString()}
                            </span>
                            <span className="mono" style={{ fontSize: 14, fontWeight: 700, color }}>
                              {wr}%
                            </span>
                          </div>
                        </div>
                        {/* Bar */}
                        <div style={{ height: 5, background: "#1a1412", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${wr}%`, background: color,
                            borderRadius: 2, transition: "width .5s ease" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Item builds */}
              <div className="panel" style={{ padding: "18px 22px", position: "relative" }}>
                <Corners />
                <div className="dota-label" style={{ marginBottom: 16 }}>СБОРКА ПРЕДМЕТОВ</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  {PHASES.map(({ key, label }) => {
                    const items = heroData.items[key];
                    if (!items.length) return null;
                    return (
                      <div key={key}>
                        <div className="mono" style={{ fontSize: 9, color: "var(--text-mute)",
                          letterSpacing: ".2em", marginBottom: 8 }}>
                          {label}
                        </div>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          {items.map(([name, count]) => (
                            <ItemIcon key={name} name={name} count={count} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Matchups ── */}
            {(heroData.matchups.easiest.length > 0 || heroData.matchups.hardest.length > 0) && (
              <div className="panel" style={{ padding: "18px 22px", position: "relative" }}>
                <Corners />
                <div className="dota-label" style={{ marginBottom: 16 }}>ПРОТИВОСТОЯНИЯ</div>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 28 }}>

                  <div>
                    <div className="mono" style={{
                      fontSize: 9, letterSpacing: ".2em", marginBottom: 10,
                      paddingBottom: 8, borderBottom: "1px solid rgba(34,184,34,0.25)",
                      color: "#22b822",
                    }}>
                      ▲ ПОБЕЖДАЕТ ЧАЩЕ
                    </div>
                    {heroData.matchups.easiest.map(e => <MatchupRow key={e.hero.id} entry={e} />)}
                  </div>

                  <div>
                    <div className="mono" style={{
                      fontSize: 9, letterSpacing: ".2em", marginBottom: 10,
                      paddingBottom: 8, borderBottom: "1px solid rgba(138,32,32,0.3)",
                      color: "#8a2020",
                    }}>
                      ▼ СЛОЖНЫЕ ПРОТИВНИКИ
                    </div>
                    {heroData.matchups.hardest.map(e => <MatchupRow key={e.hero.id} entry={e} />)}
                  </div>

                </div>
              </div>
            )}

          </div>
        )}

        {/* Empty state */}
        {!selected && !loading && (
          <div className="panel" style={{ padding: "60px 24px", textAlign: "center", position: "relative" }}>
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
