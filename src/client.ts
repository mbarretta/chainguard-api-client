import createOpenApiClient, {
  type Client,
  type ClientOptions,
  type Middleware,
} from "openapi-fetch";

import type { paths } from "./generated/types.js";
import { USER_AGENT } from "./version.js";

/**
 * The default Chainguard API base URL (from the OpenAPI v2beta1 spec's
 * `servers[0].url`). Override via `ChainguardClientOptions.baseUrl` for
 * staging, on-prem, or test environments.
 */
export const DEFAULT_BASE_URL = "https://console-api.enforce.dev";

/**
 * A function that returns a bearer token. Called once per request so
 * callers can implement refresh/rotation without recreating the client.
 */
export type TokenProvider = () => string | Promise<string>;

export interface ChainguardClientOptions
  extends Omit<ClientOptions, "baseUrl" | "headers"> {
  /**
   * Bearer token. Either a static string or a function that returns one
   * (sync or async). The function is called per-request, allowing rotation.
   */
  token: string | TokenProvider;

  /** API base URL. Defaults to {@link DEFAULT_BASE_URL}. */
  baseUrl?: string;

  /**
   * Additional default headers merged into every request. The
   * `Authorization` header is always overridden by the token.
   */
  headers?: Record<string, string>;
}

export type ChainguardClient = Client<paths>;

const resolveToken = async (
  source: string | TokenProvider,
): Promise<string> =>
  typeof source === "function" ? await source() : source;

/**
 * Create a typed Chainguard API v2 client.
 *
 * @example
 * ```ts
 * const client = createChainguardClient({
 *   token: process.env.CHAINGUARD_TOKEN!,
 * });
 * const { data, error } = await client.GET("/ping/v2beta1/ping");
 * ```
 */
export function createChainguardClient(
  options: ChainguardClientOptions,
): ChainguardClient {
  const {
    token,
    baseUrl = DEFAULT_BASE_URL,
    headers: extraHeaders,
    ...rest
  } = options;

  const client = createOpenApiClient<paths>({
    baseUrl,
    headers: {
      "User-Agent": USER_AGENT,
      ...extraHeaders,
    },
    ...rest,
  });

  const authMiddleware: Middleware = {
    async onRequest({ request }) {
      const value = await resolveToken(token);
      request.headers.set("Authorization", `Bearer ${value}`);
      return request;
    },
  };

  client.use(authMiddleware);
  return client;
}
