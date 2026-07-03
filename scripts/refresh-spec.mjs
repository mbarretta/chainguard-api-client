import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";

const SPEC_URL = "https://edu.chainguard.dev/api-v2beta1.json";
const SPEC_PATH = new URL("../spec/openapi.json", import.meta.url);
const METADATA_PATH = new URL("../spec/METADATA.json", import.meta.url);

const res = await fetch(SPEC_URL);
if (!res.ok) {
  throw new Error(`GET ${SPEC_URL} failed: ${res.status} ${res.statusText}`);
}
const body = Buffer.from(await res.arrayBuffer());
JSON.parse(body.toString("utf8")); // fail fast if upstream served non-JSON

await writeFile(SPEC_PATH, body);
await writeFile(
  METADATA_PATH,
  `${JSON.stringify(
    {
      sourceUrl: SPEC_URL,
      fetchedAt: new Date().toISOString(),
      sha256: createHash("sha256").update(body).digest("hex"),
    },
    null,
    2,
  )}\n`,
);

console.log(`Refreshed spec/openapi.json (${body.length} bytes) from ${SPEC_URL}`);
