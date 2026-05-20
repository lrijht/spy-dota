import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const exclude = req.nextUrl.searchParams.get("exclude");
  const upstreamUrl = new URL(`${process.env.DOTA_AI_URL}/train/next-hero`);
  if (exclude) upstreamUrl.searchParams.set("exclude", exclude);
  try {
    const res = await fetch(upstreamUrl.toString(), {
      headers: { "X-Internal-Key": process.env.INTERNAL_API_KEY! },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "AI service unavailable" }, { status: 502 });
  }
}
