import assert from "node:assert/strict";
import dgram from "node:dgram";
import { once } from "node:events";
import { after, before, test } from "node:test";
import { QueryTimeoutError } from "../src/errors.ts";
import { SourceQuery } from "../src/protocols/source.ts";

const CHALLENGE = Buffer.from([0x0a, 0x0b, 0x0c, 0x0d]);
const SIMPLE_HEADER = [0xff, 0xff, 0xff, 0xff];

function cString(value: string): Buffer {
  return Buffer.from(`${value}\0`, "utf8");
}

function infoReply(): Buffer {
  return Buffer.concat([
    Buffer.from([...SIMPLE_HEADER, 0x49, 17]),
    cString("MAHosting | Rust Weekly"),
    cString("Procedural Map"),
    cString("rust"),
    cString("Rust"),
    Buffer.from([0xfc, 0x0e]),
    Buffer.from([42, 100, 3]),
    Buffer.from("dl"),
    Buffer.from([0, 1]),
    cString("2589"),
  ]);
}

let server: dgram.Socket;
let silentServer: dgram.Socket;

before(async () => {
  server = dgram.createSocket("udp4");
  server.on("message", (message, sender) => {
    const answeredChallenge = message.subarray(-4).equals(CHALLENGE);
    const reply = answeredChallenge
      ? infoReply()
      : Buffer.concat([Buffer.from([...SIMPLE_HEADER, 0x41]), CHALLENGE]);
    server.send(reply, sender.port, sender.address);
  });
  silentServer = dgram.createSocket("udp4");

  server.bind(0, "127.0.0.1");
  silentServer.bind(0, "127.0.0.1");
  await Promise.all([once(server, "listening"), once(silentServer, "listening")]);
});

after(() => {
  server.close();
  silentServer.close();
});

test("answers the challenge and parses A2S_INFO", async () => {
  const status = await new SourceQuery().query({ host: "127.0.0.1", port: server.address().port });

  assert.equal(status.name, "MAHosting | Rust Weekly");
  assert.equal(status.map, "Procedural Map");
  assert.equal(status.game, "Rust");
  assert.equal(status.version, "2589");
  assert.deepEqual([status.playersOnline, status.playersMax, status.bots], [42, 100, 3]);
});

test("times out when the server never replies", async () => {
  const address = { host: "127.0.0.1", port: silentServer.address().port };

  await assert.rejects(new SourceQuery().query(address, { timeoutMs: 150 }), QueryTimeoutError);
});
