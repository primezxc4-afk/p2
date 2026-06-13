import { fetchWithTimeout } from "@/lib/fetch-timeout";
import { NextRequest, NextResponse } from "next/server";
import { validateBackendToken } from "@/lib/validate-token";
import { isValidReferer } from "@/lib/allowed-referers";
import { createClient } from "@supabase/supabase-js";
import { FIELD_MAP } from "@/lib/token";

const supabase = createClient(
  process.env.SUPABASE_URL_MOVIEBOX!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_MOVIEBOX!,
);

function getRandomAfricanIP() {
  // Source: IANA-confirmed AFRINIC allocations only
  // 41/8, 102/8, 105/8, 197/8 + 45.96-111.x (recovered pool)
  const ranges: [number, number][] = [
    // 41/8 — Kenya, Nigeria, South Africa, Ghana, Ethiopia
    [41, 57], // Kenya (Safaricom)
    [41, 60], // Kenya (Telkom Kenya)
    [41, 72], // Nigeria (MTN)
    [41, 73], // Nigeria (Airtel)
    [41, 116], // South Africa (Vodacom)
    [41, 138], // South Africa (MTN)
    [41, 160], // Ghana (MTN Ghana)
    [41, 175], // Egypt (Telecom Egypt)
    [41, 188], // Ethiopia (Ethio Telecom)
    [41, 203], // Ethiopia
    [41, 215], // Ghana
    [41, 222], // Tanzania (TTCL)
    // 102/8 — AFRINIC (allocated Feb 2011, last ever IPv4 block)
    [102, 0], // Nigeria
    [102, 22], // South Africa
    [102, 68], // Nigeria (Airtel)
    [102, 89], // Nigeria (MTN)
    [102, 130], // Kenya
    [102, 164], // South Africa
    [102, 176], // Egypt
    [102, 212], // Morocco
    // 105/8 — AFRINIC
    [105, 16], // South Africa
    [105, 48], // Kenya
    [105, 112], // Nigeria
    [105, 160], // Egypt
    [105, 224], // Tanzania
    // 197/8 — AFRINIC
    [197, 136], // Morocco
    [197, 148], // Tunisia
    [197, 156], // Ghana
    [197, 210], // Nigeria
    [197, 232], // Kenya (Safaricom)
    [197, 248], // South Africa
    // 45.96-111 — AFRINIC recovered pool
    [45, 96],
    [45, 100],
    [45, 108],
  ];

  const base = ranges[Math.floor(Math.random() * ranges.length)];
  const rand = () => Math.floor(Math.random() * 254) + 1;
  return `${base[0]}.${base[1]}.${rand()}.${rand()}`;
}

export async function getWorkingProxy(url: string, proxies: string[]) {
  for (const proxy of proxies) {
    try {
      const testUrl = `${proxy}?url=${encodeURIComponent(url)}`;
      const res = await fetchWithTimeout(
        testUrl,
        { method: "HEAD", headers: { Range: "bytes=0-1" } },
        3000,
      );
      if (res.ok) return proxy;
    } catch (e) {}
  }
  return null;
}

export async function GET(req: NextRequest) {
  const logRequest = (status: number, reason: string) => {
    const tmdbId = req.nextUrl.searchParams.get(FIELD_MAP.id);
    const mediaType = req.nextUrl.searchParams.get("b");
    const season = req.nextUrl.searchParams.get(FIELD_MAP.season);
    const episode = req.nextUrl.searchParams.get(FIELD_MAP.episode);
    const extra = mediaType === "tv" ? ` s=${season} e=${episode}` : "";
    console.log(
      `[ICARUS] ${tmdbId}-${mediaType}${extra} | status=${status} | reason=${reason}`,
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

    // -------- MovieBox Logic --------
    const randomIP = getRandomAfricanIP();
    const host = "h5.aoneroom.com";
    const baseUrl = `https://${host}`;
    const headers = {
      "X-Client-Info": '{"timezone":"Africa/Nairobi"}',
      "Accept-Language": "en-US,en;q=0.5",
      Accept: "application/json",
      "User-Agent": "okhttp/4.12.0",
      "X-Forwarded-For": randomIP,
      "CF-Connecting-IP": randomIP,
      "X-Real-IP": randomIP,
    };

    // -------- Cache Lookup --------
    let subjectId: string;
    let detailPath: string;

    const { data: cached } = await supabase
      .from("moviebox_cache")
      .select("subject_id, detail_path")
      .eq("tmdb_id", tmdbId)
      .eq("media_type", mediaType)
      .maybeSingle();

    if (cached) {
      subjectId = cached.subject_id;
      detailPath = cached.detail_path;
    } else {
      // Search
      const searchRes = await fetchWithTimeout(
        `https://h5-api.aoneroom.com/wefeed-h5api-bff/subject/search`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Referer: "https://h5.aoneroom.com/",
            Origin: "https://h5.aoneroom.com",
          },
          body: JSON.stringify({
            keyword: title,
            page: 1,
            perPage: 24,
            subjectType: mediaType === "tv" ? 2 : 1,
          }),
        },
        8000,
      );

      const searchJson = await searchRes.json();
      const results = searchJson?.data?.data || searchJson?.data || searchJson;
      const items = results?.items || [];
      if (!items.length) {
        logRequest(404, "no search results");
        return NextResponse.json(
          { success: false, error: "No search results" },
          { status: 404 },
        );
      }

      const selectedItem =
        items.find(
          (i: any) =>
            (i?.title || "").toLowerCase().includes(title.toLowerCase()) &&
            !(i?.title || "").includes("["),
        ) ||
        items.find((i: any) =>
          (i?.title || "").toLowerCase().includes(title.toLowerCase()),
        );

      if (!selectedItem) {
        logRequest(404, "unavailable");
        return NextResponse.json(
          { success: false, error: "Unavailable" },
          { status: 404 },
        );
      }
      const rawSubjectId = selectedItem?.subjectId;
      if (!rawSubjectId) {
        logRequest(404, "subjectId not found");
        return NextResponse.json(
          { success: false, error: "SubjectId Not Found" },
          { status: 404 },
        );
      }

      subjectId = String(rawSubjectId);

      // Detail
      const detailRes = await fetchWithTimeout(
        `${baseUrl}/wefeed-h5-bff/web/subject/detail?subjectId=${encodeURIComponent(subjectId)}`,
        {
          headers: {
            ...headers,
            Referer:
              "https://fmoviesunblocked.net/spa/videoPlayPage/movies/the-housemaid-0salyuvbRw2?id=2123398053372510440&type=/movie/detail",
            Origin: "https://fmoviesunblocked.net",
          },
        },
        8000,
      );
      const detailJson = await detailRes.json();
      const info = detailJson?.data?.data || detailJson?.data || detailJson;
      detailPath = info?.subject?.detailPath || "";

      // Save to cache
      await supabase.from("moviebox_cache").upsert(
        {
          tmdb_id: tmdbId,
          media_type: mediaType,
          subject_id: subjectId,
          detail_path: detailPath,
        },
        {
          onConflict: "tmdb_id,media_type",
          ignoreDuplicates: true,
        },
      );
    }

    // -------- Download Sources (always fresh) --------
    const params = new URLSearchParams({ subjectId });
    if (mediaType === "tv") {
      if (season) params.set("se", String(season));
      if (episode) params.set("ep", String(episode));
    }

    const sourcesRes = await fetchWithTimeout(
      `${baseUrl}/wefeed-h5-bff/web/subject/download?${params.toString()}`,
      {
        headers: {
          ...headers,
          Referer: `https://fmoviesunblocked.net/spa/videoPlayPage/movies/${detailPath}?id=${subjectId}&type=/movie/detail`,
          Origin: "https://fmoviesunblocked.net",
        },
      },
      8000,
    );

    // console.log("detailPath", detailPath);
    // console.log("subjectId", subjectId);

    const sourcesJson = await sourcesRes.json();
    const sources = sourcesJson?.data?.data || sourcesJson?.data || sourcesJson;
    const downloads = sources?.downloads || [];
    if (!downloads.length) {
      logRequest(404, "no download sources");
      return NextResponse.json(
        { success: false, error: "No download sources" },
        { status: 404 },
      );
    }
    const sortedDownloads = downloads
      .filter((d: any) => d?.url && typeof d.url === "string")
      .sort((a: any, b: any) => (b.resolution || 0) - (a.resolution || 0));

    if (!sortedDownloads.length) {
      logRequest(404, "no valid download URLs");
      return NextResponse.json(
        { success: false, error: "No valid download URLs" },
        { status: 404 },
      );
    }

    const proxies = [
      "https://proxy.test4-eb0.workers.dev/",
      "https://proxy.test3-ed1.workers.dev/",
      "https://proxy.test2-425.workers.dev/",
      "https://proxy.test1-845.workers.dev/",
      "https://proxy.zxcprime4.workers.dev/",
      "https://proxy.zxcprime3.workers.dev/",
      "https://proxy.zxcprime2.workers.dev/",
      "https://proxy.zxcprime1.workers.dev/",
      "https://proxy.zxcprime.workers.dev/",
      "https://proxy.angela-estes-o08.workers.dev/",
      "https://orange-poetry-e481.jindaedalus2.workers.dev/",
      "https://proxy.primezxc9.workers.dev/",
      "https://proxy.primezxc84.workers.dev/",
      "https://proxy.zxcprime368.workers.dev/",
      "https://proxy.orbitprime27.workers.dev/",
      "https://proxy.silverlantern64.workers.dev/",
      "https://proxy.zxcprime380.workers.dev/",
      "https://mute-shadow-e0c7.zxcprime370.workers.dev/",
      "https://orange-tooth-0e36.zxcprime369.workers.dev/",
      "https://sweet-violet-4416.jerometecson99.workers.dev/",
      "https://silent-glitter-744f.zxcprime365.workers.dev/",
      "https://nameless-feather-4fca.zxcprime364.workers.dev/",
      "https://sweet-dust-bdb3.vetenabejar.workers.dev/",
      "https://blue-hat-477a.jerometecson333.workers.dev/",
      "https://late-snowflake-5076.zxcprime362.workers.dev/",
      "https://empty-pond-805b.zxcprime363.workers.dev/",
      "https://orange-paper-a80d.j61202287.workers.dev/",
      "https://weathered-frost-60b0.zxcprime361.workers.dev/",
      "https://long-frog-ec4e.coupdegrace21799.workers.dev/",
      "https://damp-bird-f3a9.jerometecsonn.workers.dev/",
      "https://damp-bonus-5625.mosangfour.workers.dev/",
      "https://still-butterfly-9b3e.zxcprime360.workers.dev/",

      //current  = 28 goal =35 need = 7
    ];

    const shuffledProxies = [...proxies].sort(() => Math.random() - 0.5);
    const workingProxy = await getWorkingProxy(
      sortedDownloads[0].url,
      shuffledProxies,
    );
    if (!workingProxy) {
      logRequest(502, "no working proxy");
      return NextResponse.json(
        { success: false, error: "No working proxy available" },
        { status: 502 },
      );
    }

    const links = sortedDownloads.map((d: any) => ({
      resolution: d.resolution,
      format: d.format,
      size: d.size,
      type: d.url.includes(".m3u8") ? "hls" : "mp4",
      link: `${workingProxy}?url=${encodeURIComponent(d.url)}`,
    }));

    const subtitles = (sources?.captions || []).map((c: any) => ({
      id: c.lan,
      display: c.lanName,
      file: c.url,
    }));
    logRequest(200, "ok");
    return NextResponse.json({
      success: true,
      links,
      subtitles,
      meow: !!cached,
    });
  } catch (err: any) {
    logRequest(500, `exception: ${err?.message}`);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
