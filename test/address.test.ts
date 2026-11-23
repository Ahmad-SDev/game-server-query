import assert from "node:assert/strict";
import { test } from "node:test";
import { parseAddress } from "../src/address.ts";

test("uses the default port when none is given", () => {
  assert.deepEqual(parseAddress("play.example.com", 25565), { host: "play.example.com", port: 25565 });
});

test("reads an explicit port", () => {
  assert.deepEqual(parseAddress("203.0.113.10:27016", 27015), { host: "203.0.113.10", port: 27016 });
});

test("supports bracketed and bare IPv6", () => {
  assert.deepEqual(parseAddress("[2001:db8::1]:30120", 1), { host: "2001:db8::1", port: 30120 });
  assert.deepEqual(parseAddress("2001:db8::1", 30120), { host: "2001:db8::1", port: 30120 });
});

test("rejects malformed input", () => {
  assert.throws(() => parseAddress("host:99999", 1), /invalid port/);
  assert.throws(() => parseAddress("host:abc", 1), /invalid server address/);
});
