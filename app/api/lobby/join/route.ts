import { NextRequest, NextResponse } from "next/server";
import { getLobby, updateLobby } from "@/lib/store";
import { pusherServer } from "@/lib/pusher";

function nanoid(n: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < n; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export async function POST(req: NextRequest) {
  const { code, playerName } = await req.json();
  if (!code || !playerName?.trim()) {
    return NextResponse.json({ error: "Code and name required" }, { status: 400 });
  }

  const lobby = await getLobby(code.toUpperCase());
  if (!lobby) {
    return NextResponse.json({ error: "Lobby not found" }, { status: 404 });
  }
  if (lobby.status !== "waiting") {
    return NextResponse.json({ error: "Game already started" }, { status: 400 });
  }
  if (lobby.players.filter(p => !p.isKicked).length >= 6) {
    return NextResponse.json({ error: "Lobby is full (max 6)" }, { status: 400 });
  }
  if (lobby.players.some(p => p.name.toLowerCase() === playerName.trim().toLowerCase())) {
    return NextResponse.json({ error: "Name already taken" }, { status: 400 });
  }

  const playerId = nanoid(12);
  const updatedPlayers = [...lobby.players, {
    id: playerId,
    name: playerName.trim(),
    isHost: false,
    heroId: null,
    heroName: null,
    isSpy: false,
    hint: null,
    hasAnswered: false,
    votes: 0,
    isKicked: false,
    answers: [],
  }];

  await updateLobby(code.toUpperCase(), { players: updatedPlayers });

  // Notify all players
  await pusherServer.trigger(`lobby-${code.toUpperCase()}`, "player-joined", {
    players: updatedPlayers.filter(p => !p.isKicked).map(p => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
    })),
  });

  return NextResponse.json({ playerId, code: code.toUpperCase() });
}
