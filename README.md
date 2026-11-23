# game-server-query

[![CI](https://github.com/Ahmad-SDev/game-server-query/actions/workflows/ci.yml/badge.svg)](https://github.com/Ahmad-SDev/game-server-query/actions/workflows/ci.yml)

Ask a game server for its name, map, version and player count. I use this kind of check for hosting status pages and for alerting when a customer's server stops answering.

| Protocol    | Games                                                  | Default port |
|-------------|--------------------------------------------------------|--------------|
| `source`    | CS2, Rust, ARK, Garry's Mod, TF2 and other Steam servers (A2S_INFO, with challenge) | 27015 |
| `minecraft` | Minecraft Java Edition 1.7+ (Server List Ping)         | 25565        |
| `fivem`     | FiveM and RedM (`dynamic.json` + `info.json`)          | 30120        |

TypeScript, no runtime dependencies, Node 22.18+.

## CLI

```bash
npm install -g github:Ahmad-SDev/game-server-query

gsq minecraft mc.hypixel.net
gsq source 203.0.113.10:27015 --json
gsq fivem 203.0.113.20 --timeout 5000
```

```
name     Hypixel Network [1.8/26.3]
players  17619/200000
version  Requires MC 1.8 / 1.21
latency  495 ms
```

Exit code is 1 if the server doesn't answer, so it can be used in scripts and health checks.

## Library

```ts
import { queryServer, QueryTimeoutError } from "game-server-query";

try {
  const status = await queryServer("source", "203.0.113.10:27015", { timeoutMs: 2000 });
  console.log(`${status.name}: ${status.playersOnline}/${status.playersMax}`);
} catch (error) {
  if (error instanceof QueryTimeoutError) {
    // server is down or the port is filtered
  }
}
```

Every protocol implements the same `GameServerQuery` interface and returns the same `ServerStatus` shape. Adding a game means adding one class and one line in `src/registry.ts`.

## Development

```bash
npm install
npm run typecheck
npm test
```

The tests start small fake UDP, TCP and HTTP servers on localhost, so they cover the real socket code without needing internet access.

## Limitations

- Split (multi-packet) A2S_INFO replies are rejected. Info replies almost never need them.
- Bedrock Edition is not supported yet.

## License

MIT
