import { fetchWithTimeout } from "@/lib/fetch-timeout";
import { NextRequest, NextResponse } from "next/server";
import { validateBackendToken } from "@/lib/validate-token";
import { isValidReferer } from "@/lib/allowed-referers";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_TALOS!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_TALOS!,
);

async function dbGet(
  tmdbId: string,
  mediaType: string,
  season: string | null,
  episode: string | null,
) {
  try {
    const { data, error } = await supabase.rpc("get_streamtape", {
      p_tmdb_id: Number(tmdbId),
      p_media_type: mediaType,
      p_season: season ? Number(season) : null,
      p_episode: episode ? Number(episode) : null,
    });
    if (error || !data) return null;
    return data as string;
  } catch {
    return null;
  }
}

async function dbSave(
  tmdbId: string,
  mediaType: string,
  season: string | null,
  episode: string | null,
  year: string,
  iframeSrc: string,
) {
  try {
    const { error } = await supabase.rpc("save_streamtape", {
      p_tmdb_id: Number(tmdbId),
      p_media_type: mediaType,
      p_season: season ? Number(season) : null,
      p_episode: episode ? Number(episode) : null,
      p_year: Number(year),
      p_iframe_src: iframeSrc,
    });
    if (error) console.warn("[dbSave] error:", error);
  } catch (err: any) {
    console.warn("[dbSave] exception:", err.message);
  }
}

export async function GET(req: NextRequest) {
  try {
    const tmdbId = req.nextUrl.searchParams.get("a");
    const mediaType = req.nextUrl.searchParams.get("b");
    const title = req.nextUrl.searchParams.get("f");
    const year = req.nextUrl.searchParams.get("g");
    const season = req.nextUrl.searchParams.get("s");
    const episode = req.nextUrl.searchParams.get("e");
    const ts = Number(req.nextUrl.searchParams.get("gago"));
    const token = req.nextUrl.searchParams.get("putangnamo")!;
    const f_token = req.nextUrl.searchParams.get("f_token")!;

    if (!tmdbId || !mediaType || !title || !year || !ts || !token) {
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

    // if (!validateBackendToken(tmdbId, f_token, ts, token)) {
    //   return NextResponse.json(
    //     { success: false, error: "Invalid token" },
    //     { status: 403 },
    //   );
    // }

    const referer = req.headers.get("referer") || "";
    if (!isValidReferer(referer)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    // ─── Check cache ──────────────────────────────────────────────────────────
    const cached = await dbGet(tmdbId, mediaType, season, episode);

    let iframeSrc: string;

    if (cached) {
      iframeSrc = cached;
    } else {
      const sourceUrl = new URL("https://test2.jerometecson-main.workers.dev/");
      sourceUrl.searchParams.set("id", tmdbId);
      sourceUrl.searchParams.set("type", mediaType);
      if (season && mediaType === "tv")
        sourceUrl.searchParams.set("season", season);
      if (episode && mediaType === "tv")
        sourceUrl.searchParams.set("episode", episode);

      const sourceRes = await fetchWithTimeout(
        sourceUrl.toString(),
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
          },
        },
        10000,
      );

      if (!sourceRes.ok) {
        return NextResponse.json(
          {
            success: false,
            error: "Source upstream failed",
            status: sourceRes.status,
          },
          { status: sourceRes.status },
        );
      }

      const sourceData = await sourceRes.json();

      if (!sourceData.iframeSrc) {
        return NextResponse.json(
          {
            success: false,
            error: "No stream link from source",
            detail: sourceData,
          },
          { status: 404 },
        );
      }

      iframeSrc = sourceData.iframeSrc;

      dbSave(tmdbId, mediaType, season, episode, year, iframeSrc).catch(
        (e: any) => console.warn("dbSave failed:", e.message),
      );
    }

    // ─── Step 4 proxy ─────────────────────────────────────────────────────────
    // ─── Step 4 proxy ─────────────────────────────────────────────────────────
    const step4Res = await fetchWithTimeout(
      `https://zxcstream.xyz/backend/proxy/streamtape/?url=${encodeURIComponent(iframeSrc)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        },
      },
      10000,
    );

    if (!step4Res.ok) {
      let step4ErrorBody: unknown = null;
      try {
        step4ErrorBody = await step4Res.json();
      } catch {
        try {
          step4ErrorBody = await step4Res.text();
        } catch {
          step4ErrorBody = "(unreadable body)";
        }
      }

      console.error("[Step4] upstream failed", {
        status: step4Res.status,
        statusText: step4Res.statusText,
        iframeSrc,
        body: step4ErrorBody,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Step 4 upstream failed",
          status: step4Res.status,
          statusText: step4Res.statusText,
          iframeSrc,
          detail: step4ErrorBody,
        },
        { status: step4Res.status },
      );
    }

    const step4Data = await step4Res.json();

    if (!step4Data.videoUrl) {
      console.error("[Step4] missing videoUrl", {
        iframeSrc,
        step4Data,
      });

      return NextResponse.json(
        {
          success: false,
          error: "No videoUrl from Step 4",
          iframeSrc,
          detail: step4Data,
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      cache: !!cached,
      links: [{ type: "mp4", link: step4Data.videoUrl }],
      subtitles: [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    return NextResponse.json(
      { success: false, error: message, stack },
      { status: 500 },
    );
  }
}
