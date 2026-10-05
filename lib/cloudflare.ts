import { getCloudflareContext } from "@opennextjs/cloudflare";

export type R2Bucket = {
  put(key: string, value: ArrayBuffer | ArrayBufferView): Promise<unknown>;
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer>; httpMetadata?: { contentType?: string } } | null>;
};

export function cloudflareEnv() {
  try { return getCloudflareContext().env as Record<string, unknown>; }
  catch { return null; }
}

export function filesBucket() {
  return cloudflareEnv()?.FILES as R2Bucket | undefined;
}

export function isCloudflareWorker() {
  const env = cloudflareEnv();
  return Boolean(env && (env.DB || env.NEXTJS_ENV === "production"));
}
