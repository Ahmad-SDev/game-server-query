import { MalformedResponseError } from "./errors.ts";

const SEGMENT_BITS = 0x7f;
const CONTINUE_BIT = 0x80;
const MAX_VARINT_BYTES = 5;

export function encodeVarInt(value: number): Buffer {
  const bytes: number[] = [];
  let remaining = value >>> 0;
  do {
    let byte = remaining & SEGMENT_BITS;
    remaining >>>= 7;
    if (remaining !== 0) {
      byte |= CONTINUE_BIT;
    }
    bytes.push(byte);
  } while (remaining !== 0);
  return Buffer.from(bytes);
}

export interface DecodedVarInt {
  value: number;
  bytesRead: number;
}

/** Returns undefined when the buffer ends before the VarInt does. */
export function decodeVarInt(buffer: Buffer, offset = 0): DecodedVarInt | undefined {
  let value = 0;
  for (let index = 0; index < MAX_VARINT_BYTES; index++) {
    const byte = buffer[offset + index];
    if (byte === undefined) {
      return undefined;
    }
    value |= (byte & SEGMENT_BITS) << (7 * index);
    if ((byte & CONTINUE_BIT) === 0) {
      return { value, bytesRead: index + 1 };
    }
  }
  throw new MalformedResponseError("VarInt is longer than 5 bytes");
}

export function encodeString(value: string): Buffer {
  const utf8 = Buffer.from(value, "utf8");
  return Buffer.concat([encodeVarInt(utf8.length), utf8]);
}
