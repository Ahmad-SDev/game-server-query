export type GameProtocol = "source" | "minecraft" | "fivem";

export interface ServerAddress {
  host: string;
  port: number;
}

export interface QueryOptions {
  timeoutMs?: number;
}

export interface ServerStatus {
  protocol: GameProtocol;
  name: string;
  map?: string;
  game?: string;
  version?: string;
  playersOnline: number;
  playersMax: number;
  bots?: number;
  latencyMs: number;
}

export interface GameServerQuery {
  readonly protocol: GameProtocol;
  readonly defaultPort: number;
  query(address: ServerAddress, options?: QueryOptions): Promise<ServerStatus>;
}

export const DEFAULT_TIMEOUT_MS = 3000;
