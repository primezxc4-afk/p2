import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL_MOVIEBOX!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_MOVIEBOX!,
);

export async function POST(req: NextRequest) {
  try {
    const { tmdbId, mediaType, season, episode, dub, type } = await req.json();

    if (!tmdbId || !mediaType) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    const { data } = await supabase
      .from("moviebox_downloads_cache")
      .select("play_count")
      .eq("tmdb_id", tmdbId)
      .eq("media_type", mediaType)
      .eq("season", season ?? "")
      .eq("episode", episode ?? "")
      .eq("dub", dub ?? "orig")
      .eq("type", type ?? 0)
      .maybeSingle();

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Cache entry not found" },
        { status: 404 },
      );
    }

    const newCount = (data.play_count ?? 0) + 1;

    await supabase
      .from("moviebox_downloads_cache")
      .update({ play_count: newCount })
      .eq("tmdb_id", tmdbId)
      .eq("media_type", mediaType)
      .eq("season", season ?? "")
      .eq("episode", episode ?? "")
      .eq("dub", dub ?? "orig")
      .eq("type", type ?? 0);

    return NextResponse.json({ success: true, play_count: newCount });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }
}
