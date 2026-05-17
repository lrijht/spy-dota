import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "STRATZ_API",
    };
    if (process.env.STRATZ_API_KEY) {
      headers["Authorization"] = `Bearer ${process.env.STRATZ_API_KEY}`;
    }
    const res = await fetch("https://api.stratz.com/graphql", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const text = await res.text();
    try {
      return NextResponse.json(JSON.parse(text), { status: res.ok ? 200 : res.status });
    } catch {
      return NextResponse.json({ error: `Stratz HTTP ${res.status}`, raw: text.slice(0, 300) }, { status: 502 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
