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
      `Этот герой играет на роли: ${hero.role}.`,
      `Основной атрибут — ${ATTR_NAME[hero.attr]}.`,
      `Ключевые механики: ${hero.tags.slice(0, 2).join(" и ")}.`,
      `Сосредоточься на позиционировании и таймингах для максимального эффекта.`,
      `Отвечай на вопросы о стиле игры, не раскрывая имя героя.`,
    ].join("\n")
  );

  try {
    const prompt = `Ты ведущий в игре "Шпион" по вселенной Dota 2.

Секретный герой: ${hero.name} (роль: ${hero.role}, атрибут: ${ATTR_NAME[hero.attr]}, механики: ${hero.tags.join(", ")})

Сгенерируй подсказки для ${playerCount} игроков. Каждый игрок получает ровно 5 коротких игровых фактов — НЕ называй имя героя.

5 фактов для каждого игрока должны охватывать:
1. Лейн/роль (опиши словами: сейфлейн, мид, офлейн, саппорт — не говори "позиция 1/2/3")
2. Основной атрибут и что он даёт герою (например: "Ловкость увеличивает скорость атаки и броню")
3. Один-два РЕАЛЬНЫХ предмета из Dota 2, которые строят на этом герое (например: Blink Dagger, BKB, Maelstrom)
4. Один-два реальных героя-контрпика (настоящие имена героев)
5. Специфическая механика, комбо или тайминг, который определяет стиль игры героя

Каждый факт — одно предложение. Игроки должны звучать РАЗНО — варьируй акценты между ними.

Отвечай ТОЛЬКО валидным JSON, без markdown:
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
