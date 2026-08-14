import { Redis } from "@upstash/redis";

export function createRedis(
  env: NodeJS.ProcessEnv = process.env
): Redis | null {
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

let cached: Redis | null | undefined;

export function getRedis(): Redis | null {
  if (cached === undefined) {
    cached = createRedis();
  }
  return cached;
}
