import { NextRequest, NextResponse } from "next/server";

function stripHeroPrefix(name: unknown): string {
  if (typeof name !== "string") return "";
  return name.replace(/^npc_dota_hero_/, "");
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  try {
    const res = await fetch(`${process.env.DOTA_AI_URL}/narrow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Key": process.env.INTERNAL_API_KEY!,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    // FastAPI may return { hero: { name, display_name }, confidence }
    // or { results: [{ hero: { name, display_name }, score }] } (take first)
    const raw = Array.isArray(data.results) ? data.results[0] : data;
    const normalized = {
      hero: stripHeroPrefix(raw?.hero?.name ?? raw?.hero),
      name: raw?.hero?.display_name ?? raw?.hero?.name ?? raw?.name ?? "Unknown",
      confidence: typeof raw?.confidence === "number"
        ? raw.confidence
        : typeof raw?.score === "number"
        ? raw.score
        : null,
    };

    return NextResponse.json(normalized, { status: res.status });
  } catch {
    return NextResponse.json({ error: "AI service unavailable" }, { status: 502 });
  }
}
