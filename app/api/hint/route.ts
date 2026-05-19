import { NextRequest, NextResponse } from "next/server";

function stripHeroPrefix(name: unknown): string {
  if (typeof name !== "string") return "";
  return name.replace(/^npc_dota_hero_/, "");
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  try {
    const res = await fetch(`${process.env.DOTA_AI_URL}/hint`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Key": process.env.INTERNAL_API_KEY!,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    // FastAPI shape: { results: [{ hero: { name, display_name }, score }] }
    // Normalize to: { candidates: [{ hero: string, name: string, confidence: number }] }
    const raw: unknown[] = Array.isArray(data.results) ? data.results : [];
    const candidates = raw.map((r: any) => ({
      hero: stripHeroPrefix(r?.hero?.name),
      name: r?.hero?.display_name ?? r?.hero?.name ?? "Unknown",
      confidence: typeof r?.score === "number" ? r.score : 0,
    }));

    return NextResponse.json({ candidates }, { status: res.status });
  } catch {
    return NextResponse.json({ error: "AI service unavailable" }, { status: 502 });
  }
}
