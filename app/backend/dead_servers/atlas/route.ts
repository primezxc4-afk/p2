import { NextRequest, NextResponse } from "next/server";
import { validateBackendToken } from "@/lib/validate-token";
import { createClient } from "@supabase/supabase-js";
import { isValidReferer } from "@/lib/allowed-referers";
import { fetchWithTimeout } from "@/lib/fetch-timeout";
import { FIELD_MAP } from "@/lib/token";

const supabase = createClient(
  process.env.SUPABASE_URL_ATLAS!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_ATLAS!,
);

const WORKER_URL = "https://main.jinluxuz.workers.dev";
const WORKER_SECRET = "xk92mZpQ7vLw3nRt";
const FEBBOX_PLAYER_WORKER = "https://feb.jinluxusz.workers.dev/";
const MAX_FILE_SIZE_GB = 60;
const QUALITY_ORDER = ["1080p", "720p", "360p", "auto", "4k", "480p"];

function parseFileSizeGB(sizeStr: string): number {
  if (!sizeStr) return 0;
  const match = sizeStr.match(/([\d.]+)\s*(GB|MB)/i);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  return match[2].toUpperCase() === "GB" ? val : val / 1024;
}

function selectBestFile(files: any[]) {
  const qualify = (f: any) =>
    parseFileSizeGB(f.file_size) <= MAX_FILE_SIZE_GB &&
    f.source !== "CAM" &&
    !f.file_name?.toUpperCase().includes("CAM");

  const sorted = [...files].sort(
    (a, b) => parseFileSizeGB(a.file_size) - parseFileSizeGB(b.file_size),
  );

  return (
    sorted.find((f) => qualify(f) && f.quality === "4K") ??
    sorted.find((f) => qualify(f) && f.quality === "1080p") ??
    sorted.find((f) => qualify(f)) ??
    files[0]
  );
}

const PROXY_PREFIX = "https://proxy.jinluxusz.workers.dev/?url=";

function buildResponse(streams: Record<string, string>, cache: boolean) {
  const links = QUALITY_ORDER.filter((q) => streams[q]).map((q) => ({
    type: "hls" as const,
    link: `${PROXY_PREFIX}${encodeURIComponent(
      Buffer.from(streams[q], "utf8").toString("base64url"),
    )}`,
    resolution: parseInt(q),
  }));

  return NextResponse.json({
    success: true,
    cache,
    links,
    subtitles: [],
  });
}
export async function GET(req: NextRequest) {
  const logRequest = (status: number, reason: string) => {
    const tmdbId = req.nextUrl.searchParams.get(FIELD_MAP.id);
    const mediaType = req.nextUrl.searchParams.get("b");
    const season = req.nextUrl.searchParams.get(FIELD_MAP.season);
    const episode = req.nextUrl.searchParams.get(FIELD_MAP.episode);
    const extra = mediaType === "tv" ? `/${season}/${episode}` : "";
    console.log(
      `[ATLAS] ${tmdbId}/${mediaType}${extra} | ${status} | ${reason}`,
    );
  };
  try {
    const tmdbId = req.nextUrl.searchParams.get(FIELD_MAP.id); // "mid"
    const mediaType = req.nextUrl.searchParams.get("b"); // rotate this too if you want
    const season = req.nextUrl.searchParams.get(FIELD_MAP.season); // "sx"
    const episode = req.nextUrl.searchParams.get(FIELD_MAP.episode); // "ex"
    const title = req.nextUrl.searchParams.get(FIELD_MAP.title); // "q"
    const year = req.nextUrl.searchParams.get(FIELD_MAP.year); // "p"
    const ts = Number(req.nextUrl.searchParams.get(FIELD_MAP.ts)); // "rt"
    const token = req.nextUrl.searchParams.get(FIELD_MAP.token)!; // "sig"
    const f_token = req.nextUrl.searchParams.get(FIELD_MAP.fToken)!; // "xt"

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

    const { data: cachedStreams } = await supabase
      .from("feb_stream_cache")
      .select("stream_links, expires_at")
      .eq("tmdb_id", Number(tmdbId))
      .eq("media_type", mediaType)
      .eq("season", season ?? "")
      .eq("episode", episode ?? "")
      .maybeSingle();

    if (
      cachedStreams?.stream_links &&
      cachedStreams.expires_at &&
      new Date(cachedStreams.expires_at) > new Date()
    ) {
      logRequest(200, "cached streams");
      return buildResponse(cachedStreams.stream_links, true);
    }

    const { data: cached } = await supabase
      .from("feb_stream")
      .select("files")
      .eq("tmdb_id", Number(tmdbId))
      .eq("media_type", mediaType)
      .eq("season", season ?? "")
      .eq("episode", episode ?? "")
      .maybeSingle();

    if (cached) {
      const bestFile = selectBestFile(cached.files);
      if (!bestFile) {
        logRequest(403, "file not found");
        return NextResponse.json(
          { success: false, error: "No files found" },
          { status: 404 },
        );
      }

      const playerRes = await fetchWithTimeout(
        `${FEBBOX_PLAYER_WORKER}/?fid=${bestFile.data_id}`,
        {},
        8000,
      );
      if (!playerRes.ok) {
        logRequest(playerRes.status, "player worker failed");
        return NextResponse.json(
          { success: false, error: "Failed to load streams" },
          { status: 500 },
        );
      }

      const playerData = await playerRes.json();
      if (!playerData?.streams) {
        logRequest(500, "player worker failed");
        return NextResponse.json(
          { success: false, error: "Failed to load streams" },
          { status: 500 },
        );
      }
      await supabase.from("feb_stream_cache").upsert({
        tmdb_id: Number(tmdbId),
        media_type: mediaType,
        season: season ?? "",
        episode: episode ?? "",
        stream_links: playerData.streams,
        expires_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      });
      console.log(playerData);
      logRequest(200, "OK!!!!!");
      return buildResponse(playerData.streams, false);
    }

    const qs = new URLSearchParams({
      secret: WORKER_SECRET,
      title,
      year,
      mediaType,
      ...(season && { season }),
      ...(episode && { episode }),
    });

    const workerRes = await fetchWithTimeout(`${WORKER_URL}/?${qs}`, {}, 8000);

    const data = await workerRes.json();
    if (!data.success) {
      logRequest(500, "main.jinluxuz failed");
      return NextResponse.json(data, { status: 500 });
    }

    const { shareToken, files } = data;
    if (!files?.length) {
      logRequest(404, "no files found");
      return NextResponse.json(
        { success: false, error: "No files found" },
        { status: 404 },
      );
    }

    const bestFile = selectBestFile(files);

    const playerRes = await fetchWithTimeout(
      `${FEBBOX_PLAYER_WORKER}/?fid=${bestFile.data_id}`,
      {},
      8000,
    );
    if (!playerRes.ok) {
      logRequest(playerRes.status, "player worker failed");
      return NextResponse.json(
        { success: false, error: "Failed to load streams" },
        { status: 500 },
      );
    }

    const playerData = await playerRes.json();
    if (!playerData?.streams) {
      logRequest(500, "player worker failed");
      return NextResponse.json(
        { success: false, error: "Failed to load streams" },
        { status: 500 },
      );
    }
    await Promise.all([
      supabase.from("feb_stream").upsert({
        tmdb_id: Number(tmdbId),
        media_type: mediaType,
        season: season ?? "",
        episode: episode ?? "",
        year,
        share_token: shareToken,
        files,
      }),
      supabase.from("feb_stream_cache").upsert({
        tmdb_id: Number(tmdbId),
        media_type: mediaType,
        season: season ?? "",
        episode: episode ?? "",
        stream_links: playerData.streams,
        expires_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      }),
    ]);
    console.log(playerData);
    logRequest(200, "OK!!!!!");
    return buildResponse(playerData.streams, false);
  } catch (err: any) {
    console.error("API Error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
