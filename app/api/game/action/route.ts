import { NextRequest, NextResponse } from "next/server";
import { getLobby, updateLobby } from "@/lib/store";
import { pusherServer } from "@/lib/pusher";
import { getRandomHeroes } from "@/lib/heroes";
import { generateHints } from "@/lib/generateHints";

export async function POST(req: NextRequest) {
  const { code, playerId, action, payload } = await req.json();
  const lobby = await getLobby(code);
  if (!lobby) return NextResponse.json({ error: "Lobby not found" }, { status: 404 });

  if (action === "answered") {
    const updatedPlayers = lobby.players.map(p =>
      p.id === playerId ? { ...p, hasAnswered: true } : p
    );
    await updateLobby(code, { players: updatedPlayers });

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
    return NextResponse.json({ ok: true });
  }

  if (action === "open-voting") {
    if (lobby.hostId !== playerId) return NextResponse.json({ error: "Not host" }, { status: 403 });
    const updatedPlayers = lobby.players.map(p => ({ ...p, hasAnswered: false, votes: 0 }));
    await updateLobby(code, { votingOpen: true, roundVotes: {}, players: updatedPlayers });
    await pusherServer.trigger(`lobby-${code}`, "voting-opened", {
      players: updatedPlayers.filter(p => !p.isKicked).map(p => ({ id: p.id, name: p.name, votes: 0 })),
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "next-round") {
    if (lobby.hostId !== playerId) return NextResponse.json({ error: "Not host" }, { status: 403 });
    const nextRound = lobby.currentRound + 1;
    if (nextRound > lobby.rounds) {
      await updateLobby(code, { status: "finished", votingOpen: false });
      await pusherServer.trigger(`lobby-${code}`, "game-finished", {});
      return NextResponse.json({ ok: true, finished: true });
    }

    // Re-assign spy and hero for the new round
    const activePlayers = lobby.players.filter(p => !p.isKicked);
    const spyIndex = Math.floor(Math.random() * activePlayers.length);
    const [sharedHero] = getRandomHeroes(1);
    const nonSpyCount = activePlayers.length - 1;

    const nonSpyHints = await generateHints(sharedHero, nonSpyCount);

    let hintIdx = 0;
    const hints = activePlayers.map((_, i) =>
      i === spyIndex ? null : (nonSpyHints[hintIdx++] ?? null)
    );

    const updatedPlayers = lobby.players.map(p => {
      if (p.isKicked) return p;
      const activeIdx = activePlayers.findIndex(ap => ap.id === p.id);
      const isSpy = activeIdx === spyIndex;
      return {
        ...p,
        heroId: isSpy ? "spy" : sharedHero.id,
        heroName: isSpy ? "???" : sharedHero.name,
        isSpy,
        hint: isSpy ? null : hints[activeIdx],
        hasAnswered: false,
        votes: 0,
      };
    });

    await updateLobby(code, {
      currentRound: nextRound,
      votingOpen: false,
      roundVotes: {},
      players: updatedPlayers,
    });

    // Send private assignments to each player
    for (const player of updatedPlayers.filter(p => !p.isKicked)) {
      await pusherServer.trigger(`player-${code}-${player.id}`, "game-assigned", {
        heroId: player.heroId,
        heroName: player.heroName,
        isSpy: player.isSpy,
        hint: player.hint,
      });
    }

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
    await updateLobby(code, { status: "results" });
    return NextResponse.json({ ok: true });
  }

  if (action === "restart-game") {
    if (lobby.hostId !== playerId) return NextResponse.json({ error: "Not host" }, { status: 403 });
    const resetPlayers = lobby.players.map(p => ({
      ...p,
      heroId: null,
      heroName: null,
      isSpy: false,
      hint: null,
      hasAnswered: false,
      votes: 0,
      answers: [],
    }));
    await updateLobby(code, {
      status: "waiting",
      currentRound: 1,
      roundVotes: {},
      votingOpen: false,
      players: resetPlayers,
    });
    await pusherServer.trigger(`lobby-${code}`, "game-restarted", {});
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
