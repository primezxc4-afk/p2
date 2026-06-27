import { NextRequest, NextResponse } from "next/server";
import { validateBackendToken } from "@/lib/validate-token";
import { isValidReferer } from "@/lib/allowed-referers";
import { fetchWithTimeout } from "@/lib/fetch-timeout";
import { FIELD_MAP } from "@/lib/token";

const ENC_DEC_API = "https://enc-dec.app/api";
const SNOWHOUSE_BASE = "https://snowhouse.lordflix.club";
const LORDFLIX_SERVER = "Phoenix";
const LORDFLIX_HEADERS = {
  Accept: "*/*",
  Origin: "https://lordflix.org",
  Referer: "https://lordflix.org/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
};

async function fetchLordflixStreams(
  title: string,
  year: string,
  tmdbId: string,
  imdbId: string | null,
  mediaType: string,
  season: string | null,
  episode: string | null,
): Promise<{ links: any[]; subtitles: any[] }> {
  const params = new URLSearchParams({
    title,
    type: mediaType === "movie" ? "movie" : "series",
    year,
    tmdb: tmdbId,
    server: LORDFLIX_SERVER,
    ...(imdbId && { imdb: imdbId }),
    ...(season && { season }),
    ...(episode && { episode }),
  });

  const encData = await fetchWithTimeout(
    `${ENC_DEC_API}/enc-lordflix?url=${encodeURIComponent(`${SNOWHOUSE_BASE}/?${params}`)}`,
    {},
    8000,
  ).then((r) => r.json());

  if (encData.status !== 200 || !encData.result?.url)
    throw new Error(`enc-lordflix failed: ${encData.error ?? "unknown"}`);

  const { url: encUrl, sign } = encData.result;

  const encryptedText = await fetchWithTimeout(
    encUrl,
    { headers: LORDFLIX_HEADERS },
    20000,
  ).then((r) => r.text());

  const decData = await fetchWithTimeout(
    `${ENC_DEC_API}/dec-lordflix`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: encryptedText, sign }),
    },
    15000,
  ).then((r) => r.json());

  if (decData.status !== 200 || !decData.result)
    throw new Error(`dec-lordflix failed: ${decData.error ?? "unknown"}`);

  const result = decData.result;
  const sources: any[] =
    result.stream ?? result.sources ?? result.streams ?? [];

  const links = sources.map((s: any) => ({
    type: "hls" as const,
    link: s.playlist ?? s.url ?? s.file ?? s.link,
    resolution: parseInt(s.quality ?? s.label ?? "0") || 0,
  }));

  const rawSubs: any[] =
    result.captions ??
    result.subtitles ??
    result.tracks ??
    sources.flatMap((s: any) => s.captions ?? []);

  const subtitles = rawSubs
    .filter((s: any) => s.kind !== "thumbnails")
    .map((s: any) => ({
      id: s.id ?? s.sid,
      display: s.label ?? s.language,
      file: s.file ?? s.url,
    }));

  return { links, subtitles };
}

export async function GET(req: NextRequest) {
  try {
    const tmdbId = req.nextUrl.searchParams.get(FIELD_MAP.id);
    const mediaType = req.nextUrl.searchParams.get("b");
    const season = req.nextUrl.searchParams.get(FIELD_MAP.season);
    const episode = req.nextUrl.searchParams.get(FIELD_MAP.episode);
    const title = req.nextUrl.searchParams.get(FIELD_MAP.title);
    const year = req.nextUrl.searchParams.get(FIELD_MAP.year);
    const imdbId = req.nextUrl.searchParams.get("imdb");
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

    if (!isValidReferer(req.headers.get("referer") || ""))
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );

    const { links, subtitles } = await fetchLordflixStreams(
      title,
      year,
      tmdbId,
      imdbId,
      mediaType,
      season,
      episode,
    );

    if (!links.length)
      return NextResponse.json(
        { success: false, error: "No streams found" },
        { status: 404 },
      );

    return NextResponse.json({ success: true, links, subtitles });
  } catch (err: any) {
    console.error("API Error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
