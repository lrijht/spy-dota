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

    // Railway shape: { candidates: [{ hero_name, display_name, score }] } — take first
    const raw = Array.isArray(data.candidates) ? data.candidates[0] : data;
    const normalized = {
      hero_name: stripHeroPrefix(raw?.hero_name),
      display_name: raw?.display_name ?? raw?.hero_name ?? "Unknown",
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
