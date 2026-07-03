# chainguard-api-client

Fast, lightweight, type-safe TypeScript client for the [Chainguard API v2 (`v2beta1`)](https://edu.chainguard.dev/chainguard/api/spec-api-v2/).

- Generated types from the upstream OpenAPI spec — full IntelliSense for paths, parameters, and responses
- Full `v2beta1` surface — IAM, registry (repos, tags, digests), events, libraries, vulnerability advisories, and STS
- Thin, auth-aware wrapper over [`openapi-fetch`](https://openapi-ts.dev/openapi-fetch/) — minimal runtime, no axios/no node-fetch
- Native `fetch` only — works in Node 18+, Bun, Deno, modern browsers, and edge runtimes
- Bring-your-own token — string, sync function, or async function (per-request resolution for rotation)

> **Status:** targets API `v2beta1` (currently in beta). Spec snapshot vendored at [`spec/openapi.json`](./spec/openapi.json); fetch provenance recorded in [`spec/METADATA.json`](./spec/METADATA.json). Spec-snapshot changes are tracked in the [CHANGELOG](./CHANGELOG.md).

## Install

```sh
npm install chainguard-api-client
# or
pnpm add chainguard-api-client
# or
yarn add chainguard-api-client
```

Requires **Node 18 or later** (for native `fetch`).

## Quick start

```ts
import { createChainguardClient } from "chainguard-api-client";

const client = createChainguardClient({
  token: process.env.CHAINGUARD_TOKEN!,
});

// Ping the API (no auth strictly required, but the client always sends it)
const { data, error } = await client.GET("/ping/v2beta1/ping");
if (error) {
  console.error("ping failed:", error);
} else {
  console.log("ping ok:", data);
}
```

`openapi-fetch` returns a discriminated `{ data, error, response }` — no exceptions on non-2xx, no `try/catch` boilerplate.

## End-to-end examples

### 1. Ping

```ts
const { data, error, response } = await client.GET("/ping/v2beta1/ping");
console.log("status:", response.status, "body:", data);
```

### 2. List IAM groups

```ts
const { data, error } = await client.GET("/iam/v2beta1/groups", {
  params: {
    query: {
      pageSize: 50,
      "uidp.inRoot": true,
    },
  },
});

if (error) throw new Error(`failed to list groups: ${JSON.stringify(error)}`);
for (const group of data?.groups ?? []) {
  console.log(group.uid, group.name);
}
```

### 3. List registry repos

```ts
const { data, error } = await client.GET("/registry/v2beta1/repos");
if (data?.repos) {
  for (const repo of data.repos) {
    console.log(`${repo.name} (${repo.uid})`);
  }
}
```

### 4. List vulnerability advisories

```ts
const { data, error } = await client.GET(
  "/vulnerabilities/v2beta1/advisories",
  {
    params: { query: { pageSize: 100 } },
  },
);
console.log(`${data?.advisories?.length ?? 0} advisories`);
```

## Authentication

The client takes a `token` and attaches `Authorization: Bearer <token>` to every request. **You** decide where the token comes from. Three patterns:

### Static token (env var)

```ts
const client = createChainguardClient({ token: process.env.CHAINGUARD_TOKEN! });
```

### Sourcing a token from `chainctl`

The Chainguard CLI [`chainctl`](https://edu.chainguard.dev/chainguard/chainctl/) can mint a short-lived token. The client deliberately doesn't shell out — keep that decision in *your* application:

```ts
import { execFileSync } from "node:child_process";

const getToken = () =>
  execFileSync("chainctl", ["auth", "token"], { encoding: "utf8" }).trim();

const client = createChainguardClient({ token: getToken });
```

Because `token` may be a function, it's called per-request — you get rotation for free.

### Async token provider (e.g. OIDC exchange)

```ts
const client = createChainguardClient({
  token: async () => {
    const r = await fetch("https://issuer.example/token", { method: "POST" });
    const { access_token } = (await r.json()) as { access_token: string };
    return access_token;
  },
});
```

## Configuration

```ts
createChainguardClient({
  token,                                      // required
  baseUrl: "https://console-api.enforce.dev", // default; override for staging/test
  fetch: customFetch,                         // optional — replaces global fetch
  headers: { "x-trace-id": "abc" },           // optional default headers
});
```

| Option    | Type                                                | Default                              |
| --------- | --------------------------------------------------- | ------------------------------------ |
| `token`   | `string \| () => string \| Promise<string>`         | _required_                           |
| `baseUrl` | `string`                                            | `https://console-api.enforce.dev`    |
| `fetch`   | `(input: Request) => Promise<Response>`             | `globalThis.fetch`                   |
| `headers` | `Record<string, string>`                            | adds `User-Agent: chainguard-api-client/<version>` |

## Reusing this package across projects

Until/unless this is published to a registry, you can consume it from another local project in two ways:

### Option A: `file:` dependency

```jsonc
// other-project/package.json
{
  "dependencies": {
    "chainguard-api-client": "file:../chainguard-api-client"
  }
}
```

Run `npm run build` in this repo first so `dist/` exists, then `npm install` in the consuming project.

### Option B: `npm link`

```sh
# in this repo
npm run build && npm link

# in the consuming project
npm link chainguard-api-client
```

### Option C: pack and install a tarball

```sh
# in this repo
npm run build && npm pack          # produces chainguard-api-client-0.2.0.tgz

# in the consuming project
npm install /path/to/chainguard-api-client-0.1.0.tgz
```

This is the most reproducible option for shared infrastructure repos.

## Regenerating types when the upstream spec updates

```sh
npm run spec:refresh   # fetch upstream spec, stamp spec/METADATA.json, regenerate types
npm run check          # typecheck + tests + verify types match the spec
```

The generated file (`src/generated/types.ts`) is committed so consumers don't need to run codegen on install. `npm run check` fails if it ever drifts from `spec/openapi.json`. Record breaking type changes in the [CHANGELOG](./CHANGELOG.md) and bump the version accordingly.

## Scripts

| Script                 | What it does                                                  |
| ---------------------- | ------------------------------------------------------------- |
| `npm run spec:refresh` | Fetch the upstream spec, stamp provenance, regenerate types   |
| `npm run spec:verify`  | Fail if `src/generated/types.ts` isn't derived from the spec  |
| `npm run generate`     | Regenerate `src/generated/types.ts` from the spec             |
| `npm run build`        | Build dual ESM + CJS + d.ts to `dist/` via `tsup`             |
| `npm run typecheck`    | `tsc --noEmit` against strict TypeScript                      |
| `npm test`             | Run `vitest` once                                             |
| `npm run check`        | Typecheck + tests + spec/types sync check (CI-style)          |

## License

Apache-2.0
