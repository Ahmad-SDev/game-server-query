import { MalformedResponseError } from "../errors.ts";
import { elapsedMs, runQuery } from "../run-query.ts";
import type { GameServerQuery, QueryOptions, ServerAddress, ServerStatus } from "../types.ts";

interface DynamicInfo {
  hostname?: string;
  clients?: number;
  sv_maxclients?: string | number;
  mapname?: string;
  gametype?: string;
}

interface ServerInfo {
  server?: string;
}

/** FiveM / RedM (Cfx.re) servers through their built-in HTTP endpoints. */
export class FiveMQuery implements GameServerQuery {
  readonly protocol = "fivem";
  readonly defaultPort = 30120;

  async query(address: ServerAddress, options?: QueryOptions): Promise<ServerStatus> {
    const startedAt = performance.now();
    return runQuery(address, options, async (signal) => {
      const [dynamic, info] = await Promise.all([
        getJson<DynamicInfo>(address, "dynamic.json", signal),
        getJson<ServerInfo>(address, "info.json", signal),
      ]);
      return toServerStatus(dynamic, info, elapsedMs(startedAt));
    });
  }
}

function toServerStatus(dynamic: DynamicInfo, info: ServerInfo, latencyMs: number): ServerStatus {
  return {
    protocol: "fivem",
    name: stripColourCodes(dynamic.hostname ?? ""),
    map: dynamic.mapname || undefined,
    game: dynamic.gametype || undefined,
    version: info.server,
    playersOnline: dynamic.clients ?? 0,
    playersMax: Number(dynamic.sv_maxclients ?? 0),
    latencyMs,
  };
}

async function getJson<T>(address: ServerAddress, path: string, signal: AbortSignal): Promise<T> {
  const host = address.host.includes(":") ? `[${address.host}]` : address.host;
  const response = await fetch(`http://${host}:${address.port}/${path}`, { signal });
  if (!response.ok) {
    throw new MalformedResponseError(`${path} returned HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

function stripColourCodes(text: string): string {
  return text.replace(/\^\d/g, "").trim();
}
