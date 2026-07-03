import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmp = mkdtempSync(join(tmpdir(), "spec-verify-"));
const out = join(tmp, "types.ts");
try {
  execFileSync("npx", ["openapi-typescript", "spec/openapi.json", "-o", out], {
    stdio: "pipe",
  });
  const expected = readFileSync(out, "utf8");
  const actual = readFileSync("src/generated/types.ts", "utf8");
  if (expected !== actual) {
    console.error(
      "src/generated/types.ts is out of sync with spec/openapi.json — run `npm run generate`.",
    );
    process.exit(1);
  }
  console.log("src/generated/types.ts matches spec/openapi.json");
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
