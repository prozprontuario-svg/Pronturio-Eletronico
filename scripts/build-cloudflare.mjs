import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const wranglerConfig = await readFile(resolve(projectRoot, "wrangler.jsonc"), "utf8");
if (wranglerConfig.includes("REPLACE_WITH_D1_DATABASE_ID")) {
  console.error(
    "Cloudflare build blocked: configure the real D1 database_id for 'proz-saude' in wrangler.jsonc. See docs/DEPLOYMENT.md.",
  );
  process.exit(1);
}

import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const env = {
  ...process.env,
  NEXT_PRIVATE_STANDALONE: "true",
  NEXT_PRIVATE_OUTPUT_TRACE_ROOT: root,
};

function run(command, args, childEnv = env) {
  const result = spawnSync(command, args, { cwd: root, env: childEnv, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(process.execPath, ["scripts/generate-prisma.mjs"]);
run(process.execPath, [path.join("node_modules", "next", "dist", "bin", "next"), "build"]);
run(process.execPath, [path.join("node_modules", "@opennextjs", "cloudflare", "dist", "cli", "index.js"), "build", "--skipNextBuild"]);
