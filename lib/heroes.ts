export interface Hero {
  id: string;
  name: string;
  role: string;
  attr: "str" | "agi" | "int" | "univ";
  complexity: 1 | 2 | 3;
  tags: string[];
}

export const HEROES: Hero[] = [
  { id: "antimage", name: "Anti-Mage", role: "Carry", attr: "agi", complexity: 2, tags: ["blink", "mana burn", "farm"] },
  { id: "axe", name: "Axe", role: "Offlaner", attr: "str", complexity: 1, tags: ["spin", "call", "initiator"] },
  { id: "bane", name: "Bane", role: "Support", attr: "int", complexity: 2, tags: ["sleep", "nightmare", "disable"] },
  { id: "bloodseeker", name: "Bloodseeker", role: "Carry", attr: "agi", complexity: 1, tags: ["rupture", "thirst", "silence"] },
  { id: "cm", name: "Crystal Maiden", role: "Support", attr: "int", complexity: 1, tags: ["freeze", "aura", "slow"] },
  { id: "drow", name: "Drow Ranger", role: "Carry", attr: "agi", complexity: 1, tags: ["silence", "frost arrows", "aura"] },
  { id: "earthshaker", name: "Earthshaker", role: "Support", attr: "str", complexity: 2, tags: ["echo slam", "fissure", "initiator"] },
  { id: "juggernaut", name: "Juggernaut", role: "Carry", attr: "agi", complexity: 2, tags: ["omnislash", "blade fury", "healing ward"] },
  { id: "mirana", name: "Mirana", role: "Support/Carry", attr: "agi", complexity: 2, tags: ["arrow", "leap", "starfall"] },
  { id: "morphling", name: "Morphling", role: "Carry", attr: "agi", complexity: 3, tags: ["waveform", "morph", "adaptive strike"] },
  { id: "nevermore", name: "Shadow Fiend", role: "Midlaner", attr: "agi", complexity: 2, tags: ["souls", "requiem", "shadowraze"] },
  { id: "phantom_lancer", name: "Phantom Lancer", role: "Carry", attr: "agi", complexity: 2, tags: ["illusions", "doppelganger", "farm"] },
  { id: "puck", name: "Puck", role: "Midlaner", attr: "int", complexity: 3, tags: ["phase shift", "dream coil", "elusive"] },
  { id: "pudge", name: "Pudge", role: "Support/Offlaner", attr: "str", complexity: 2, tags: ["hook", "rot", "dismember"] },
  { id: "razor", name: "Razor", role: "Midlaner/Carry", attr: "agi", complexity: 1, tags: ["storm surge", "static link", "eye of the storm"] },
  { id: "sand_king", name: "Sand King", role: "Offlaner", attr: "str", complexity: 2, tags: ["epicenter", "burrowstrike", "sand storm"] },
  { id: "storm_spirit", name: "Storm Spirit", role: "Midlaner", attr: "int", complexity: 3, tags: ["ball lightning", "overload", "escape"] },
  { id: "sven", name: "Sven", role: "Carry", attr: "str", complexity: 1, tags: ["god's strength", "warcry", "storm hammer"] },
  { id: "tinker", name: "Tinker", role: "Midlaner", attr: "int", complexity: 3, tags: ["rearm", "heat-seeking missile", "march"] },
  { id: "vengeful_spirit", name: "Vengeful Spirit", role: "Support", attr: "agi", complexity: 1, tags: ["swap", "magic missile", "nether swap"] },
  { id: "windranger", name: "Windranger", role: "Midlaner/Support", attr: "univ", complexity: 2, tags: ["windrun", "shackleshot", "focus fire"] },
  { id: "witch_doctor", name: "Witch Doctor", role: "Support", attr: "int", complexity: 1, tags: ["death ward", "maledict", "voodoo restoration"] },
  { id: "lich", name: "Lich", role: "Support", attr: "int", complexity: 1, tags: ["chain frost", "frost shield", "sacrifice"] },
  { id: "lion", name: "Lion", role: "Support", attr: "int", complexity: 1, tags: ["finger of death", "hex", "earth spike"] },
  { id: "shadow_shaman", name: "Shadow Shaman", role: "Support", attr: "int", complexity: 1, tags: ["shackles", "mass serpent ward", "hex"] },
  { id: "slardar", name: "Slardar", role: "Offlaner", attr: "str", complexity: 1, tags: ["sprint", "bash", "amplify damage"] },
  { id: "tidehunter", name: "Tidehunter", role: "Offlaner", attr: "str", complexity: 1, tags: ["ravage", "kraken shell", "gush"] },
  { id: "witch_doctor2", name: "Enigma", role: "Offlaner/Support", attr: "int", complexity: 2, tags: ["black hole", "malefice", "midnight pulse"] },
  { id: "enigma", name: "Enigma", role: "Offlaner", attr: "int", complexity: 2, tags: ["black hole", "malefice", "eidolons"] },
  { id: "faceless_void", name: "Faceless Void", role: "Carry", attr: "agi", complexity: 2, tags: ["chronosphere", "time walk", "time lock"] },
  { id: "kunkka", name: "Kunkka", role: "Midlaner/Offlaner", attr: "str", complexity: 2, tags: ["torrent", "tidebringer", "ghostship"] },
  { id: "lina", name: "Lina", role: "Midlaner/Support", attr: "int", complexity: 2, tags: ["laguna blade", "dragon slave", "light strike array"] },
  { id: "lion2", name: "Nature's Prophet", role: "Offlaner/Carry", attr: "int", complexity: 2, tags: ["teleport", "sprout", "wrath of nature"] },
  { id: "natures_prophet", name: "Nature's Prophet", role: "Offlaner", attr: "int", complexity: 2, tags: ["teleport", "treants", "global"] },
  { id: "necrophos", name: "Necrophos", role: "Midlaner/Support", attr: "int", complexity: 1, tags: ["reaper's scythe", "death pulse", "sadist"] },
  { id: "queen_of_pain", name: "Queen of Pain", role: "Midlaner", attr: "int", complexity: 2, tags: ["scream of pain", "shadow strike", "blink"] },
  { id: "ancient_apparition", name: "Ancient Apparition", role: "Support", attr: "int", complexity: 2, tags: ["ice blast", "cold feet", "global"] },
  { id: "clinkz", name: "Clinkz", role: "Carry", attr: "agi", complexity: 2, tags: ["strafe", "searing arrows", "skeleton walk"] },
  { id: "omniknight", name: "Omniknight", role: "Support", attr: "str", complexity: 1, tags: ["guardian angel", "purification", "degen aura"] },
  { id: "enchantress", name: "Enchantress", role: "Support/Offlaner", attr: "int", complexity: 2, tags: ["enchant", "impetus", "untouchable"] },
  { id: "huskar", name: "Huskar", role: "Offlaner", attr: "str", complexity: 2, tags: ["life break", "inner vitality", "berserker's blood"] },
  { id: "night_stalker", name: "Night Stalker", role: "Offlaner", attr: "str", complexity: 1, tags: ["darkness", "void", "crippling fear"] },
  { id: "broodmother", name: "Broodmother", role: "Offlaner", attr: "agi", complexity: 2, tags: ["spiderlings", "spin web", "insatiable hunger"] },
  { id: "bounty_hunter", name: "Bounty Hunter", role: "Support", attr: "agi", complexity: 2, tags: ["track", "jinada", "shuriken toss"] },
  { id: "weaver", name: "Weaver", role: "Carry", attr: "agi", complexity: 2, tags: ["time lapse", "the swarm", "shukuchi"] },
  { id: "jakiro", name: "Jakiro", role: "Support", attr: "int", complexity: 1, tags: ["macropyre", "ice path", "dual breath"] },
  { id: "batrider", name: "Batrider", role: "Offlaner", attr: "int", complexity: 2, tags: ["flaming lasso", "firefly", "sticky napalm"] },
  { id: "chen", name: "Chen", role: "Support", attr: "int", complexity: 3, tags: ["holy persuasion", "hand of god", "creep"] },
  { id: "spectre", name: "Spectre", role: "Carry", attr: "agi", complexity: 2, tags: ["haunt", "spectral dagger", "dispersion"] },
  { id: "doom_bringer", name: "Doom", role: "Offlaner", attr: "str", complexity: 2, tags: ["doom", "devour", "scorched earth"] },
  { id: "ursa", name: "Ursa", role: "Carry", attr: "agi", complexity: 1, tags: ["fury swipes", "enrage", "earthshock"] },
  { id: "spirit_breaker", name: "Spirit Breaker", role: "Support/Offlaner", attr: "str", complexity: 1, tags: ["charge", "nether strike", "greater bash"] },
  { id: "gyrocopter", name: "Gyrocopter", role: "Carry", attr: "agi", complexity: 2, tags: ["call down", "flak cannon", "homing missile"] },
  { id: "alchemist", name: "Alchemist", role: "Carry", attr: "str", complexity: 2, tags: ["chemical rage", "unstable concoction", "greevil's greed"] },
  { id: "invoker", name: "Invoker", role: "Midlaner", attr: "int", complexity: 3, tags: ["invoke", "sunstrike", "tornado", "cold snap"] },
  { id: "silencer", name: "Silencer", role: "Support", attr: "int", complexity: 1, tags: ["global silence", "glaives", "last word"] },
  { id: "void_spirit", name: "Void Spirit", role: "Midlaner", attr: "univ", complexity: 3, tags: ["astral step", "dissimilate", "resonant pulse"] },
  { id: "outworld_destroyer", name: "Outworld Destroyer", role: "Midlaner", attr: "int", complexity: 2, tags: ["arcane orb", "sanity's eclipse", "astral imprisonment"] },
  { id: "medusa", name: "Medusa", role: "Carry", attr: "agi", complexity: 2, tags: ["stone gaze", "mana shield", "split shot"] },
  { id: "troll_warlord", name: "Troll Warlord", role: "Carry", attr: "agi", complexity: 2, tags: ["battle trance", "whirling axes", "berserker's rage"] },
  { id: "centaur", name: "Centaur Warrunner", role: "Offlaner", attr: "str", complexity: 1, tags: ["stampede", "hoof stomp", "return"] },
  { id: "magnus", name: "Magnus", role: "Offlaner/Support", attr: "str", complexity: 2, tags: ["reverse polarity", "skewer", "empower"] },
  { id: "timbersaw", name: "Timbersaw", role: "Offlaner", attr: "str", complexity: 3, tags: ["chakram", "whirling death", "reactive armor"] },
  { id: "brewmaster", name: "Brewmaster", role: "Offlaner", attr: "str", complexity: 3, tags: ["primal split", "thunder clap", "drunken brawler"] },
  { id: "phantom_assassin", name: "Phantom Assassin", role: "Carry", attr: "agi", complexity: 1, tags: ["coup de grace", "blink strike", "blur"] },
  { id: "razor2", name: "Techies", role: "Support", attr: "int", complexity: 3, tags: ["mines", "blast off", "suicide"] },
  { id: "techies", name: "Techies", role: "Support", attr: "int", complexity: 3, tags: ["mines", "blast off", "land mines"] },
  { id: "ember_spirit", name: "Ember Spirit", role: "Midlaner", attr: "agi", complexity: 3, tags: ["fire remnant", "sleight of fist", "flame guard"] },
  { id: "earth_spirit", name: "Earth Spirit", role: "Support/Offlaner", attr: "str", complexity: 3, tags: ["rolling boulder", "magnetize", "geomagnetic grip"] },
  { id: "abyssal_underlord", name: "Underlord", role: "Offlaner", attr: "str", complexity: 1, tags: ["dark rift", "atrophy aura", "firestorm"] },
  { id: "terrorblade", name: "Terrorblade", role: "Carry", attr: "agi", complexity: 2, tags: ["sunder", "metamorphosis", "conjure image"] },
  { id: "phoenix", name: "Phoenix", role: "Support/Offlaner", attr: "str", complexity: 3, tags: ["supernova", "icarus dive", "fire spirits"] },
  { id: "oracle", name: "Oracle", role: "Support", attr: "int", complexity: 3, tags: ["false promise", "fortune's end", "fate's edict"] },
  { id: "winter_wyvern", name: "Winter Wyvern", role: "Support", attr: "int", complexity: 2, tags: ["winter's curse", "cold embrace", "arctic burn"] },
  { id: "arc_warden", name: "Arc Warden", role: "Carry", attr: "agi", complexity: 3, tags: ["tempest double", "magnetic field", "flux"] },
  { id: "underlord", name: "Underlord", role: "Offlaner", attr: "str", complexity: 1, tags: ["dark rift", "pit of malice", "atrophy"] },
  { id: "monkey_king", name: "Monkey King", role: "Carry/Support", attr: "agi", complexity: 2, tags: ["wukong's command", "tree dance", "jingu mastery"] },
  { id: "dragon_knight", name: "Dragon Knight", role: "Midlaner/Offlaner", attr: "str", complexity: 1, tags: ["elder dragon form", "breathe fire", "dragon blood"] },
  { id: "dazzle", name: "Dazzle", role: "Support", attr: "agi", complexity: 2, tags: ["shallow grave", "weave", "bad juju"] },
  { id: "rattletrap", name: "Clockwerk", role: "Offlaner/Support", attr: "str", complexity: 2, tags: ["hookshot", "battery assault", "power cogs"] },
  { id: "leshrac", name: "Leshrac", role: "Midlaner/Support", attr: "int", complexity: 2, tags: ["pulse nova", "diabolic edict", "split earth"] },
  { id: "furion", name: "Nature's Prophet", role: "Offlaner", attr: "int", complexity: 2, tags: ["wrath of nature", "sprout", "teleportation"] },
  { id: "life_stealer", name: "Lifestealer", role: "Carry", attr: "str", complexity: 2, tags: ["infest", "rage", "feast"] },
  { id: "dark_seer", name: "Dark Seer", role: "Offlaner", attr: "int", complexity: 3, tags: ["wall of replica", "vacuum", "ion shell"] },
  { id: "clinkz2", name: "Clinkz", role: "Carry", attr: "agi", complexity: 2, tags: ["burning army", "strafe", "searing arrows"] },
  { id: "warlock", name: "Warlock", role: "Support", attr: "int", complexity: 1, tags: ["chaotic offering", "rain of chaos", "fatal bonds"] },
  { id: "icarus", name: "Phoenix", role: "Support", attr: "str", complexity: 3, tags: ["fire spirits", "supernova", "sun ray"] },
  { id: "obsidian_destroyer", name: "Outworld Destroyer", role: "Midlaner", attr: "int", complexity: 2, tags: ["arcane orb", "astral imprisonment", "big brain"] },
  { id: "ancient_apparition2", name: "Ancient Apparition", role: "Support", attr: "int", complexity: 2, tags: ["ice blast", "chilling touch", "global ult"] },
];

// Remove duplicates by name
const seen = new Set<string>();
export const UNIQUE_HEROES: Hero[] = HEROES.filter(h => {
  if (seen.has(h.name)) return false;
  seen.add(h.name);
  return true;
});

export function getRandomHeroes(count: number): Hero[] {
  const shuffled = [...UNIQUE_HEROES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export const RANGED_HERO_NAMES = new Set([
  "Crystal Maiden", "Drow Ranger", "Mirana", "Morphling", "Shadow Fiend",
  "Puck", "Razor", "Storm Spirit", "Tinker", "Vengeful Spirit", "Windranger",
  "Witch Doctor", "Lich", "Lion", "Shadow Shaman", "Enigma", "Nature's Prophet",
  "Necrophos", "Queen of Pain", "Ancient Apparition", "Clinkz", "Enchantress",
  "Huskar", "Weaver", "Jakiro", "Batrider", "Chen", "Gyrocopter", "Invoker",
  "Silencer", "Outworld Destroyer", "Medusa", "Troll Warlord", "Techies",
  "Phoenix", "Oracle", "Winter Wyvern", "Arc Warden", "Dazzle", "Leshrac", "Warlock",
]);
