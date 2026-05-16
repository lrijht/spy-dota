import Groq from "groq-sdk";
import type { Hero } from "./heroes";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const ATTR_NAME: Record<Hero["attr"], string> = {
  str: "Strength",
  agi: "Agility",
  int: "Intelligence",
  univ: "Universal",
};

export async function generateHints(hero: Hero, playerCount: number): Promise<string[]> {
  const fallback = Array.from({ length: playerCount }, () =>
    [
      `This hero is played in the ${hero.role} role.`,
      `Their primary attribute is ${ATTR_NAME[hero.attr]}.`,
      `Key mechanics include: ${hero.tags.slice(0, 2).join(" and ")}.`,
      `Focus on positioning and timing to maximize impact.`,
      `Answer questions about playstyle without revealing the hero name.`,
    ].join("\n")
  );

  try {
    const prompt = `You are a game master for the Dota 2 social deduction game "Spy".

Secret hero: ${hero.name} (${hero.role}, attribute: ${ATTR_NAME[hero.attr]}, key mechanics: ${hero.tags.join(", ")})

Generate hints for ${playerCount} players. Each player gets exactly 5 short gameplay facts — do NOT name the hero.

Each player's 5 facts must cover:
1. Lane/role (describe without saying "position 1/2/3" — say safelane/midlane/offlane/support instead)
2. Primary attribute and what it gives this hero (e.g. "Agility gives bonus attack speed and armor")
3. One or two REAL Dota 2 item names that are core on this hero (use actual item names like Blink Dagger, BKB, Maelstrom etc.)
4. One or two real Dota 2 heroes that counter this hero (use actual hero names)
5. A specific gameplay mechanic, combo, or timing that defines how this hero is played

Keep each fact to 1 sentence. Make players sound DIFFERENT from each other — vary which aspect each fact emphasizes.

Respond ONLY with valid JSON, no markdown:
[{"playerIndex":0,"facts":["...","...","...","...","..."]},{"playerIndex":1,"facts":["...","...","...","...","..."]}]`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1200,
      temperature: 0.85,
    });

    const text = completion.choices[0]?.message?.content || "[]";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed: { playerIndex: number; facts: string[] }[] = JSON.parse(clean);

    return Array.from({ length: playerCount }, (_, i) => {
      const entry = parsed.find(p => p.playerIndex === i) ?? parsed[i];
      if (!entry?.facts || entry.facts.length < 5) return fallback[i];
      return entry.facts.slice(0, 5).join("\n");
    });
  } catch (e) {
    console.error("Groq generateHints error:", e);
    return fallback;
  }
}
