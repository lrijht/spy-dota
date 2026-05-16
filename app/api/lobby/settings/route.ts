import { NextRequest, NextResponse } from "next/server";
import { getLobby, updateLobby } from "@/lib/store";
import { pusherServer } from "@/lib/pusher";

export async function POST(req: NextRequest) {
  const { code, playerId, mode, rounds } = await req.json();
  const lobby = await getLobby(code);
  if (!lobby) return NextResponse.json({ error: "Lobby not found" }, { status: 404 });
  if (lobby.hostId !== playerId) return NextResponse.json({ error: "Not host" }, { status: 403 });

  await updateLobby(code, { mode, rounds });
  await pusherServer.trigger(`lobby-${code}`, "settings-updated", { mode, rounds });

  return NextResponse.json({ ok: true });
}
