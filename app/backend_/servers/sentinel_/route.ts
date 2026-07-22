import { NextRequest, NextResponse } from "next/server";
import { validateBackendToken } from "@/lib/validate-token";
import { isValidReferer } from "@/lib/allowed-referers";
import { fetchWithTimeout } from "@/lib/fetch-timeout";
import { FIELD_MAP } from "@/lib/token";

const ONETOUCH_API = "https://api3.devcorp.me/web/vod";
const ENC_DEC_API = "https://enc-dec.app/api";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
};

async function fetchOneTouchStreams(
  tmdbId: string,
  mediaType: string,
  season: string | null,
  episode: string | null,
  title: string,
): Promise<{ links: any[]; subtitles: any[] }> {
  // -----------------------------
  // Search
  // -----------------------------
  const searchEncrypted = await fetchWithTimeout(
    `https://api3.devcorp.me/vod/search?page=1&keyword=${encodeURIComponent(
      title,
    )}`,
    {
      headers: HEADERS,
    },
    20000,
  ).then((r) => r.text());

  const searchDec = await fetchWithTimeout(
    `${ENC_DEC_API}/dec-onetouchtv`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: searchEncrypted,
      }),
    },
    15000,
  ).then((r) => r.json());

  if (searchDec.status !== 200 || !searchDec.result) {
    throw new Error(`Search decrypt failed: ${searchDec.error ?? "unknown"}`);
  }

  // console.log("========== SEARCH RESULT ==========");
  // console.dir(searchDec.result, { depth: null });
  // console.log("==================================");

  const results = Array.isArray(searchDec.result) ? searchDec.result : [];

  const normalizedTitle = title
    .replace(/\s*\(\d{4}\)/g, "")
    .trim()
    .toLowerCase();

  const wantedSeason = Number(season ?? "1");

  const cleanTitle = (value: string) =>
    value
      .replace(/\s*Season\s+\d+.*/i, "")
      .replace(/\s*\(\d{4}\)/g, "")
      .trim()
      .toLowerCase();

  const match =
    mediaType === "movie"
      ? results.find(
          (item: any) =>
            item.type === "movie" && cleanTitle(item.title) === normalizedTitle,
        )
      : results.find((item: any) => {
          if (cleanTitle(item.title) !== normalizedTitle) return false;

          const m = item.title.match(/Season\s+(\d+)/i);

          // No season in title = Season 1
          if (!m) return wantedSeason === 1;

          return Number(m[1]) === wantedSeason;
        });
  if (!match) {
    throw new Error("No matching search result");
  }
  // console.log("MATCH:", match);
  // console.log("MATCH:", match);

  let url: string;

  if (mediaType === "movie") {
    url = `${ONETOUCH_API}/${match.id}/episode/1`;
  } else {
    url = `${ONETOUCH_API}/${match.id}/episode/${episode ?? 1}`;
  }
  // console.log("STREAM URL:", url);

  const encrypted = await fetchWithTimeout(
    url,
    {
      headers: HEADERS,
    },
    20000,
  ).then((r) => r.text());

  const dec = await fetchWithTimeout(
    `${ENC_DEC_API}/dec-onetouchtv`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: encrypted,
      }),
    },
    15000,
  ).then((r) => r.json());

  if (dec.status !== 200 || !dec.result) {
    throw new Error(`dec-onetouchtv failed: ${dec.error ?? "unknown"}`);
  }

  const result = dec.result;

  // console.log("========== STREAM RESULT ==========");
  // console.dir(result, { depth: null });
  // console.log("==================================");

  const sources =
    result.sources ??
    result.streams ??
    result.stream ??
    result.data?.sources ??
    [];

  const links = sources
    .map((s: any) => ({
      type: url.toLowerCase().includes(".m3u8") ? "hls" : "mp4",
      link: `${s.file ?? s.url ?? s.src}`,
      resolution: parseInt(s.label ?? s.quality ?? "0") || 0,
    }))
    .filter((s: any) => s.link);

  const rawSubs =
    result.track ??
    result.subtitles ??
    result.captions ??
    result.tracks ??
    result.data?.subtitles ??
    [];

  const subtitles = rawSubs
    .filter((s: any) => s.kind !== "thumbnails")
    .map((s: any) => ({
      id: s.code ?? s.id,
      display: s.name ?? s.label ?? s.language ?? "Unknown",
      file: s.file ?? s.url,
    }))
    .filter((s: any) => s.file);

  return {
    links,
    subtitles,
  };
}

export async function GET(req: NextRequest) {
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

    const { links, subtitles } = await fetchOneTouchStreams(
      tmdbId,
      mediaType,
      season,
      episode,
      title,
    );

    if (!links.length)
      return NextResponse.json(
        { success: false, error: "No streams found" },
        { status: 404 },
      );

    return NextResponse.json({
      success: true,
      links,
      subtitles,
    });
  } catch (err: any) {
    console.error("API Error:", err);

    return NextResponse.json(
      {
        success: false,
        error: err.message ?? "Internal server error",
      },
      {
        status: 500,
      },
    );
  }
}
