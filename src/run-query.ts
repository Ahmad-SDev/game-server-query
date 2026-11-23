import { QueryError, QueryTimeoutError } from "./errors.ts";
import { DEFAULT_TIMEOUT_MS, type QueryOptions, type ServerAddress } from "./types.ts";

/**
 * Runs one network exchange with a deadline. The signal is aborted on timeout or
 * completion so the protocol can release its socket, and every failure comes out
 * as a QueryError that names the server.
 */
export async function runQuery<T>(
  address: ServerAddress,
  options: QueryOptions | undefined,
  exchange: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  let timer: NodeJS.Timeout | undefined;

  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new QueryTimeoutError(address, timeoutMs)), timeoutMs);
  });

  try {
    return await Promise.race([exchange(controller.signal), deadline]);
  } catch (error) {
    if (error instanceof QueryError) {
      throw error;
    }
    const reason = error instanceof Error ? error.message : String(error);
    throw new QueryError(address, reason, { cause: error });
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

export function elapsedMs(startedAt: number): number {
  return Math.round(performance.now() - startedAt);
}
