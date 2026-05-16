import { NextRequest, NextResponse } from "next/server";
import { getLobby, updateLobby } from "@/lib/store";
import { pusherServer } from "@/lib/pusher";
import { getRandomHeroes } from "@/lib/heroes";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  const { code, playerId } = await req.json();
  const lobby = await getLobby(code);

  if (!lobby) return NextResponse.json({ error: "Lobby not found" }, { status: 404 });
  if (lobby.hostId !== playerId) return NextResponse.json({ error: "Not host" }, { status: 403 });

  const activePlayers = lobby.players.filter(p => !p.isKicked);
  if (activePlayers.length < 2) {
    return NextResponse.json({ error: "Need at least 2 players" }, { status: 400 });
  }
  if (!lobby.mode) {
    return NextResponse.json({ error: "Select game mode first" }, { status: 400 });
  }

  // Pick a random spy
  const spyIndex = Math.floor(Math.random() * activePlayers.length);

  // ONE shared hero for all non-spy players — that's the core of the Spy game
  const [sharedHero] = getRandomHeroes(1);
  const nonSpyCount = activePlayers.length - 1;

  // Generate personalized hints for each non-spy player about the SAME hero
  let hints: string[] = activePlayers.map(() => "Describe this hero's playstyle carefully without naming them!");

  try {
    const prompt = `You are a game master for "Spy" using Dota 2 heroes. The secret hero is: ${sharedHero.name} (${sharedHero.role}, style: ${sharedHero.tags.join(", ")}).

Generate ${nonSpyCount} SHORT unique hints for ${nonSpyCount} different players — all about the SAME hero but from different angles:
- 2-3 sentences about the hero's playstyle WITHOUT naming the hero
- Each hint should emphasize a different aspect so players don't sound identical
- Give each player a different roleplay angle

Respond ONLY with JSON array (no markdown):
[{"playerIndex":0,"hint":"..."},...]`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800,
      temperature: 0.85,
    });

    const text = completion.choices[0]?.message?.content || "[]";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    // Map hints to non-spy players (skip spy slot)
    let hintIdx = 0;
    hints = activePlayers.map((_, i) => {
      if (i === spyIndex) return "";
      return parsed[hintIdx++]?.hint || hints[0];
    });
  } catch (e) {
    console.error("Groq hint error:", e);
  }

  // Assign roles: all non-spy players get the SAME hero, spy gets "???"
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
      answers: [],
    };
  });

  await updateLobby(code, {
    players: updatedPlayers,
    status: "playing",
    currentRound: 1,
    roundVotes: {},
    votingOpen: false,
  });

  // Send private data to each player via individual channels
  for (const player of updatedPlayers.filter(p => !p.isKicked)) {
    await pusherServer.trigger(`player-${code}-${player.id}`, "game-assigned", {
      heroId: player.heroId,
      heroName: player.heroName,
      isSpy: player.isSpy,
      hint: player.hint,
    });
  }

  // Broadcast game start (public info only)
  await pusherServer.trigger(`lobby-${code}`, "game-started", {
    mode: lobby.mode,
    rounds: lobby.rounds,
    currentRound: 1,
    players: updatedPlayers.filter(p => !p.isKicked).map(p => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      hasAnswered: false,
      votes: 0,
    })),
  });

  return NextResponse.json({ ok: true });
}
