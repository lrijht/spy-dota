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
    const rawBody = await res.text();
    console.log("[hint proxy] rawBody from Railway:", rawBody);

    const parsedJson = JSON.parse(rawBody);
    console.log("[hint proxy] parsedJson:", JSON.stringify(parsedJson));

    // Railway shape: { candidates: [{ hero_name, display_name, score }] }
    const raw: unknown[] = Array.isArray(parsedJson.candidates) ? parsedJson.candidates : [];
    const candidates = raw.map((r: any) => ({
      hero_name: stripHeroPrefix(r?.hero_name),
      display_name: r?.display_name ?? r?.hero_name ?? "Unknown",
      confidence: typeof r?.score === "number" ? r.score : 0,
    }));

    console.log("[hint proxy] candidates being returned:", JSON.stringify(candidates));
    return NextResponse.json({ candidates }, { status: res.status });
  } catch {
    return NextResponse.json({ error: "AI service unavailable" }, { status: 502 });
  }
}
