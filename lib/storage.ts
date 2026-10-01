import path from "node:path";
export function uploadsPath() {
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.UPLOADS_PATH || "./uploads");
}
