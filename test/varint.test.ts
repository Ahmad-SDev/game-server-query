import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeVarInt, encodeVarInt } from "../src/varint.ts";

test("round-trips values across byte boundaries", () => {
  for (const value of [0, 1, 127, 128, 255, 25565, 2097151, 2147483647]) {
    assert.equal(decodeVarInt(encodeVarInt(value))?.value, value);
  }
});

test("encodes -1 as five bytes like the Minecraft protocol expects", () => {
  assert.deepEqual([...encodeVarInt(-1)], [0xff, 0xff, 0xff, 0xff, 0x0f]);
});

test("returns undefined for a truncated VarInt", () => {
  assert.equal(decodeVarInt(Buffer.from([0x80])), undefined);
});
