import { NextRequest, NextResponse } from "next/server";
import { getLobby } from "@/lib/store";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const playerId = req.nextUrl.searchParams.get("playerId");
  if (!code || !playerId) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  const lobby = await getLobby(code);
  if (!lobby) return NextResponse.json({ error: "Lobby not found" }, { status: 404 });

  const player = lobby.players.find(p => p.id === playerId);
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });
  if (!player.heroId) return NextResponse.json({ error: "Not assigned" }, { status: 404 });

  return NextResponse.json({
    heroId: player.heroId,
    heroName: player.heroName,
    isSpy: player.isSpy,
    hint: player.hint,
  });
}
