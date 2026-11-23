import type { ServerAddress } from "./types.ts";

export class QueryError extends Error {
  readonly address: ServerAddress;

  constructor(address: ServerAddress, reason: string, options?: ErrorOptions) {
    super(`${address.host}:${address.port}: ${reason}`, options);
    this.name = "QueryError";
    this.address = address;
  }
}

export class QueryTimeoutError extends QueryError {
  constructor(address: ServerAddress, timeoutMs: number) {
    super(address, `no response within ${timeoutMs} ms`);
    this.name = "QueryTimeoutError";
  }
}

export class MalformedResponseError extends Error {
  constructor(reason: string) {
    super(`malformed response: ${reason}`);
    this.name = "MalformedResponseError";
  }
}
