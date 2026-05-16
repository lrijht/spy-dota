import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  const { heroes } = await req.json();
  // heroes: Array<{ name: string, role: string, tags: string[] }>

  const heroList = heroes.map((h: { name: string; role: string; tags: string[] }, i: number) =>
    `Player ${i + 1}: ${h.name} (${h.role}, abilities/style: ${h.tags.join(", ")})`
  ).join("\n");

  const prompt = `You are a game master for a social deduction game "Spy" using Dota 2 heroes.
Each player got a different hero. Generate a SHORT gameplay hint for each player that:
- Hints at their hero's playstyle WITHOUT naming the hero directly
- Gives them a "role" to play in conversation (e.g. "You are an aggressive initiator who loves diving into fights")
- Includes 1-2 specific tips for answering questions without revealing the hero name
- Is 2-3 sentences max
- Is fun and immersive

Heroes assigned:
${heroList}

Respond ONLY with valid JSON array, no markdown, no explanation:
[
  { "playerIndex": 0, "hint": "..." },
  { "playerIndex": 1, "hint": "..." },
  ...
]`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 600,
      temperature: 0.8,
    });

    const text = completion.choices[0]?.message?.content || "[]";
    // Strip markdown if present
    const clean = text.replace(/```json|```/g, "").trim();
    const hints = JSON.parse(clean);
    return NextResponse.json({ hints });
  } catch (e) {
    console.error("Groq error:", e);
    // Fallback hints
    const fallback = heroes.map((_: unknown, i: number) => ({
      playerIndex: i,
      hint: "Play your role naturally. Answer questions about your hero's playstyle without revealing the name.",
    }));
    return NextResponse.json({ hints: fallback });
  }
}
