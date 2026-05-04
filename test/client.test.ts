import { describe, it, expect, vi } from "vitest";
import {
  createChainguardClient,
  DEFAULT_BASE_URL,
  USER_AGENT,
} from "../src/index.js";

interface CapturedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
}

const captureFetch = (
  responder: (req: Request) => Response | Promise<Response>,
): {
  fetch: (input: Request) => Promise<Response>;
  calls: CapturedRequest[];
} => {
  const calls: CapturedRequest[] = [];
  const fetchImpl = async (input: Request): Promise<Response> => {
    const cloned = input.clone();
    const headers: Record<string, string> = {};
    cloned.headers.forEach((v, k) => {
      headers[k] = v;
    });
    calls.push({
      url: input.url,
      method: input.method,
      headers,
      body: cloned.body ? await cloned.text() : null,
    });
    return responder(input);
  };
  return { fetch: fetchImpl, calls };
};

const okJson = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

const errJson = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("createChainguardClient", () => {
  it("sets Authorization: Bearer <token> when token is a string", async () => {
    const { fetch, calls } = captureFetch(() => okJson({}));
    const client = createChainguardClient({
      token: "static-token-abc",
      fetch,
    });

    await client.GET("/ping/v2beta1/ping");

    expect(calls).toHaveLength(1);
    expect(calls[0]!.headers["authorization"]).toBe("Bearer static-token-abc");
  });

  it("calls the token provider per-request when token is a function", async () => {
    const { fetch, calls } = captureFetch(() => okJson({}));
    const provider = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce("tok-1")
      .mockResolvedValueOnce("tok-2");

    const client = createChainguardClient({ token: provider, fetch });

    await client.GET("/ping/v2beta1/ping");
    await client.GET("/ping/v2beta1/ping");

    expect(provider).toHaveBeenCalledTimes(2);
    expect(calls[0]!.headers["authorization"]).toBe("Bearer tok-1");
    expect(calls[1]!.headers["authorization"]).toBe("Bearer tok-2");
  });

  it("supports synchronous token providers", async () => {
    const { fetch, calls } = captureFetch(() => okJson({}));
    const client = createChainguardClient({
      token: () => "sync-token",
      fetch,
    });

    await client.GET("/ping/v2beta1/ping");
    expect(calls[0]!.headers["authorization"]).toBe("Bearer sync-token");
  });

  it("uses DEFAULT_BASE_URL when baseUrl is not provided", async () => {
    const { fetch, calls } = captureFetch(() => okJson({}));
    const client = createChainguardClient({ token: "t", fetch });

    await client.GET("/ping/v2beta1/ping");
    expect(calls[0]!.url.startsWith(DEFAULT_BASE_URL)).toBe(true);
  });

  it("honors a custom baseUrl", async () => {
    const { fetch, calls } = captureFetch(() => okJson({}));
    const client = createChainguardClient({
      token: "t",
      baseUrl: "https://staging.example.test",
      fetch,
    });

    await client.GET("/ping/v2beta1/ping");
    expect(calls[0]!.url).toBe(
      "https://staging.example.test/ping/v2beta1/ping",
    );
  });

  it("invokes the custom fetch (not the global fetch)", async () => {
    const { fetch, calls } = captureFetch(() => okJson({}));
    const client = createChainguardClient({ token: "t", fetch });

    await client.GET("/ping/v2beta1/ping");
    expect(calls).toHaveLength(1);
  });

  it("returns { error } on a non-2xx response (does not throw)", async () => {
    const { fetch } = captureFetch(() =>
      errJson(401, { code: "unauthorized", message: "bad token" }),
    );
    const client = createChainguardClient({ token: "t", fetch });

    const result = await client.GET("/ping/v2beta1/ping");

    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
    expect(result.response.status).toBe(401);
  });

  it("sets the User-Agent header on every request", async () => {
    const { fetch, calls } = captureFetch(() => okJson({}));
    const client = createChainguardClient({ token: "t", fetch });

    await client.GET("/ping/v2beta1/ping");
    expect(calls[0]!.headers["user-agent"]).toBe(USER_AGENT);
    expect(calls[0]!.headers["user-agent"]).toMatch(
      /^chainguard-api-client\/\d+\.\d+\.\d+/,
    );
  });

  it("merges caller-provided default headers without overriding Authorization", async () => {
    const { fetch, calls } = captureFetch(() => okJson({}));
    const client = createChainguardClient({
      token: "real-token",
      headers: {
        "x-custom": "yes",
        Authorization: "Bearer should-be-overridden",
      },
      fetch,
    });

    await client.GET("/ping/v2beta1/ping");
    expect(calls[0]!.headers["x-custom"]).toBe("yes");
    expect(calls[0]!.headers["authorization"]).toBe("Bearer real-token");
  });
});
