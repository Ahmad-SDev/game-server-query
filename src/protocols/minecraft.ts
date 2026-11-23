import { once } from "node:events";
import net from "node:net";
import { MalformedResponseError } from "../errors.ts";
import { elapsedMs, runQuery } from "../run-query.ts";
import type { GameServerQuery, QueryOptions, ServerAddress, ServerStatus } from "../types.ts";
import { decodeVarInt, encodeString, encodeVarInt } from "../varint.ts";

const HANDSHAKE_PACKET_ID = 0x00;
const STATUS_PACKET_ID = 0x00;
const NEXT_STATE_STATUS = 1;
const ANY_PROTOCOL_VERSION = -1;

interface ChatComponent {
  text?: string;
  extra?: Array<ChatComponent | string>;
}

interface StatusPayload {
  version?: { name?: string };
  players?: { online?: number; max?: number };
  description?: ChatComponent | string;
}

/** Minecraft Java Edition Server List Ping (1.7+). */
export class MinecraftQuery implements GameServerQuery {
  readonly protocol = "minecraft";
  readonly defaultPort = 25565;

  async query(address: ServerAddress, options?: QueryOptions): Promise<ServerStatus> {
    const startedAt = performance.now();
    return runQuery(address, options, async (signal) => {
      const statusJson = await this.requestStatus(address, signal);
      return toServerStatus(parseStatusJson(statusJson), elapsedMs(startedAt));
    });
  }

  private async requestStatus(address: ServerAddress, signal: AbortSignal): Promise<string> {
    const socket = net.connect({ host: address.host, port: address.port, signal });
    try {
      await once(socket, "connect", { signal });
      socket.write(Buffer.concat([handshakePacket(address), packet(STATUS_PACKET_ID)]));
      return await readStatusJson(socket);
    } finally {
      socket.destroy();
    }
  }
}

function packet(id: number, ...fields: Buffer[]): Buffer {
  const body = Buffer.concat([encodeVarInt(id), ...fields]);
  return Buffer.concat([encodeVarInt(body.length), body]);
}

function handshakePacket(address: ServerAddress): Buffer {
  const port = Buffer.alloc(2);
  port.writeUInt16BE(address.port);
  return packet(
    HANDSHAKE_PACKET_ID,
    encodeVarInt(ANY_PROTOCOL_VERSION),
    encodeString(address.host),
    port,
    encodeVarInt(NEXT_STATE_STATUS),
  );
}

async function readStatusJson(socket: net.Socket): Promise<string> {
  let received = Buffer.alloc(0);
  for await (const chunk of socket) {
    received = Buffer.concat([received, chunk as Buffer]);
    const frame = completeFrame(received);
    if (frame) {
      return parseStatusFrame(frame);
    }
  }
  throw new MalformedResponseError("connection closed before the status packet arrived");
}

function completeFrame(received: Buffer): Buffer | undefined {
  const length = decodeVarInt(received);
  if (!length || received.length < length.bytesRead + length.value) {
    return undefined;
  }
  return received.subarray(length.bytesRead, length.bytesRead + length.value);
}

export function parseStatusFrame(frame: Buffer): string {
  const packetId = decodeVarInt(frame);
  if (!packetId || packetId.value !== STATUS_PACKET_ID) {
    throw new MalformedResponseError("expected a status response packet");
  }
  const stringLength = decodeVarInt(frame, packetId.bytesRead);
  if (!stringLength) {
    throw new MalformedResponseError("missing status string length");
  }
  const start = packetId.bytesRead + stringLength.bytesRead;
  return frame.toString("utf8", start, start + stringLength.value);
}

function parseStatusJson(statusJson: string): StatusPayload {
  try {
    return JSON.parse(statusJson) as StatusPayload;
  } catch {
    throw new MalformedResponseError("status is not valid JSON");
  }
}

function toServerStatus(payload: StatusPayload, latencyMs: number): ServerStatus {
  return {
    protocol: "minecraft",
    name: stripFormatting(flattenChat(payload.description ?? "")),
    version: payload.version?.name,
    playersOnline: payload.players?.online ?? 0,
    playersMax: payload.players?.max ?? 0,
    latencyMs,
  };
}

function flattenChat(component: ChatComponent | string): string {
  if (typeof component === "string") {
    return component;
  }
  return (component.text ?? "") + (component.extra ?? []).map(flattenChat).join("");
}

function stripFormatting(text: string): string {
  return text.replace(/§[0-9a-fk-or]/gi, "").trim();
}
