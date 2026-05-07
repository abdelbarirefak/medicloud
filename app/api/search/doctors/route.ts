import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Redis } from "@upstash/redis";
import { searchLimiter, getClientId, checkRateLimit } from "@/lib/ratelimit";

export const runtime = "edge";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    const clientId = getClientId(request);
    const rateLimitResponse = await checkRateLimit(searchLimiter, clientId);
    if (rateLimitResponse) return rateLimitResponse;

    const { searchParams } = new URL(request.url);
    const specialty = searchParams.get("specialty") || "Tous";
    const city = searchParams.get("city") || "Toutes";
    const query = (searchParams.get("q") || "").trim();
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const pageSize = Math.min(24, Math.max(1, Number(searchParams.get("pageSize") || "9")));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const cacheKey = `medicloud:doctors:${encodeURIComponent(specialty)}|${encodeURIComponent(city)}|${encodeURIComponent(query)}|${page}|${pageSize}`;
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      return NextResponse.json({
        source: "redis_cache",
        ...(cachedData as Record<string, unknown>),
      });
    }

    let doctorQuery = supabase
      .from("doctors")
      .select("*, profile:profiles(*)", { count: "exact" })
      .eq("is_verified", true)
      .order("rating", { ascending: false });

    if (specialty !== "Tous") doctorQuery = doctorQuery.eq("specialty", specialty);
    if (city !== "Toutes") doctorQuery = doctorQuery.eq("city", city);
    if (query) {
      const { data: matchingProfiles } = await supabase
        .from("profiles")
        .select("id")
        .ilike("full_name", `%${query}%`);

      const matchingUserIds = (matchingProfiles || []).map((profile) => profile.id);
      const clauses = [`specialty.ilike.%${query}%`, `city.ilike.%${query}%`, `bio.ilike.%${query}%`];

      if (matchingUserIds.length > 0) {
        clauses.push(`user_id.in.(${matchingUserIds.join(",")})`);
      }

      doctorQuery = doctorQuery.or(clauses.join(","));
    }

    const [{ data, error, count }, specialtiesResult, citiesResult] = await Promise.all([
      doctorQuery.range(from, to),
      supabase.from("specialties").select("name").order("name", { ascending: true }),
      supabase.from("doctors").select("city").eq("is_verified", true).neq("city", ""),
    ]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const specialties = ["Tous", ...new Set((specialtiesResult.data || []).map((s) => s.name))];
    const cities = ["Toutes", ...new Set((citiesResult.data || []).map((d) => d.city).filter(Boolean))];
    const payload = {
      data: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
      specialties,
      cities,
    };

    await redis.set(cacheKey, payload, { ex: 300 });

    return NextResponse.json({
      source: "postgres_db",
      ...payload,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
