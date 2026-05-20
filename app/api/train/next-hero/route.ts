import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(`${process.env.DOTA_AI_URL}/train/next-hero`, {
      headers: { "X-Internal-Key": process.env.INTERNAL_API_KEY! },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "AI service unavailable" }, { status: 502 });
  }
}
