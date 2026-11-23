#!/usr/bin/env node
import { parseArgs } from "node:util";
import { isSupportedProtocol, queryServer, SUPPORTED_PROTOCOLS } from "./registry.ts";
import type { ServerStatus } from "./types.ts";

const USAGE = `usage: gsq <${SUPPORTED_PROTOCOLS.join("|")}> <host[:port]> [--json] [--timeout ms]

examples:
  gsq minecraft play.example.com
  gsq source 203.0.113.10:27015 --json
  gsq fivem 203.0.113.20:30120 --timeout 5000`;

function formatStatus(status: ServerStatus): string {
  const rows: Array<[string, string | number | undefined]> = [
    ["name", status.name],
    ["players", `${status.playersOnline}/${status.playersMax}${status.bots ? ` (${status.bots} bots)` : ""}`],
    ["map", status.map],
    ["game", status.game],
    ["version", status.version],
    ["latency", `${status.latencyMs} ms`],
  ];
  return rows
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([label, value]) => `${label.padEnd(8)} ${value}`)
    .join("\n");
}

async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      json: { type: "boolean", default: false },
      timeout: { type: "string", default: "3000" },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  const [protocol, target] = positionals;
  if (values.help || !protocol || !target || !isSupportedProtocol(protocol)) {
    console.error(USAGE);
    return values.help ? 0 : 2;
  }

  try {
    const status = await queryServer(protocol, target, { timeoutMs: Number(values.timeout) });
    console.log(values.json ? JSON.stringify(status, null, 2) : formatStatus(status));
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return 1;
  }
}

process.exitCode = await main(process.argv.slice(2));
