import { NextRequest, NextResponse } from "next/server";
import { getLobby, updateLobby } from "@/lib/store";
import { pusherServer } from "@/lib/pusher";

export async function POST(req: NextRequest) {
  const { code, hostId, targetId } = await req.json();
  const lobby = getLobby(code);
  if (!lobby) return NextResponse.json({ error: "Lobby not found" }, { status: 404 });
  if (lobby.hostId !== hostId) return NextResponse.json({ error: "Not host" }, { status: 403 });

  const target = lobby.players.find(p => p.id === targetId);
  if (!target) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  const updatedPlayers = lobby.players.map(p =>
    p.id === targetId ? { ...p, isKicked: true } : p
  );
  updateLobby(code, { players: updatedPlayers });

  await pusherServer.trigger(`lobby-${code}`, "player-kicked", {
    kickedId: targetId,
    kickedName: target.name,
    players: updatedPlayers.filter(p => !p.isKicked).map(p => ({
      id: p.id, name: p.name, isHost: p.isHost, hasAnswered: p.hasAnswered, votes: p.votes,
    })),
  });

  return NextResponse.json({ ok: true });
}
