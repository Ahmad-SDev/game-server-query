import { MalformedResponseError } from "./errors.ts";

export class ByteReader {
  private offset = 0;
  private readonly buffer: Buffer;

  constructor(buffer: Buffer) {
    this.buffer = buffer;
  }

  get remaining(): number {
    return this.buffer.length - this.offset;
  }

  uint8(): number {
    this.ensureAvailable(1);
    return this.buffer.readUInt8(this.offset++);
  }

  int16LE(): number {
    this.ensureAvailable(2);
    const value = this.buffer.readInt16LE(this.offset);
    this.offset += 2;
    return value;
  }

  int32LE(): number {
    this.ensureAvailable(4);
    const value = this.buffer.readInt32LE(this.offset);
    this.offset += 4;
    return value;
  }

  char(): string {
    return String.fromCharCode(this.uint8());
  }

  cString(): string {
    const end = this.buffer.indexOf(0, this.offset);
    if (end === -1) {
      throw new MalformedResponseError("unterminated string");
    }
    const value = this.buffer.toString("utf8", this.offset, end);
    this.offset = end + 1;
    return value;
  }

  bytes(length: number): Buffer {
    this.ensureAvailable(length);
    const slice = this.buffer.subarray(this.offset, this.offset + length);
    this.offset += length;
    return slice;
  }

  private ensureAvailable(length: number): void {
    if (this.remaining < length) {
      throw new MalformedResponseError(`expected ${length} more bytes, got ${this.remaining}`);
    }
  }
}
