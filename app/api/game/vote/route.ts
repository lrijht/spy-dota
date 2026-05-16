import { NextRequest, NextResponse } from "next/server";
import { getLobby, updateLobby } from "@/lib/store";
import { pusherServer } from "@/lib/pusher";

export async function POST(req: NextRequest) {
  const { code, voterId, targetId } = await req.json();
  const lobby = getLobby(code);
  if (!lobby) return NextResponse.json({ error: "Lobby not found" }, { status: 404 });
  if (!lobby.votingOpen) return NextResponse.json({ error: "Voting not open" }, { status: 400 });

  const updatedVotes: Record<string, string> = { ...lobby.roundVotes, [voterId]: targetId };

  const voteCounts: Record<string, number> = {};
  const voteValues = Object.values(updatedVotes) as string[];
  voteValues.forEach((tid: string) => {
    voteCounts[tid] = (voteCounts[tid] || 0) + 1;
  });

  const updatedPlayers = lobby.players.map(p => ({
    ...p,
    votes: voteCounts[p.id] || 0,
  }));

  const activePlayers = updatedPlayers.filter(p => !p.isKicked);
  const totalVoted = Object.keys(updatedVotes).length;
  const allVoted = totalVoted >= activePlayers.length;

  updateLobby(code, { roundVotes: updatedVotes, players: updatedPlayers });

  await pusherServer.trigger(`lobby-${code}`, "vote-updated", {
    players: activePlayers.map(p => ({ id: p.id, name: p.name, votes: p.votes })),
    totalVoted,
    allVoted,
    voterId,
    targetId,
  });

  return NextResponse.json({ ok: true, allVoted });
}
