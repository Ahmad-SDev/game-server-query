import assert from "node:assert/strict";
import { once } from "node:events";
import net from "node:net";
import { after, before, test } from "node:test";
import { QueryError } from "../src/errors.ts";
import { MinecraftQuery } from "../src/protocols/minecraft.ts";
import { encodeString, encodeVarInt } from "../src/varint.ts";

function statusFrame(json: string): Buffer {
  const body = Buffer.concat([encodeVarInt(0x00), encodeString(json)]);
  return Buffer.concat([encodeVarInt(body.length), body]);
}

async function startServer(respond: (socket: net.Socket) => void): Promise<net.Server> {
  const server = net.createServer((socket) => socket.once("data", () => respond(socket)));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server;
}

function portOf(server: net.Server): number {
  return (server.address() as net.AddressInfo).port;
}

let healthyServer: net.Server;
let brokenJsonServer: net.Server;

before(async () => {
  healthyServer = await startServer((socket) => {
    const frame = statusFrame(
      JSON.stringify({
        version: { name: "Paper 1.21.4" },
        players: { online: 12, max: 50 },
        description: { text: "§aMAHosting ", extra: [{ text: "Survival" }, "§r!"] },
      }),
    );
    socket.write(frame.subarray(0, 7));
    setTimeout(() => socket.end(frame.subarray(7)), 20);
  });
  brokenJsonServer = await startServer((socket) => socket.end(statusFrame("{not json")));
});

after(() => {
  healthyServer.close();
  brokenJsonServer.close();
});

test("parses a status packet that arrives in several TCP chunks", async () => {
  const status = await new MinecraftQuery().query({ host: "127.0.0.1", port: portOf(healthyServer) });

  assert.equal(status.name, "MAHosting Survival!");
  assert.equal(status.version, "Paper 1.21.4");
  assert.deepEqual([status.playersOnline, status.playersMax], [12, 50]);
});

test("reports invalid status JSON as a query error", async () => {
  await assert.rejects(
    new MinecraftQuery().query({ host: "127.0.0.1", port: portOf(brokenJsonServer) }),
    QueryError,
  );
});

test("names the server when the connection is refused", async () => {
  const closedServer = await startServer(() => {});
  const port = portOf(closedServer);
  closedServer.close();

  await assert.rejects(new MinecraftQuery().query({ host: "127.0.0.1", port }), (error: unknown) => {
    assert.ok(error instanceof QueryError);
    assert.match(error.message, new RegExp(`127\\.0\\.0\\.1:${port}`));
    return true;
  });
});
