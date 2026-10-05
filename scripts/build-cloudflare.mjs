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

run(process.execPath, [path.join("node_modules", "next", "dist", "bin", "next"), "build"]);
run(process.execPath, [path.join("node_modules", "@opennextjs", "cloudflare", "dist", "cli", "index.js"), "build", "--skipNextBuild"]);
