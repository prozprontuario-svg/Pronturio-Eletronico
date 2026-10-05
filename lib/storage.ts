import path from "node:path";
import fs from "node:fs";
export function uploadsPath() {
  const target = path.resolve(/* turbopackIgnore: true */ process.cwd(), "uploads");
  fs.mkdirSync(target, { recursive: true });
  return target;
}
