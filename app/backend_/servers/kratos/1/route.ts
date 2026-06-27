//http://localhost:3000/backend/servers/kratos/1?tmdb=238&media_type=movie

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// const supabase = createClient(
//   process.env.SUPABASE_URL_VIMEUS!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY_VIMEUS!,
// );
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const tmdb = searchParams.get("tmdb");
  const view_key =
    searchParams.get("view_key") ||
    "bhTbHlFlOK7k88Yq84x-gn0aYpoay8MTgwRv8W0y-hU";
  const se = searchParams.get("se") || "";
  const ep = searchParams.get("ep") || "";
  const media_type = searchParams.get("media_type");
  const media_type_format = media_type === "tv" ? "serie" : "movie";

  if (!tmdb || !view_key) {
    return NextResponse.json(
      { success: false, error: "Missing tmdb or view_key" },
      { status: 400 },
    );
  }

  const url = `https://vimeus.com/e/${media_type_format}?tmdb=${tmdb}&view_key=${view_key}${media_type === "tv" ? `&se=${se}&ep=${ep}` : ""}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
      Accept: "text/html,*/*",
      Referer: "https://vimeus.com/",
      Origin: "https://vimeus.com",
    },
  });

  const html = await res.text();
  const looseMatch = html.match(/\{(?:[^{}]|{[^{}]*})*\}/g);

  if (looseMatch) {
    for (const candidate of looseMatch.reverse()) {
      try {
        const json = JSON.parse(candidate);

        // if (json?.embeds && json.embeds.length > 0) {
        //   await supabase.from("media_streams").upsert(
        //     {
        //       tmdb_id: String(json.tmdb_id),
        //       media_type,
        //       season: media_type === "tv" ? Number(se) : "",
        //       episode: media_type === "tv" ? Number(ep) : "",
        //       title: json.title,
        //       embeds: json.embeds,
        //     },
        //     {
        //       onConflict: "tmdb_id,media_type,season,episode",
        //     },
        //   );
        // }

        if (json?.embeds) {
          return NextResponse.json({
            title: json.title,
            tmdb_id: json.tmdb_id,
            type: json.type,
            season: media_type === "tv" ? se : "",
            episode: media_type === "tv" ? ep : "",
            embeds: (json.embeds || []).map((e: any) => ({
              url: e.url,
              server: e.server,
              lang: e.lang,
              quality: e.quality,
              subtitle: e.subtitle ?? 0,
            })),
          });
        }
      } catch {}
    }
  }

  return NextResponse.json(
    { success: false, error: "No valid JSON structure found" },
    { status: 500 },
  );
}
