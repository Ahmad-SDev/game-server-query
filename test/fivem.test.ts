import assert from "node:assert/strict";
import { once } from "node:events";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { QueryError } from "../src/errors.ts";
import { FiveMQuery } from "../src/protocols/fivem.ts";

const endpoints = new Map<string, object>();

let server: http.Server;
let port: number;

before(async () => {
  server = http.createServer((request, response) => {
    const body = endpoints.get(request.url ?? "");
    response.writeHead(body ? 200 : 404, { "Content-Type": "application/json" });
    response.end(JSON.stringify(body ?? {}));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  port = (server.address() as AddressInfo).port;
});

after(() => server.close());

test("combines dynamic.json and info.json", async () => {
  endpoints.set("/dynamic.json", {
    hostname: "^1MAHosting ^7Roleplay",
    clients: 37,
    sv_maxclients: "64",
    mapname: "fivem-map-skater",
    gametype: "Freeroam",
  });
  endpoints.set("/info.json", { server: "FXServer-master SERVER v1.0.0.12345 linux" });

  const status = await new FiveMQuery().query({ host: "127.0.0.1", port });

  assert.equal(status.name, "MAHosting Roleplay");
  assert.deepEqual([status.playersOnline, status.playersMax], [37, 64]);
  assert.equal(status.map, "fivem-map-skater");
  assert.equal(status.version, "FXServer-master SERVER v1.0.0.12345 linux");
});

test("turns HTTP errors into query errors", async () => {
  endpoints.delete("/info.json");

  await assert.rejects(new FiveMQuery().query({ host: "127.0.0.1", port }), QueryError);
});
