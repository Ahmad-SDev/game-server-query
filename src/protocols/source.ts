import dgram from "node:dgram";
import { once } from "node:events";
import { isIPv6 } from "node:net";
import { ByteReader } from "../byte-reader.ts";
import { MalformedResponseError } from "../errors.ts";
import { elapsedMs, runQuery } from "../run-query.ts";
import type { GameServerQuery, QueryOptions, ServerAddress, ServerStatus } from "../types.ts";

const SINGLE_PACKET = -1;
const INFO_RESPONSE = 0x49;
const CHALLENGE_RESPONSE = 0x41;
const INFO_REQUEST = Buffer.concat([
  Buffer.from([0xff, 0xff, 0xff, 0xff, 0x54]),
  Buffer.from("Source Engine Query\0", "latin1"),
]);

/** Valve A2S_INFO over UDP: CS2, Rust, ARK, Garry's Mod, TF2 and most Steam dedicated servers. */
export class SourceQuery implements GameServerQuery {
  readonly protocol = "source";
  readonly defaultPort = 27015;

  async query(address: ServerAddress, options?: QueryOptions): Promise<ServerStatus> {
    const startedAt = performance.now();
    return runQuery(address, options, async (signal) => {
      const reply = await this.requestInfo(address, signal);
      return parseInfoResponse(reply, elapsedMs(startedAt));
    });
  }

  private async requestInfo(address: ServerAddress, signal: AbortSignal): Promise<Buffer> {
    const socket = dgram.createSocket(isIPv6(address.host) ? "udp6" : "udp4");
    try {
      let reply = await exchange(socket, address, INFO_REQUEST, signal);
      if (reply[4] === CHALLENGE_RESPONSE) {
        const challenge = reply.subarray(5, 9);
        reply = await exchange(socket, address, Buffer.concat([INFO_REQUEST, challenge]), signal);
      }
      return reply;
    } finally {
      socket.close();
    }
  }
}

async function exchange(
  socket: dgram.Socket,
  address: ServerAddress,
  packet: Buffer,
  signal: AbortSignal,
): Promise<Buffer> {
  const reply = once(socket, "message", { signal });
  socket.send(packet, address.port, address.host);
  const [message] = (await reply) as [Buffer];
  return message;
}

export function parseInfoResponse(packet: Buffer, latencyMs: number): ServerStatus {
  const reader = new ByteReader(packet);

  if (reader.int32LE() !== SINGLE_PACKET) {
    throw new MalformedResponseError("split A2S_INFO replies are not supported");
  }
  const header = reader.uint8();
  if (header !== INFO_RESPONSE) {
    throw new MalformedResponseError(`unexpected A2S header 0x${header.toString(16)}`);
  }

  reader.uint8(); // protocol version
  const name = reader.cString();
  const map = reader.cString();
  reader.cString(); // game folder
  const game = reader.cString();
  reader.int16LE(); // Steam app id
  const playersOnline = reader.uint8();
  const playersMax = reader.uint8();
  const bots = reader.uint8();
  reader.char(); // server type
  reader.char(); // environment
  reader.uint8(); // password protected
  reader.uint8(); // VAC secured
  const version = reader.remaining > 0 ? reader.cString() : undefined;

  return { protocol: "source", name, map, game, version, playersOnline, playersMax, bots, latencyMs };
}
