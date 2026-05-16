import { NextRequest, NextResponse } from "next/server";
import { getLobby, updateLobby } from "@/lib/store";
import { pusherServer } from "@/lib/pusher";

export async function POST(req: NextRequest) {
  const { code, playerId, action, payload } = await req.json();
  const lobby = getLobby(code);
  if (!lobby) return NextResponse.json({ error: "Lobby not found" }, { status: 404 });

  if (action === "answered") {
    // Mark player as having answered this round
    const updatedPlayers = lobby.players.map(p =>
      p.id === playerId ? { ...p, hasAnswered: true } : p
    );
    updateLobby(code, { players: updatedPlayers });

    const activePlayers = updatedPlayers.filter(p => !p.isKicked);
    const allAnswered = activePlayers.every(p => p.hasAnswered);

    await pusherServer.trigger(`lobby-${code}`, "player-answered", {
      playerId,
      players: activePlayers.map(p => ({ id: p.id, name: p.name, hasAnswered: p.hasAnswered })),
      allAnswered,
    });

    return NextResponse.json({ ok: true, allAnswered });
  }

  if (action === "record-answer") {
    // Record another player's answer (visible only to recorder)
    const { targetName, question, answer } = payload;
    // Just acknowledge - clients store answers locally
    return NextResponse.json({ ok: true });
  }

  if (action === "open-voting") {
    if (lobby.hostId !== playerId) return NextResponse.json({ error: "Not host" }, { status: 403 });
    const updatedPlayers = lobby.players.map(p => ({ ...p, hasAnswered: false, votes: 0 }));
    updateLobby(code, { votingOpen: true, roundVotes: {}, players: updatedPlayers });
    await pusherServer.trigger(`lobby-${code}`, "voting-opened", {
      players: updatedPlayers.filter(p => !p.isKicked).map(p => ({ id: p.id, name: p.name, votes: 0 })),
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "next-round") {
    if (lobby.hostId !== playerId) return NextResponse.json({ error: "Not host" }, { status: 403 });
    const nextRound = lobby.currentRound + 1;
    if (nextRound > lobby.rounds) {
      updateLobby(code, { status: "finished", votingOpen: false });
      await pusherServer.trigger(`lobby-${code}`, "game-finished", {});
      return NextResponse.json({ ok: true, finished: true });
    }
    const updatedPlayers = lobby.players.map(p => ({ ...p, hasAnswered: false, votes: 0 }));
    updateLobby(code, { currentRound: nextRound, votingOpen: false, roundVotes: {}, players: updatedPlayers });
    await pusherServer.trigger(`lobby-${code}`, "round-started", { currentRound: nextRound });
    return NextResponse.json({ ok: true });
  }

  if (action === "reveal") {
    if (lobby.hostId !== playerId) return NextResponse.json({ error: "Not host" }, { status: 403 });
    const spy = lobby.players.find(p => p.isSpy && !p.isKicked);
    await pusherServer.trigger(`lobby-${code}`, "spy-revealed", {
      spyId: spy?.id,
      spyName: spy?.name,
      players: lobby.players.filter(p => !p.isKicked).map(p => ({
        id: p.id, name: p.name, heroName: p.heroName, isSpy: p.isSpy,
      })),
    });
    updateLobby(code, { status: "results" });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
