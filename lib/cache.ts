import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function invalidateDoctorSearchCache() {
  try {
    const keys = await redis.keys("medicloud:doctors:*");
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (e) {
    console.error("[cache] Failed to invalidate doctor search cache", e);
  }
}

export { redis };
