import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join("/");
  const url = `https://api.opendota.com/api/${path}`;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
