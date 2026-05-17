import { NextResponse } from "next/server";

const STRATZ_URL = "https://api.stratz.com/graphql";

function buildHeaders() {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  // Stratz requires this exact User-Agent — without it returns 403
  h["user-agent"] = "STRATZ_API";
  if (process.env.STRATZ_API_KEY) {
    h["authorization"] = `Bearer ${process.env.STRATZ_API_KEY}`;
  }
  return h;
}

// GET /api/stratz — debug: check env var and test Stratz connectivity
export async function GET() {
  const key = process.env.STRATZ_API_KEY;
  const probe = await fetch(STRATZ_URL, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ query: "{ constants { gameVersions { id } } }" }),
    cache: "no-store",
  });
  const text = await probe.text();
  return NextResponse.json({
    hasKey: !!key,
    keyLength: key?.length ?? 0,
    keyPrefix: key ? key.slice(0, 12) + "…" : null,
    stratzStatus: probe.status,
    stratzBody: text.slice(0, 200),
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const res = await fetch(STRATZ_URL, {
      method: "POST",
      headers: buildHeaders(),
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
