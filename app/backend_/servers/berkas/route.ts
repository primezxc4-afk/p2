import { NextRequest, NextResponse } from "next/server";
import { validateBackendToken } from "@/lib/validate-token";
import { isValidReferer } from "@/lib/allowed-referers";
import { fetchWithTimeout } from "@/lib/fetch-timeout";
import { FIELD_MAP } from "@/lib/token";

const PROXY_WORKERS = [
  // "https://proxy.jerometecson-main.workers.dev",
  "https://berkas.test01-05a.workers.dev/",
  "https://berkas.test02-663.workers.dev/",
  "https://berkas.test03-4fb.workers.dev/",
  "https://berkas.test04-cee.workers.dev/",
];
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
async function getHealthyWorker(testUrl: string): Promise<string | null> {
  const candidates = shuffle(PROXY_WORKERS);

  for (const worker of candidates) {
    try {
      const testLink = `${worker}/?url=${testUrl}`;
      const res = await fetchWithTimeout(testLink, { method: "HEAD" }, 3000);

      if (res.ok) {
        return worker;
      }
    } catch {}
  }

  return null;
}

const STREAMDATA_URL = "https://streamdata.vaplayer.ru/api.php";

export async function GET(req: NextRequest) {
  const logRequest = (status: number, reason: string) => {
    const tmdbId = req.nextUrl.searchParams.get(FIELD_MAP.id);
    const mediaType = req.nextUrl.searchParams.get("b");
    const season = req.nextUrl.searchParams.get(FIELD_MAP.season);
    const episode = req.nextUrl.searchParams.get(FIELD_MAP.episode);
    const extra = mediaType === "tv" ? `/${season}/${episode}` : "";
    console.log(
      `[BERKAS] ${tmdbId}/${mediaType}${extra} | ${status} | ${reason}`,
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

    const qs = new URLSearchParams({
      tmdb: tmdbId,
      type: mediaType,
    });

    if (mediaType === "tv") {
      qs.set("season", season!);
      qs.set("episode", episode!);
    }

    const res = await fetchWithTimeout(
      `${STREAMDATA_URL}?${qs.toString()}`,
      {},
      8000,
    );
    const data = await res.json();

    const streamUrls: string[] = data?.data?.stream_urls ?? [];

    if (data?.status_code !== "200" || !streamUrls.length) {
      logRequest(404, "no streams found");
      return NextResponse.json(
        { success: false, error: "No streams found" },
        { status: 404 },
      );
    }

    const proxyWorker = await getHealthyWorker(streamUrls[0]);

    if (!proxyWorker) {
      logRequest(503, "all proxy workers unavailable");
      return NextResponse.json(
        { success: false, error: "No proxy workers available" },
        { status: 503 },
      );
    }

    const links = streamUrls.map((url, i) => ({
      type: "hls" as const,
      link: `${proxyWorker}/?url=${url}`,
      resolution: streamUrls.length - i,
    }));

    const subtitles = (data?.default_subs ?? []).map(
      (sub: any, index: number) => ({
        id: sub.sid ?? sub.id ?? index,
        display:
          sub.lang ?? sub.language ?? sub.display ?? sub.code ?? "Unknown",
        language: sub.code ?? "",
        file: sub.url ?? sub.file,
      }),
    );
    logRequest(200, "OK!!!!!");
    return NextResponse.json({ success: true, links, subtitles });
  } catch (err: any) {
    console.error("API Error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
