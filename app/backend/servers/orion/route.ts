// import { fetchWithTimeout } from "@/lib/fetch-timeout";
// import { NextRequest, NextResponse } from "next/server";
// import { validateBackendToken } from "@/lib/validate-token";
// import { isValidReferer } from "@/lib/allowed-referers";
// import { createClient } from "@supabase/supabase-js";
// import { FIELD_MAP } from "@/lib/token";

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_HOLLY_SUPABASE_URL_HOLLY!,
//   process.env.HOLLY_SUPABASE_SERVICE_ROLE_KEY_HOLLY!,
// );

// const HOLLY_WORKERS = [
//   "zxcprime360",
//   "zxcprime361",
//   "zxcprime367",
//   "zxcprime368",
//   "jinluxus303",
//   "zxcprime359",
//   "zxcprime362",
//   "jerometecson21799",
//   "jerometecsonn",
//   "amenohabakiri174",
// ];

// function randomWorker(): string {
//   return HOLLY_WORKERS[Math.floor(Math.random() * HOLLY_WORKERS.length)];
// }

// async function dbGet(
//   tmdbId: string,
//   mediaType: string,
//   season: string | null,
//   episode: string | null,
// ) {
//   try {
//     const { data, error } = await supabase.rpc("get_holly", {
//       p_tmdb_id: Number(tmdbId),
//       p_media_type: mediaType,
//       p_season: season ? Number(season) : null,
//       p_episode: episode ? Number(episode) : null,
//     });
//     if (error || !data) return null;
//     return data as Array<{ quality: string; embed_url: string }>;
//   } catch {
//     return null;
//   }
// }

// async function dbSave(
//   tmdbId: string,
//   mediaType: string,
//   season: string | null,
//   episode: string | null,
//   qualities: Array<{ quality: string; embed_url: string }>,
// ) {
//   try {
//     const { error } = await supabase.rpc("save_holly", {
//       p_tmdb_id: Number(tmdbId),
//       p_media_type: mediaType,
//       p_season: season ? Number(season) : null,
//       p_episode: episode ? Number(episode) : null,
//       p_qualities: qualities,
//     });
//     if (error) console.warn("[holly dbSave] error:", error);
//   } catch (err: any) {
//     console.warn("[holly dbSave] exception:", err.message);
//   }
// }

// export async function GET(req: NextRequest) {
//   try {
//     const tmdbId = req.nextUrl.searchParams.get(FIELD_MAP.id); // "mid"
//     const mediaType = req.nextUrl.searchParams.get("b"); // rotate this too if you want
//     const season = req.nextUrl.searchParams.get(FIELD_MAP.season); // "sx"
//     const episode = req.nextUrl.searchParams.get(FIELD_MAP.episode); // "ex"
//     const title = req.nextUrl.searchParams.get(FIELD_MAP.title); // "q"
//     const year = req.nextUrl.searchParams.get(FIELD_MAP.year); // "p"
//     const ts = Number(req.nextUrl.searchParams.get(FIELD_MAP.ts)); // "rt"
//     const token = req.nextUrl.searchParams.get(FIELD_MAP.token)!; // "sig"
//     const f_token = req.nextUrl.searchParams.get(FIELD_MAP.fToken)!; // "xt"

//     if (!tmdbId || !mediaType || !title || !year || !ts || !token) {
//       return NextResponse.json(
//         { success: false, error: "need token" },
//         { status: 404 },
//       );
//     }

//     if (Date.now() - Number(ts) > 8000) {
//       return NextResponse.json(
//         { success: false, error: "Invalid token" },
//         { status: 403 },
//       );
//     }

//     if (!validateBackendToken(tmdbId, f_token, ts, token)) {
//       return NextResponse.json(
//         { success: false, error: "Invalid token" },
//         { status: 403 },
//       );
//     }

//     const referer = req.headers.get("referer") || "";
//     if (!isValidReferer(referer)) {
//       return NextResponse.json(
//         { success: false, error: "Forbidden" },
//         { status: 403 },
//       );
//     }

//     // ─── STEP 1: Check cache, else fetch Holly metadata ───────────────────────
//     let qualities: Array<{ quality: string; embed_url: string }>;

//     const cached = await dbGet(tmdbId, mediaType, season, episode);

//     if (cached) {
//       qualities = cached;
//     } else {
//       const baseSlug = title
//         .toLowerCase()
//         .replace(/[^a-z0-9]+/g, "-")
//         .replace(/^-|-$/g, "");

//       const hollySlug =
//         mediaType === "tv" && season && episode
//           ? `${baseSlug}-season-${season}-episode-${episode}`
//           : `${baseSlug}-${year}`;

//       const step1Url = `https://holly-1.${randomWorker()}.workers.dev/?slug=${encodeURIComponent(hollySlug)}`;

//       const step1Res = await fetchWithTimeout(step1Url, {}, 15000);
//       if (!step1Res.ok) {
//         return NextResponse.json(
//           {
//             success: false,
//             error: "Holly step 1 failed",
//             status: step1Res.status,
//           },
//           { status: step1Res.status },
//         );
//       }

//       const step1Data = await step1Res.json();
//       qualities = step1Data.qualities ?? [];

//       if (!qualities.length) {
//         return NextResponse.json(
//           { success: false, error: "No qualities found from Holly" },
//           { status: 404 },
//         );
//       }

//       // fire-and-forget
//       dbSave(tmdbId, mediaType, season, episode, qualities).catch((e: any) =>
//         console.warn("[holly dbSave] failed:", e.message),
//       );
//     }

//     // ─── STEP 2: Pick best quality → resolve embed ────────────────────────────
//     const bestQuality =
//       qualities.find((q) => q.quality === "1080p") ??
//       qualities.find((q) => q.quality === "default") ??
//       qualities[0];

//     const embedUrl = bestQuality.embed_url;

//     const step2Url = `https://holly-2.${randomWorker()}.workers.dev/?embed_url=${encodeURIComponent(embedUrl)}`;

//     const step2Res = await fetchWithTimeout(step2Url, {}, 15000);
//     if (!step2Res.ok) {
//       return NextResponse.json(
//         {
//           success: false,
//           error: "Holly step 2 failed",
//           status: step2Res.status,
//         },
//         { status: step2Res.status },
//       );
//     }

//     const step2Data = await step2Res.json();
//     const sources: Array<{ label: string; type: string; file: string }> =
//       step2Data.sources ?? [];

//     if (!sources.length) {
//       return NextResponse.json(
//         { success: false, error: "No sources from Holly step 2" },
//         { status: 404 },
//       );
//     }

//     // ─── STEP 3: Find first working proxied source ────────────────────────────
//     for (const source of sources) {
//       const proxiedUrl = `https://holly-3.${randomWorker()}.workers.dev/?url=${encodeURIComponent(source.file)}`;
//       const res = await fetchWithTimeout(
//         proxiedUrl,
//         { method: "HEAD", headers: { Range: "bytes=0-1" } },
//         6000,
//       ).catch(() => null);

//       if (res?.ok) {
//         return NextResponse.json({
//           success: true,
//           c: !!cached,
//           links: [
//             { type: source.type === "hls" ? "hls" : "mp4", link: proxiedUrl },
//           ],
//           subtitles: [],
//         });
//       }
//     }

//     return NextResponse.json(
//       { success: false, error: "All sources failed proxy check" },
//       { status: 502 },
//     );
//   } catch (err) {
//     console.error("Holly route error:", err);
//     return NextResponse.json(
//       { success: false, error: "Internal server error" },
//       { status: 500 },
//     );
//   }
// }
import { fetchWithTimeout } from "@/lib/fetch-timeout";
import { NextRequest, NextResponse } from "next/server";
import { validateBackendToken } from "@/lib/validate-token";
import { isValidReferer } from "@/lib/allowed-referers";
import { createClient } from "@supabase/supabase-js";
import { FIELD_MAP } from "@/lib/token";

const supabase = createClient(
  process.env.NEXT_PUBLIC_HOLLY_SUPABASE_URL_HOLLY!,
  process.env.HOLLY_SUPABASE_SERVICE_ROLE_KEY_HOLLY!,
);

const HOLLY_WORKERS = [
  "test7-337",
  "test6-cb9",
  "test9-6da",
  "test8-98b",
  "zxcprime5",
  "zxcprime6",
  "primezxc4",
  "zxcprime360",
  "zxcprime361",
  "zxcprime367",
  "zxcprime368",
  "jinluxus303",
  "zxcprime359",
  "zxcprime362",
  "jerometecson21799",
  "jerometecsonn",
  "amenohabakiri174",
  //7 more
];

async function getWorkingWorkerUrl(
  urls: string[],
  timeout = 15000,
): Promise<Response | null> {
  for (const url of urls) {
    try {
      const res = await fetchWithTimeout(url, {}, timeout);
      if (res.ok) return res;
    } catch {}
  }
  return null;
}

type Quality = { quality: string; embed_url: string };
type Source = { label: string; type: string; file: string };

type CachedData = {
  qualities: Quality[];
  sources: Source[] | null;
};

async function dbGet(
  tmdbId: string,
  mediaType: string,
  season: string | null,
  episode: string | null,
): Promise<CachedData | null> {
  try {
    const { data, error } = await supabase.rpc("get_holly", {
      p_tmdb_id: Number(tmdbId),
      p_media_type: mediaType,
      p_season: season ? Number(season) : null,
      p_episode: episode ? Number(episode) : null,
    });
    if (error || !data) return null;
    return data as CachedData;
  } catch {
    return null;
  }
}

async function dbSave(
  tmdbId: string,
  mediaType: string,
  season: string | null,
  episode: string | null,
  qualities: Quality[],
  sources: Source[],
) {
  try {
    const { error } = await supabase.rpc("save_holly", {
      p_tmdb_id: Number(tmdbId),
      p_media_type: mediaType,
      p_season: season ? Number(season) : null,
      p_episode: episode ? Number(episode) : null,
      p_qualities: qualities,
      p_sources: sources,
    });
    if (error) console.warn("[holly dbSave] error:", error);
  } catch (err: any) {
    console.warn("[holly dbSave] exception:", err.message);
  }
}

async function dbUpdateSources(
  tmdbId: string,
  mediaType: string,
  season: string | null,
  episode: string | null,
  sources: Source[],
) {
  try {
    const { error } = await supabase.rpc("update_holly_sources", {
      p_tmdb_id: Number(tmdbId),
      p_media_type: mediaType,
      p_season: season ? Number(season) : null,
      p_episode: episode ? Number(episode) : null,
      p_sources: sources,
    });
    if (error) console.warn("[holly dbUpdateSources] error:", error);
  } catch (err: any) {
    console.warn("[holly dbUpdateSources] exception:", err.message);
  }
}

export async function GET(req: NextRequest) {
  const logRequest = (status: number, reason: string) => {
    const tmdbId = req.nextUrl.searchParams.get(FIELD_MAP.id);
    const mediaType = req.nextUrl.searchParams.get("b");
    const season = req.nextUrl.searchParams.get(FIELD_MAP.season);
    const episode = req.nextUrl.searchParams.get(FIELD_MAP.episode);
    const extra = mediaType === "tv" ? `/${season}/${episode}` : "";
    console.log(
      `[ORION] ${tmdbId}/${mediaType}${extra} | ${status} | ${reason}`,
    );
  };
  try {
    const tmdbId = req.nextUrl.searchParams.get(FIELD_MAP.id);
    const mediaType = req.nextUrl.searchParams.get("b");
    const season = req.nextUrl.searchParams.get(FIELD_MAP.season);
    const episode = req.nextUrl.searchParams.get(FIELD_MAP.episode);
    const title = req.nextUrl.searchParams.get(FIELD_MAP.title);
    const year = req.nextUrl.searchParams.get(FIELD_MAP.year);
    const ts = Number(req.nextUrl.searchParams.get(FIELD_MAP.ts));
    const token = req.nextUrl.searchParams.get(FIELD_MAP.token)!;
    const f_token = req.nextUrl.searchParams.get(FIELD_MAP.fToken)!;
    console.log(title);
    if (!tmdbId || !mediaType || !title || !year || !ts || !token) {
      logRequest(404, "missing params");
      return NextResponse.json(
        { success: false, error: "need token" },
        { status: 404 },
      );
    }

    if (Date.now() - ts > 8000) {
      logRequest(403, "token expired");
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 403 },
      );
    }

    if (!validateBackendToken(tmdbId, f_token, ts, token)) {
      logRequest(403, "invalid token");
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 403 },
      );
    }

    const referer = req.headers.get("referer") || "";
    if (!isValidReferer(referer)) {
      logRequest(403, "invalid referrer");
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const cached = await dbGet(tmdbId, mediaType, season, episode);

    let sources: Source[] = [];

    // ─── CASE 1: Full cache hit (qualities + sources) → skip step 1 & 2 ───────
    if (cached?.sources?.length) {
      sources = cached.sources;
    }

    // ─── CASE 2: Partial cache hit (qualities only) → skip step 1, run step 2 ─
    else if (cached?.qualities?.length) {
      const bestQuality =
        cached.qualities.find((q) => q.quality === "1080p") ??
        cached.qualities.find((q) => q.quality === "default") ??
        cached.qualities[0];

      const step2Res = await getWorkingWorkerUrl(
        [...HOLLY_WORKERS]
          .sort(() => Math.random() - 0.5)
          .map(
            (w) =>
              `https://holly-2.${w}.workers.dev/?embed_url=${encodeURIComponent(bestQuality.embed_url)}`,
          ),
      );

      if (!step2Res) {
        logRequest(502, "step 2 failed");
        return NextResponse.json(
          { success: false, error: "Holly step 2 failed" },
          { status: 502 },
        );
      }

      const step2Data = await step2Res.json();
      sources = step2Data.sources ?? [];

      if (!sources.length) {
        logRequest(404, "no sources from step 2");
        return NextResponse.json(
          { success: false, error: "No sources from Holly step 2" },
          { status: 404 },
        );
      }

      // update existing row with sources
      dbUpdateSources(tmdbId, mediaType, season, episode, sources).catch(
        (e: any) => console.warn("[holly dbUpdateSources] failed:", e.message),
      );
    }

    // ─── CASE 3: Cache miss → run step 1 + step 2, save everything ───────────
    else {
      const baseSlug = title!
        .toLowerCase()
        .replace(/['''`]/g, "") // strip apostrophes first
        .replace(/[^a-z0-9]+/g, "-") // then replace remaining non-alphanumeric
        .replace(/^-|-$/g, "");

      const hollySlug =
        mediaType === "tv" && season && episode
          ? `${baseSlug}-season-${season}-episode-${episode}`
          : `${baseSlug}-${year}`;

      const step1Res = await getWorkingWorkerUrl(
        [...HOLLY_WORKERS]
          .sort(() => Math.random() - 0.5)
          .map(
            (w) =>
              `https://holly-1.${w}.workers.dev/?slug=${encodeURIComponent(hollySlug)}`,
          ),
      );
      if (!step1Res) {
        logRequest(502, "step 1 failed");
        return NextResponse.json(
          { success: false, error: "Holly step 1 failed" },
          { status: 502 },
        );
      }
      const step1Data = await step1Res.json();
      const qualities: Quality[] = step1Data.qualities ?? [];

      if (!qualities.length) {
        logRequest(404, "no qualities found");
        return NextResponse.json(
          { success: false, error: "No qualities found from Holly" },
          { status: 404 },
        );
      }

      const bestQuality =
        qualities.find((q) => q.quality === "1080p") ??
        qualities.find((q) => q.quality === "default") ??
        qualities[0];

      // ✅ new
      const step2Res = await getWorkingWorkerUrl(
        [...HOLLY_WORKERS]
          .sort(() => Math.random() - 0.5)
          .map(
            (w) =>
              `https://holly-2.${w}.workers.dev/?embed_url=${encodeURIComponent(bestQuality.embed_url)}`,
          ),
      );
      if (!step2Res) {
        logRequest(502, "step 2 failed");
        return NextResponse.json(
          { success: false, error: "Holly step 2 failed" },
          { status: 502 },
        );
      }
      const step2Data = await step2Res.json();
      sources = step2Data.sources ?? [];

      if (!sources.length) {
        logRequest(404, "no sources from step 2");
        return NextResponse.json(
          { success: false, error: "No sources from Holly step 2" },
          { status: 404 },
        );
      }

      // fire-and-forget — save qualities + sources together
      dbSave(tmdbId, mediaType, season, episode, qualities, sources).catch(
        (e: any) => console.warn("[holly dbSave] failed:", e.message),
      );
    }

    // ─── STEP 3: Find first working proxied source ────────────────────────────
    for (const source of sources) {
      const res = await getWorkingWorkerUrl(
        [...HOLLY_WORKERS]
          .sort(() => Math.random() - 0.5)
          .map(
            (w) =>
              `https://holly-3.${w}.workers.dev/?url=${encodeURIComponent(source.file)}`,
          ),
        6000,
      );

      if (res) {
        const proxiedUrl = res.url;
        logRequest(200, "OK!!!!!");
        return NextResponse.json({
          success: true,
          c: !!cached,
          links: [
            { type: source.type === "hls" ? "hls" : "mp4", link: proxiedUrl },
          ],
          subtitles: [],
        });
      }
    }
    logRequest(502, "all sources failed proxy check");
    return NextResponse.json(
      { success: false, error: "All sources failed proxy check" },
      { status: 502 },
    );
  } catch (err) {
    console.error("Holly route error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
