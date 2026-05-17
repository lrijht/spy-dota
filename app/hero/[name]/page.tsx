"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface StratzHero {
  id: number;
  shortName: string;
  displayName: string;
  stats: { primaryAttribute: string };
}

interface ItemStat {
  item: { id: number; name: string } | null;
  matchCount: number;
  winCount: number;
}

interface LaneStat {
  lane: string;
  matchCount: number;
  winCount: number;
}

/* ─── Constants ──────────────────────────────────────────────────────────── */

// Phase 0=start, 1=early, 2=mid, 3=late
const ITEM_PHASE: Record<string, number> = {
  // Starting
  tango: 0, clarity: 0, faerie_fire: 0, enchanted_mango: 0,
  healing_salve: 0, flask: 0, iron_branch: 0, branches: 0,
  gauntlets: 0, slippers: 0, circlet: 0, mantle: 0,
  quelling_blade: 0, stout_shield: 0, ring_of_protection: 0,
  orb_of_venom: 0, blight_stone: 0, infused_raindrops: 0,
  magic_stick: 0, ward_observer: 0, ward_sentry: 0,
  smoke_of_deceit: 0, tome_of_knowledge: 0, cheese: 0,
  // Early game
  boots: 1, wind_lace: 1, phase_boots: 1, tranquil_boots: 1,
  power_treads: 1, arcane_boots: 1, null_talisman: 1, wraith_band: 1,
  bracer: 1, soul_ring: 1, magic_wand: 1, bottle: 1,
  ring_of_basilius: 1, veil_of_discord: 1, drum_of_endurance: 1,
  urn_of_shadows: 1, spirit_vessel: 1, hand_of_midas: 1,
  dragon_lance: 1, maelstrom: 1, falcon_blade: 1, echo_sabre: 1,
  morbid_mask: 1, mask_of_madness: 1, helm_of_iron_will: 1,
  meteor_hammer: 1, enchanted_quiver: 1, blade_mail: 1,
  rod_of_atos: 1, vladmir: 1, solar_crest: 1, medallion_of_courage: 1,
  ancient_janggo: 1,
  // Mid game
  blink: 2, force_staff: 2, black_king_bar: 2, bloodstone: 2,
  shadow_blade: 2, silver_edge: 2, desolator: 2, mjollnir: 2,
  sange: 2, yasha: 2, kaya: 2, diffusal_blade: 2, manta: 2,
  hood: 2, pipe: 2, mekansm: 2, guardian_greaves: 2,
  aghanims_scepter: 2, ultimate_scepter: 2, aghanims_shard: 2,
  helm_of_the_dominator: 2, helm_of_the_overlord: 2,
  crystalys: 2, lesser_crit: 2, ethereal_blade: 2, witch_blade: 2,
  parasma: 2, gleipnir: 2, travel_boots: 2, disperser: 2, pavise: 2,
  phylactery: 2, sange_and_yasha: 2, kaya_and_sange: 2, yasha_and_kaya: 2,
  bloodthorn: 2, eternal_shroud: 2, orchid: 2,
  // Late game
  heart: 3, butterfly: 3, satanic: 3, abyssal_blade: 3,
  divine_rapier: 3, moon_shard: 3, skadi: 3, daedalus: 3,
  monkey_king_bar: 3, shivas_guard: 3, assault: 3, radiance: 3,
  sphere: 3, sheepstick: 3, refresher: 3, octarine_core: 3,
  travel_boots_2: 3, eye_of_skadi: 3, revenants_brooch: 3,
  apex: 3, nullifier: 3, swift_blink: 3, overwhelming_blink: 3,
  arcane_blink: 3,
};

const PHASE_LABELS = ["Стартовые предметы", "Ранняя игра", "Середина игры", "Поздняя игра"];
const LANE_LABELS: Record<string, string> = {
  SAFE_LANE: "Лёгкая линия",
  MID_LANE: "Середина",
  OFF_LANE: "Сложная линия",
  JUNGLE: "Лес",
  ROAMING: "Роумер",
};

const ATTR_COLOR: Record<string, string> = {
  STRENGTH: "#e05030",
  AGILITY: "#3ab860",
  INTELLIGENCE: "#5080e0",
  ALL: "#20b8b8",
};

const ATTR_LABEL: Record<string, string> = {
  STRENGTH: "СИЛ",
  AGILITY: "ЛОВ",
  INTELLIGENCE: "ИНТ",
  ALL: "УНИ",
};

/* ─── GraphQL helpers ────────────────────────────────────────────────────── */

const HEROES_QUERY = `{ constants { heroes { id shortName displayName stats { primaryAttribute } } } }`;

const STATS_QUERY = `
query HeroStats($heroId: Short!) {
  heroStats {
    itemFullPurchase(heroId: $heroId, bracketBasicIds: LEGEND_ANCIENT) {
      item { id name }
      matchCount
      winCount
    }
    laneOutcome(heroId: $heroId) {
      lane
      matchCount
      winCount
    }
  }
  constants {
    hero(id: $heroId) {
      displayName
      stats { primaryAttribute }
    }
  }
}`;

async function stratz(query: string, variables?: object) {
  const res = await fetch("/api/stratz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

/* ─── SVG Components ─────────────────────────────────────────────────────── */

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

/* ─── Lane Map SVG ───────────────────────────────────────────────────────── */

function laneColor(wr: number | null) {
  if (wr === null) return "#1a2a1a";
  if (wr >= 55) return "#22b822";
  if (wr >= 50) return "#1a7a1a";
  if (wr >= 45) return "#c8a84b";
  return "#8a2020";
}

function LaneMap({ lanes }: { lanes: LaneStat[] }) {
  function stat(name: string) {
    const s = lanes.find(l => l.lane === name);
    if (!s || s.matchCount < 200) return null;
    return Math.round((s.winCount / s.matchCount) * 100);
  }

  const safe = stat("SAFE_LANE");
  const mid = stat("MID_LANE");
  const off = stat("OFF_LANE");
  const jungle = stat("JUNGLE");

  return (
    <svg viewBox="0 0 200 200" width={190} height={190}
      style={{ border: "1px solid rgba(200,168,75,0.3)", display: "block", flexShrink: 0 }}>
      {/* Background */}
      <rect width="200" height="200" fill="#040e06" />

      {/* Lane fills */}
      <path d="M28,172 L172,172 L172,28" stroke={laneColor(safe)} strokeWidth="18" fill="none"
        strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
      <path d="M28,172 L172,28" stroke={laneColor(mid)} strokeWidth="18" fill="none" opacity="0.85" />
      <path d="M28,172 L28,28 L172,28" stroke={laneColor(off)} strokeWidth="18" fill="none"
        strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />

      {/* Jungle dots */}
      {jungle !== null && (
        <>
          <circle cx="60" cy="140" r="8" fill={laneColor(jungle)} opacity="0.75" />
          <circle cx="140" cy="60" r="8" fill={laneColor(jungle)} opacity="0.75" />
        </>
      )}

      {/* River */}
      <path d="M155,120 L120,155" stroke="#0a3a4a" strokeWidth="9" fill="none" opacity="0.9" />
      <path d="M80,45 L45,80" stroke="#0a3a4a" strokeWidth="9" fill="none" opacity="0.9" />

      {/* Bases */}
      <circle cx="28" cy="172" r="11" fill="#c8a84b" />
      <text x="28" y="176" textAnchor="middle" fill="#000" fontSize="8" fontFamily="monospace" fontWeight="bold">R</text>
      <circle cx="172" cy="28" r="11" fill="#a3251e" />
      <text x="172" y="32" textAnchor="middle" fill="#fff" fontSize="8" fontFamily="monospace" fontWeight="bold">D</text>

      {/* Win rate labels */}
      {safe !== null && (
        <text x="152" y="190" textAnchor="middle" fill="#d8c894" fontSize="10" fontFamily="monospace">{safe}%</text>
      )}
      {mid !== null && (
        <text x="105" y="98" textAnchor="middle" fill="#d8c894" fontSize="10" fontFamily="monospace"
          transform="rotate(-45 105 98)">{mid}%</text>
      )}
      {off !== null && (
        <text x="12" y="95" textAnchor="middle" fill="#d8c894" fontSize="10" fontFamily="monospace"
          transform="rotate(-90 12 95)">{off}%</text>
      )}
      {jungle !== null && (
        <text x="60" y="158" textAnchor="middle" fill="#d8c894" fontSize="8" fontFamily="monospace">{jungle}%</text>
      )}
    </svg>
  );
}

/* ─── Item Icon ──────────────────────────────────────────────────────────── */

const CDN = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react";

function ItemIcon({ name, wr, count }: { name: string; wr: number; count: number }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    <div title={`${name} — ${wr}% побед (${count.toLocaleString()} матчей)`}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <div style={{
        width: 44, height: 44,
        border: `1px solid ${wr >= 50 ? "rgba(34,184,34,0.5)" : "rgba(200,168,75,0.3)"}`,
        background: "#0a0e0a", overflow: "hidden", flexShrink: 0,
      }}>
        <img src={`${CDN}/items/${name}.png`} alt={name} width={44} height={44}
          style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
          onError={() => setOk(false)} />
      </div>
      <span className="mono" style={{
        fontSize: 9, color: wr >= 52 ? "#3ab860" : wr >= 48 ? "#c8a84b" : "#8a6060",
        letterSpacing: ".05em",
      }}>{wr}%</span>
    </div>
  );
}

/* ─── Hero portrait ──────────────────────────────────────────────────────── */

function HeroPortrait({ shortName, displayName }: { shortName: string; displayName: string }) {
  const [ok, setOk] = useState(true);
  return (
    <div style={{
      width: 120, height: 68, border: "1px solid rgba(200,168,75,0.5)",
      background: "#0a0d12", overflow: "hidden", flexShrink: 0,
    }}>
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

  const [allHeroes, setAllHeroes] = useState<StratzHero[]>([]);
  const [search, setSearch] = useState("");
  const [showList, setShowList] = useState(false);
  const [stats, setStats] = useState<{
    items: ItemStat[];
    lanes: LaneStat[];
    displayName: string;
    attr: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Fetch all heroes from Stratz on mount
  useEffect(() => {
    stratz(HEROES_QUERY).then(data => {
      const heroes: StratzHero[] = data?.data?.constants?.heroes ?? [];
      setAllHeroes(heroes.sort((a, b) => a.displayName.localeCompare(b.displayName)));
    }).catch(() => {});
  }, []);

  // Fetch stats when heroName or allHeroes changes
  useEffect(() => {
    if (!heroName || allHeroes.length === 0) return;
    const hero = allHeroes.find(h => h.shortName === heroName);
    if (!hero) return;
    setLoading(true);
    setError("");
    setStats(null);
    stratz(STATS_QUERY, { heroId: hero.id }).then(data => {
      const hd = data?.data;
      if (!hd) throw new Error("Нет данных");
      setStats({
        items: hd.heroStats?.itemFullPurchase ?? [],
        lanes: hd.heroStats?.laneOutcome ?? [],
        displayName: hd.constants?.hero?.displayName ?? hero.displayName,
        attr: hd.constants?.hero?.stats?.primaryAttribute ?? hero.stats?.primaryAttribute ?? "ALL",
      });
    }).catch((e: any) => {
      setError(e.message ?? "Ошибка загрузки");
    }).finally(() => setLoading(false));
  }, [heroName, allHeroes]);

  const selected = allHeroes.find(h => h.shortName === heroName) ?? null;

  const filtered = search.length >= 1
    ? allHeroes.filter(h => h.displayName.toLowerCase().includes(search.toLowerCase()))
    : allHeroes;

  function selectHero(h: StratzHero) {
    setSearch("");
    setShowList(false);
    router.push(`/hero/${h.shortName}`);
  }

  // Group items into phases
  function groupItems() {
    const valid = stats!.items.filter(s => s.item && !s.item.name.startsWith("recipe_") && s.matchCount > 100);
    const phases: ItemStat[][] = [[], [], [], []];
    for (const s of valid) {
      const phase = ITEM_PHASE[s.item!.name] ?? 2;
      phases[phase].push(s);
    }
    // Sort each phase by win rate desc, then match count desc
    for (const phase of phases) {
      phase.sort((a, b) => {
        const awr = a.winCount / a.matchCount;
        const bwr = b.winCount / b.matchCount;
        return bwr - awr || b.matchCount - a.matchCount;
      });
    }
    return phases;
  }

  // Overall win rate from lanes
  function overallWr() {
    if (!stats) return null;
    const total = stats.lanes.reduce((a, l) => a + l.matchCount, 0);
    const wins = stats.lanes.reduce((a, l) => a + l.winCount, 0);
    if (total < 100) return null;
    return { wr: Math.round((wins / total) * 100), total };
  }

  const wr = stats ? overallWr() : null;
  const itemPhases = stats ? groupItems() : null;

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
          <div style={{ position: "relative" }}>
            <input
              ref={searchRef}
              className="dota-input mono"
              value={search || (selected && !showList ? selected.displayName : "")}
              onChange={e => { setSearch(e.target.value); setShowList(true); }}
              onFocus={() => { setSearch(""); setShowList(true); }}
              onBlur={() => setTimeout(() => setShowList(false), 150)}
              placeholder="Поиск героя…"
              style={{ width: "100%", fontSize: 15 }}
            />
            {showList && (
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
                    <span style={{
                      display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                      background: ATTR_COLOR[h.stats?.primaryAttribute] ?? "#888", flexShrink: 0,
                    }} />
                    <span style={{ color: "var(--parchment)", fontSize: 14, fontFamily: "'Marcellus', serif" }}>
                      {h.displayName}
                    </span>
                    <span className="mono" style={{ fontSize: 9, color: "var(--text-mute)", marginLeft: "auto" }}>
                      {ATTR_LABEL[h.stats?.primaryAttribute] ?? ""}
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

        {/* Loading / error */}
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

        {/* Stats */}
        {stats && selected && !loading && (
          <>
            {/* Hero header */}
            <div className="panel" style={{ padding: "20px 24px", marginBottom: 16, position: "relative" }}>
              <Corners />
              <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <HeroPortrait shortName={selected.shortName} displayName={selected.displayName} />
                <div>
                  <div className="display heading-gold" style={{ fontSize: "clamp(1.4rem, 4vw, 2.2rem)", lineHeight: 1 }}>
                    {stats.displayName}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
                    <span className="mono" style={{
                      fontSize: 11, color: ATTR_COLOR[stats.attr] ?? "#888",
                      letterSpacing: ".2em",
                    }}>
                      {ATTR_LABEL[stats.attr] ?? stats.attr}
                    </span>
                    <span className="mono" style={{ fontSize: 10, color: "var(--text-mute)", letterSpacing: ".15em" }}>
                      {selected.shortName}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Lane map + Winrate row */}
            <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
              {/* Lane map */}
              <div className="panel" style={{ padding: "18px 20px", flex: "0 0 auto", position: "relative" }}>
                <Corners />
                <div className="dota-label" style={{ marginBottom: 10 }}>ПОЗИЦИЯ НА КАРТЕ</div>
                <LaneMap lanes={stats.lanes} />
                {/* Legend */}
                <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
                  {[
                    { lane: "SAFE_LANE" }, { lane: "MID_LANE" },
                    { lane: "OFF_LANE" }, { lane: "JUNGLE" },
                  ].map(({ lane }) => {
                    const s = stats.lanes.find(l => l.lane === lane);
                    if (!s || s.matchCount < 200) return null;
                    const wr = Math.round((s.winCount / s.matchCount) * 100);
                    return (
                      <div key={lane} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ display: "inline-block", width: 10, height: 10, background: laneColor(wr) }} />
                        <span className="mono" style={{ fontSize: 9, color: "var(--text-mute)" }}>
                          {LANE_LABELS[lane]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Overall winrate + lane breakdown */}
              <div className="panel" style={{ padding: "18px 20px", flex: "1 1 220px", position: "relative" }}>
                <Corners />
                <div className="dota-label" style={{ marginBottom: 10 }}>СТАТИСТИКА</div>

                {wr && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ color: "var(--parchment-dim)", fontSize: 13, fontFamily: "'Marcellus', serif" }}>
                        Общий винрейт
                      </span>
                      <span className="display heading-gold" style={{ fontSize: 18 }}>
                        {wr.wr}%
                      </span>
                    </div>
                    <div style={{ height: 8, background: "#1a1412", border: "1px solid #2a2418", position: "relative" }}>
                      <div style={{
                        position: "absolute", inset: 0, right: `${100 - wr.wr}%`,
                        background: wr.wr >= 52 ? "#22b822" : wr.wr >= 48 ? "#c8a84b" : "#8a2020",
                      }} />
                    </div>
                    <div className="mono" style={{ fontSize: 9, color: "var(--text-mute)", marginTop: 4 }}>
                      {wr.total.toLocaleString()} матчей · Legend/Ancient
                    </div>
                  </div>
                )}

                <div className="dota-divider" style={{ margin: "10px 0" }}>
                  <span className="line" /><span className="glyph">◆</span><span className="line" />
                </div>

                {/* Lane breakdown */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {stats.lanes
                    .filter(l => l.matchCount >= 200)
                    .sort((a, b) => b.matchCount - a.matchCount)
                    .map(l => {
                      const lwr = Math.round((l.winCount / l.matchCount) * 100);
                      return (
                        <div key={l.lane}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <span style={{ color: "var(--text)", fontSize: 12, fontFamily: "'Marcellus', serif" }}>
                              {LANE_LABELS[l.lane] ?? l.lane}
                            </span>
                            <span className="mono" style={{ fontSize: 11, color: lwr >= 50 ? "#3ab860" : "#c8a84b" }}>
                              {lwr}%
                            </span>
                          </div>
                          <div style={{ height: 4, background: "#1a1412" }}>
                            <div style={{
                              height: "100%",
                              width: `${lwr}%`,
                              background: lwr >= 52 ? "#22b822" : lwr >= 48 ? "#c8a84b" : "#8a2020",
                            }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Item build */}
            <div className="panel" style={{ padding: "18px 20px 22px", position: "relative" }}>
              <Corners />
              <div className="dota-label" style={{ marginBottom: 14 }}>СБОРКА ПРЕДМЕТОВ</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {itemPhases!.map((phase, idx) => {
                  if (phase.length === 0) return null;
                  return (
                    <div key={idx}>
                      <div className="mono" style={{
                        fontSize: 10, color: "var(--text-mute)", letterSpacing: ".25em",
                        marginBottom: 10,
                      }}>
                        {PHASE_LABELS[idx]}
                      </div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {phase.slice(0, 12).map(s => (
                          <ItemIcon
                            key={s.item!.name}
                            name={s.item!.name}
                            wr={Math.round((s.winCount / s.matchCount) * 100)}
                            count={s.matchCount}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Empty state */}
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
