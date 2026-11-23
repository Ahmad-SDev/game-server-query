import { isIPv6 } from "node:net";
import type { ServerAddress } from "./types.ts";

const BRACKETED_IPV6 = /^\[(?<host>[^\]]+)\](?::(?<port>\d+))?$/;
const HOST_WITH_PORT = /^(?<host>[^:]+)(?::(?<port>\d+))?$/;

export function parseAddress(target: string, defaultPort: number): ServerAddress {
  const trimmed = target.trim();
  const match = BRACKETED_IPV6.exec(trimmed) ?? HOST_WITH_PORT.exec(trimmed);

  if (!match?.groups?.host) {
    if (isIPv6(trimmed)) {
      return { host: trimmed, port: defaultPort };
    }
    throw new TypeError(`invalid server address "${target}"`);
  }

  const port = match.groups.port === undefined ? defaultPort : Number(match.groups.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new TypeError(`invalid port in "${target}"`);
  }
  return { host: match.groups.host, port };
}
