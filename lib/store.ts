// In-memory store for lobbies (resets on server restart, fine for Vercel)
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

const lobbies = new Map<string, Lobby>();

export function createLobby(code: string, hostId: string): Lobby {
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
  lobbies.set(code, lobby);
  // Auto-cleanup after 3 hours
  setTimeout(() => lobbies.delete(code), 3 * 60 * 60 * 1000);
  return lobby;
}

export function getLobby(code: string): Lobby | undefined {
  return lobbies.get(code);
}

export function updateLobby(code: string, update: Partial<Lobby>): Lobby | null {
  const lobby = lobbies.get(code);
  if (!lobby) return null;
  const updated = { ...lobby, ...update };
  lobbies.set(code, updated);
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
