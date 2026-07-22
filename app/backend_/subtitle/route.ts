import { NextRequest, NextResponse } from "next/server";
import { validateBackendToken } from "@/lib/validate-token";
import { createClient } from "@supabase/supabase-js";
import { FIELD_MAP } from "@/lib/token";

const supabaseSubtitle = createClient(
  process.env.SUPABASE_URL_MOVIEBOX_SUBTITLE!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_MOVIEBOX_SUBTITLE!,
);

export async function GET(req: NextRequest) {
  try {
    const tmdbId = req.nextUrl.searchParams.get(FIELD_MAP.id);
    const mediaType = req.nextUrl.searchParams.get("b");
    const season = req.nextUrl.searchParams.get(FIELD_MAP.season);
    const episode = req.nextUrl.searchParams.get(FIELD_MAP.episode);
    const ts = Number(req.nextUrl.searchParams.get(FIELD_MAP.ts));
    const token = req.nextUrl.searchParams.get(FIELD_MAP.token)!;
    const f_token = req.nextUrl.searchParams.get(FIELD_MAP.fToken)!;

    if (!tmdbId || !mediaType || !ts || !token) {
      return NextResponse.json(
        { success: false, error: "need token" },
        { status: 404 },
      );
    }

    if (Date.now() - ts > 8000) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 403 },
      );
    }

    if (!validateBackendToken(tmdbId, f_token, ts, token)) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 403 },
      );
    }

    const { data } = await supabaseSubtitle
      .from("moviebox_subtitles_cache")
      .select("subtitles")
      .eq("tmdb_id", tmdbId)
      .eq("media_type", mediaType)
      .eq("season", season ?? "")
      .eq("episode", episode ?? "")
      .maybeSingle();

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Subtitles not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      subtitles: data?.subtitles ?? [],
      cached: !!data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
