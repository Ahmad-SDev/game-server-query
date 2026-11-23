import { parseAddress } from "./address.ts";
import { FiveMQuery } from "./protocols/fivem.ts";
import { MinecraftQuery } from "./protocols/minecraft.ts";
import { SourceQuery } from "./protocols/source.ts";
import type { GameProtocol, GameServerQuery, QueryOptions, ServerStatus } from "./types.ts";

const QUERIES: Readonly<Record<GameProtocol, GameServerQuery>> = {
  source: new SourceQuery(),
  minecraft: new MinecraftQuery(),
  fivem: new FiveMQuery(),
};

export const SUPPORTED_PROTOCOLS = Object.keys(QUERIES) as GameProtocol[];

export function isSupportedProtocol(value: string): value is GameProtocol {
  return Object.hasOwn(QUERIES, value);
}

export function queryFor(protocol: GameProtocol): GameServerQuery {
  return QUERIES[protocol];
}

/** Query a server by protocol name and "host[:port]", using the game's default port when none is given. */
export function queryServer(protocol: GameProtocol, target: string, options?: QueryOptions): Promise<ServerStatus> {
  const query = queryFor(protocol);
  return query.query(parseAddress(target, query.defaultPort), options);
}
