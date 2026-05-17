// hero-data.js — HERO CODEX Data Layer
// OpenDota public API: https://api.opendota.com/api  (no key required, CORS enabled)
// CDN for assets:      https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react

export const API = 'https://api.opendota.com/api';
export const CDN = 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react';

// ── Placeholder shapes — components in hero-page.jsx expect exactly these keys ──

// GET /heroStats
// Array of every hero with bracket pick/win counters.
// Used by: HeroRoster, HeroBracketStats, overall winrate badge
export const HERO_STATS_SHAPE = {
  id: 1,
  name: 'npc_dota_hero_antimage',   // strip 'npc_dota_hero_' → shortName
  localized_name: 'Anti-Mage',
  roles: ['Carry', 'Escape', 'Nuker'],
  primary_attr: 'agi',              // 'str' | 'agi' | 'int' | 'all'
  attack_type: 'Melee',
  // Bracket stats — index 1=Herald … 8=Immortal:
  '1_pick': 12345, '1_win': 6000,
  '2_pick': 23456, '2_win': 11500,
  '3_pick': 45000, '3_win': 22000,
  '4_pick': 67000, '4_win': 33000,
  '5_pick': 54000, '5_win': 27500,
  '6_pick': 38000, '6_win': 19800,
  '7_pick': 21000, '7_win': 11200,
  '8_pick': 9000,  '8_win': 4700,
};

// GET /constants/items
// Map of item internal name → item metadata including numeric id.
// Used to resolve numeric ids from itemPopularity back to names.
// Used by: HeroItems
export const ITEM_CONSTANTS_SHAPE = {
  'item_blink': {
    id: 1,
    dname: 'Blink Dagger',
    cost: 2250,
    img: '/items/blink.png',
  },
};

// GET /heroes/{id}/itemPopularity
// Popularity of items bought at each game phase, keyed by numeric item id.
// Used by: HeroItems
// Key structure components expect:
//   items.start  → Array<[itemName, count]>  (start_game_items resolved)
//   items.early  → Array<[itemName, count]>  (early_game_items resolved)
//   items.mid    → Array<[itemName, count]>  (mid_game_items resolved)
//   items.late   → Array<[itemName, count]>  (late_game_items resolved)
export const ITEM_POPULARITY_SHAPE = {
  start_game_items: { 1: 45000, 2: 38000 },   // item_id → match count
  early_game_items: { 46: 21000, 29: 18000 },
  mid_game_items:   { 1: 15000, 50: 12000 },
  late_game_items:  { 1: 9000, 152: 7500 },
};

// GET /heroes/{id}/matchups
// Win/loss record vs every other hero.
// Used by: HeroMatchups
// Key structure:
//   matchups[].hero_id      → opponent hero id
//   matchups[].games_played → total games vs this opponent
//   matchups[].wins         → times THIS hero won against opponent
export const MATCHUPS_SHAPE = [
  { hero_id: 2, games_played: 5234, wins: 2800 },
];

// GET /scenarios/laneRoles?hero_id={id}
// Per-role, per-time-slice win/pick data for this hero.
// Used by: HeroLaneRoles
// Key structure:
//   laneRoles[].hero_id   → hero id
//   laneRoles[].lane_role → 1=Safe 2=Mid 3=Off 4=Jungle
//   laneRoles[].time      → game clock (seconds) of observation
//   laneRoles[].games     → games in this bucket
//   laneRoles[].wins      → wins in this bucket
export const LANE_ROLES_SHAPE = [
  { hero_id: 1, lane_role: 1, time: 600, games: 3450, wins: 1750 },
  { hero_id: 1, lane_role: 3, time: 600, games: 1200, wins: 560 },
];

// GET /scenarios/itemTimings?hero_id={id}
// When (in seconds) a hero typically acquires specific items.
// Used by: HeroItemTimings
// Key structure:
//   itemTimings[].hero_id → hero id
//   itemTimings[].item    → item short name (without 'item_' prefix)
//   itemTimings[].time    → clock seconds when item is acquired
//   itemTimings[].games   → sample size
//   itemTimings[].wins    → wins in this bucket
export const ITEM_TIMINGS_SHAPE = [
  { hero_id: 1, item: 'blink', time: 900, games: 1200, wins: 650 },
];

// GET /heroes/{id}/rankings
// Top-ranked players on this hero (leaderboard).
// Used by: HeroRankings (future section)
export const RANKINGS_SHAPE = {
  hero_id: 1,
  rankings: [
    { account_id: 123456789, score: 9842.5, rank_tier: 80, card: 12345678 },
  ],
};

// ── Async fetch helpers ────────────────────────────────────────────────────
// Import these in hero-page.jsx to keep fetch logic separate from render.

export async function fetchHeroStats() {
  // GET /heroStats — all heroes, all brackets
  const r = await fetch(`${API}/heroStats`);
  if (!r.ok) throw new Error(`heroStats ${r.status}`);
  return r.json(); // → HERO_STATS_SHAPE[]
}

export async function fetchItemConstants() {
  // GET /constants/items — numeric id ↔ name mapping
  const r = await fetch(`${API}/constants/items`);
  if (!r.ok) throw new Error(`constants/items ${r.status}`);
  return r.json(); // → Record<string, ITEM_CONSTANTS_SHAPE>
}

export async function fetchItemPopularity(heroId) {
  // GET /heroes/{id}/itemPopularity
  const r = await fetch(`${API}/heroes/${heroId}/itemPopularity`);
  if (!r.ok) throw new Error(`itemPopularity ${r.status}`);
  return r.json(); // → ITEM_POPULARITY_SHAPE
}

export async function fetchMatchups(heroId) {
  // GET /heroes/{id}/matchups
  const r = await fetch(`${API}/heroes/${heroId}/matchups`);
  if (!r.ok) throw new Error(`matchups ${r.status}`);
  return r.json(); // → MATCHUPS_SHAPE[]
}

export async function fetchLaneRoles(heroId) {
  // GET /scenarios/laneRoles?hero_id={id}
  const r = await fetch(`${API}/scenarios/laneRoles?hero_id=${heroId}`);
  if (!r.ok) throw new Error(`laneRoles ${r.status}`);
  return r.json(); // → LANE_ROLES_SHAPE[]
}

export async function fetchItemTimings(heroId) {
  // GET /scenarios/itemTimings?hero_id={id}
  const r = await fetch(`${API}/scenarios/itemTimings?hero_id=${heroId}`);
  if (!r.ok) throw new Error(`itemTimings ${r.status}`);
  return r.json(); // → ITEM_TIMINGS_SHAPE[]
}

export async function fetchRankings(heroId) {
  // GET /heroes/{id}/rankings
  const r = await fetch(`${API}/heroes/${heroId}/rankings`);
  if (!r.ok) throw new Error(`rankings ${r.status}`);
  return r.json(); // → RANKINGS_SHAPE
}
