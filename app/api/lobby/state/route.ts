import { NextRequest, NextResponse } from "next/server";
import { getLobby } from "@/lib/store";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });

  const lobby = await getLobby(code.toUpperCase());
  if (!lobby) return NextResponse.json({ error: "Lobby not found" }, { status: 404 });

  return NextResponse.json({
    code: lobby.code,
    mode: lobby.mode,
    rounds: lobby.rounds,
    currentRound: lobby.currentRound,
    status: lobby.status,
    votingOpen: lobby.votingOpen,
    players: lobby.players.filter(p => !p.isKicked).map(p => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      hasAnswered: p.hasAnswered,
      votes: p.votes,
      isKicked: p.isKicked,
    })),
  });
}
