import { NextRequest, NextResponse } from "next/server";
import { createLobby, generateCode, getLobby, updateLobby } from "@/lib/store";

function genId(n: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < n; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export async function POST(req: NextRequest) {
  const { hostName } = await req.json();
  if (!hostName?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  try {
    let code: string = generateCode();
    let attempts = 0;
    while (await getLobby(code) && attempts < 10) { code = generateCode(); attempts++; }

    const hostId = genId(12);
    await createLobby(code, hostId);
    await updateLobby(code, {
      players: [{
        id: hostId, name: hostName.trim(), isHost: true,
        heroId: null, heroName: null, isSpy: false, hint: null,
        hasAnswered: false, votes: 0, isKicked: false, answers: [],
      }],
    });

    return NextResponse.json({ code, playerId: hostId });
  } catch (e: any) {
    console.error("Create lobby error:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
