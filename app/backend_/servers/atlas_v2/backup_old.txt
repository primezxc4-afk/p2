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
// const FEBBOX_PLAYER_WORKER = "https://febbox3.jinluxusz.workers.dev";
const FEBBOX_PLAYER_WORKER = "https://proxy.jerometecson0.workers.dev";
const MAX_FILE_SIZE_GB = 60;
// const QUALITY_ORDER = ["360p", "1080p", "auto", "4k", "720p", "480p"];
const QUALITY_ORDER = ["360p", "auto"];
async function dbGet(
  tmdbId: string,
  mediaType: string,
  season: string | null,
  episode: string | null,
) {
  try {
    let query = supabase
      .from("streams")
      .select("share_token, files")
      .eq("tmdb_id", Number(tmdbId))
      .eq("media_type", mediaType);

    if (season) query = query.eq("season", Number(season));
    else query = query.is("season", null);

    if (episode) query = query.eq("episode", Number(episode));
    else query = query.is("episode", null);

    const { data, error } = await query.maybeSingle();
    if (error || !data) return null;

    return {
      share_token: data.share_token,
      files: data.files ?? [],
    };
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
  shareToken: string,
  files: any[],
) {
  try {
    const { error } = await supabase.from("streams").insert({
      tmdb_id: Number(tmdbId),
      media_type: mediaType,
      season: season ? Number(season) : null,
      episode: episode ? Number(episode) : null,
      year: Number(year),
      share_token: shareToken,
      files,
    });

    if (error) console.warn("[dbSave] error:", error);
  } catch (err: any) {
    console.warn("[dbSave] exception:", err.message);
  }
}

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

function buildResponse(playerData: any) {
  const streams: Record<string, string> = playerData.streams ?? {};

  const links = QUALITY_ORDER.filter((q) => streams[q]).map((q) => ({
    type: "hls" as const,
    link: streams[q],
    resolution: parseInt(q),
  }));

  const byLanguage: Record<string, any[]> =
    playerData.subtitles?.by_language ?? {};
  const subtitles = Object.values(byLanguage)
    .flat()
    .map((sub: any) => ({
      id: sub.sid,
      display: sub.language,
      file: sub.url,
    }));

  return NextResponse.json({ success: true, links, subtitles });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const tmdbId = req.nextUrl.searchParams.get(FIELD_MAP.id); // "mid"
    const mediaType = req.nextUrl.searchParams.get("b"); // rotate this too if you want
    const season = req.nextUrl.searchParams.get(FIELD_MAP.season); // "sx"
    const episode = req.nextUrl.searchParams.get(FIELD_MAP.episode); // "ex"
    const title = req.nextUrl.searchParams.get(FIELD_MAP.title); // "q"
    const year = req.nextUrl.searchParams.get(FIELD_MAP.year); // "p"
    const ts = Number(req.nextUrl.searchParams.get(FIELD_MAP.ts)); // "rt"
    const token = req.nextUrl.searchParams.get(FIELD_MAP.token)!; // "sig"
    const f_token = req.nextUrl.searchParams.get(FIELD_MAP.fToken)!; // "xt"

    if (!tmdbId || !mediaType || !title || !year || !ts || !token)
      return NextResponse.json(
        { success: false, error: "need token" },
        { status: 404 },
      );

    if (Date.now() - ts > 8000)
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 403 },
      );

    if (!validateBackendToken(tmdbId, f_token, ts, token))
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 403 },
      );

    const referer = req.headers.get("referer") || "";
    if (!isValidReferer(referer))
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );

    const cached = await dbGet(tmdbId, mediaType, season, episode);

    if (cached) {
      const { share_token: shareToken, files } = cached;
      const bestFile = selectBestFile(files);
      if (!bestFile)
        return NextResponse.json(
          { success: false, error: "No files found" },
          { status: 404 },
        );

      const playerData = await fetchWithTimeout(
        `${FEBBOX_PLAYER_WORKER}/?fid=${bestFile.data_id}&share_key=${shareToken}`,
        {},
        8000,
      ).then((r) => r.json());

      return buildResponse(playerData);
    }

    const qs = new URLSearchParams({
      secret: WORKER_SECRET,
      title,
      year,
      mediaType,
      ...(season && { season }),
      ...(episode && { episode }),
    });

    const data = await fetchWithTimeout(`${WORKER_URL}/?${qs}`, {}, 8000).then(
      (r) => r.json(),
    );

    console.log("dataaaa", data);

    if (!data.success) return NextResponse.json(data, { status: 500 });

    const { shareToken, files } = data;
    if (!files?.length)
      return NextResponse.json(
        { success: false, error: "No files found" },
        { status: 404 },
      );

    const bestFile = selectBestFile(files);

    dbSave(tmdbId, mediaType, season, episode, year, shareToken, files).catch(
      (e: any) => console.warn("dbSave failed:", e.message),
    );

    const playerData = await fetchWithTimeout(
      `${FEBBOX_PLAYER_WORKER}/?fid=${bestFile.data_id}&share_key=${shareToken}`,
      {},
      8000,
    ).then((r) => r.json());

    return buildResponse(playerData);
  } catch (err: any) {
    console.error("API Error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
