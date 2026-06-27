import { NextRequest, NextResponse } from "next/server";
import { validateBackendToken } from "@/lib/validate-token";
import { isValidReferer } from "@/lib/allowed-referers";
import { FIELD_MAP } from "@/lib/token";
import { createClient } from "@supabase/supabase-js";

const KRATOS_BASE = "http://localhost:3000/backend/servers/kratos";

const supabase = createClient(
  process.env.SUPABASE_URL_VIMEUS!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_VIMEUS!,
);

type Embed = {
  url: string;
  server: string;
  lang: string | null;
  quality: string | null;
  subtitle: number;
};

type CachedRow = {
  embeds: Embed[];
};

async function getOrFetchEmbeds(
  tmdbId: string,
  media_type: string,
  season: string,
  episode: string,
): Promise<Embed[] | null> {
  // Check cache first
  const { data: cached } = await supabase
    .from("media_streams")
    .select("embeds")
    .eq("tmdb_id", tmdbId)
    .eq("media_type", media_type)
    .eq("season", season)
    .eq("episode", episode)
    .maybeSingle<CachedRow>();

  if (cached?.embeds) return cached.embeds;

  // Fetch from Kratos
  const params = new URLSearchParams({ tmdb: tmdbId, media_type });
  if (season) params.set("season", season);
  if (episode) params.set("episode", episode);

  const res = await fetch(`${KRATOS_BASE}/1?${params.toString()}`, {
    cache: "no-store",
  });

  if (!res.ok) return null;

  const data = await res.json();
  const embeds: Embed[] = data?.embeds ?? [];

  if (!embeds.length) return null;

  // Upsert into cache
  await supabase.from("media_streams").upsert(
    {
      tmdb_id: tmdbId,
      media_type,
      season,
      episode,
      title: data?.title ?? null,
      embeds,
    },
    { onConflict: "tmdb_id,media_type,season,episode" },
  );

  return embeds;
}

async function resolveVimeos(embedUrl: string): Promise<string | null> {
  const res = await fetch(
    `${KRATOS_BASE}/2?url=${encodeURIComponent(embedUrl)}`,
    { cache: "no-store" },
  );

  if (!res.ok) return null;

  const data = await res.json();
  return data?.success ? data.m3u8 : null;
}

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get(FIELD_MAP.id);
    const media_type = req.nextUrl.searchParams.get("b");
    const season = req.nextUrl.searchParams.get(FIELD_MAP.season) ?? "";
    const episode = req.nextUrl.searchParams.get(FIELD_MAP.episode) ?? "";
    const tmdbId = req.nextUrl.searchParams.get(FIELD_MAP.id);
    const ts = Number(req.nextUrl.searchParams.get(FIELD_MAP.ts));
    const token = req.nextUrl.searchParams.get(FIELD_MAP.token)!;
    const f_token = req.nextUrl.searchParams.get(FIELD_MAP.fToken)!;

    if (!id || !media_type || !ts || !token) {
      return NextResponse.json(
        { success: false, error: "need token" },
        { status: 404 },
      );
    }

    if (Date.now() - Number(ts) > 8000) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 403 },
      );
    }

    if (!validateBackendToken(id, f_token, ts, token)) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 403 },
      );
    }

    const referer = req.headers.get("referer") || "";
    if (!isValidReferer(referer)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    if (!tmdbId) {
      return NextResponse.json(
        { success: false, error: "Missing id" },
        { status: 400 },
      );
    }

    let embeds: Embed[] | null = null;

    try {
      embeds = await getOrFetchEmbeds(tmdbId, media_type, season, episode);
    } catch {
      return NextResponse.json(
        { success: false, error: "Failed to fetch embeds" },
        { status: 504 },
      );
    }

    if (!embeds?.length) {
      return NextResponse.json(
        { success: false, error: "No embeds found" },
        { status: 502 },
      );
    }

    const vimeosEmbed = embeds.find((e) => e.url.includes("vimeos.net"));

    if (!vimeosEmbed) {
      return NextResponse.json(
        { success: false, error: "No vimeos embed found" },
        { status: 502 },
      );
    }

    let m3u8: string | null = null;

    try {
      m3u8 = await resolveVimeos(vimeosEmbed.url);
    } catch {
      return NextResponse.json(
        { success: false, error: "Failed to resolve stream" },
        { status: 504 },
      );
    }

    if (!m3u8) {
      return NextResponse.json(
        { success: false, error: "Stream resolution failed" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      links: [{ type: "hls", link: m3u8 }],
      subtitles: [],
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
