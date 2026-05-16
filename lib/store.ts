import { Redis } from "@upstash/redis";

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  heroId: string | null;
  heroName: string | null;
  isSpy: boolean;
  hint: string | null;
  hasAnswered: boolean;
  votes: number;
  isKicked: boolean;
  answers: { question: string; answer: string }[];
}

export interface Lobby {
  code: string;
  hostId: string;
  mode: "vote" | "simple" | null;
  rounds: number;
  currentRound: number;
  players: Player[];
  status: "waiting" | "playing" | "results" | "finished";
  createdAt: number;
  roundVotes: Record<string, string>; // voterId -> targetId
  votingOpen: boolean;
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const TTL = 3 * 60 * 60; // 3 hours in seconds

export async function createLobby(code: string, hostId: string): Promise<Lobby> {
  const lobby: Lobby = {
    code,
    hostId,
    mode: null,
    rounds: 3,
    currentRound: 1,
    players: [],
    status: "waiting",
    createdAt: Date.now(),
    roundVotes: {},
    votingOpen: false,
  };
  await redis.set(`lobby:${code}`, lobby, { ex: TTL });
  return lobby;
}

export async function getLobby(code: string): Promise<Lobby | null> {
  return redis.get<Lobby>(`lobby:${code}`);
}

export async function updateLobby(code: string, update: Partial<Lobby>): Promise<Lobby | null> {
  const lobby = await getLobby(code);
  if (!lobby) return null;
  const updated = { ...lobby, ...update };
  await redis.set(`lobby:${code}`, updated, { ex: TTL });
  return updated;
}

export function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
