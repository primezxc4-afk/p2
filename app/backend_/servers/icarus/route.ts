// import { fetchWithTimeout } from "@/lib/fetch-timeout";
// import { NextRequest, NextResponse } from "next/server";
// import { validateBackendToken } from "@/lib/validate-token";
// import { isValidReferer } from "@/lib/allowed-referers";
// import { createClient } from "@supabase/supabase-js";
// import { FIELD_MAP } from "@/lib/token";

// const supabase = createClient(
//   process.env.SUPABASE_URL_MOVIEBOX!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY_MOVIEBOX!,
// );

// function getRandomAfricanIP() {
//   const ranges: [number, number][] = [
//     [41, 57],
//     [41, 60],
//     [41, 72],
//     [41, 73],
//     [41, 116],
//     [41, 138],
//     [41, 160],
//     [41, 175],
//     [41, 188],
//     [41, 203],
//     [41, 215],
//     [41, 222],
//     [102, 0],
//     [102, 22],
//     [102, 68],
//     [102, 89],
//     [102, 130],
//     [102, 164],
//     [102, 176],
//     [102, 212],
//     [105, 16],
//     [105, 48],
//     [105, 112],
//     [105, 160],
//     [105, 224],
//     [197, 136],
//     [197, 148],
//     [197, 156],
//     [197, 210],
//     [197, 232],
//     [197, 248],
//     [45, 96],
//     [45, 100],
//     [45, 108],
//   ];
//   const base = ranges[Math.floor(Math.random() * ranges.length)];
//   const rand = () => Math.floor(Math.random() * 254) + 1;
//   return `${base[0]}.${base[1]}.${rand()}.${rand()}`;
// }

// export async function getWorkingProxy(url: string, proxies: string[]) {
//   for (const proxy of proxies) {
//     try {
//       const testUrl = `${proxy}?url=${encodeURIComponent(url)}`;
//       const res = await fetchWithTimeout(
//         testUrl,
//         { method: "HEAD", headers: { Range: "bytes=0-1" } },
//         3000,
//       );
//       if (res.ok) return proxy;
//     } catch (e) {}
//   }
//   return null;
// }

// export async function GET(req: NextRequest) {
//   const logRequest = (status: number, reason: string) => {
//     const tmdbId = req.nextUrl.searchParams.get(FIELD_MAP.id);
//     const mediaType = req.nextUrl.searchParams.get("b");
//     const season = req.nextUrl.searchParams.get(FIELD_MAP.season);
//     const episode = req.nextUrl.searchParams.get(FIELD_MAP.episode);
//     const extra = mediaType === "tv" ? `/${season}/${episode}` : "";
//     console.log(
//       `[ICARUS] ${tmdbId}/${mediaType}${extra} | ${status} | ${reason}`,
//     );
//   };

//   try {
//     const tmdbId = req.nextUrl.searchParams.get(FIELD_MAP.id);
//     const mediaType = req.nextUrl.searchParams.get("b");
//     const season = req.nextUrl.searchParams.get(FIELD_MAP.season);
//     const episode = req.nextUrl.searchParams.get(FIELD_MAP.episode);
//     const title = req.nextUrl.searchParams.get(FIELD_MAP.title);
//     const ts = Number(req.nextUrl.searchParams.get(FIELD_MAP.ts));
//     const token = req.nextUrl.searchParams.get(FIELD_MAP.token)!;
//     const f_token = req.nextUrl.searchParams.get(FIELD_MAP.fToken)!;
//     const dubLang = req.nextUrl.searchParams.get("dub"); // e.g. "hi", "es", "fr"
//     const date = req.nextUrl.searchParams.get("date");
//     if (!tmdbId || !mediaType || !title || !date || !ts || !token) {
//       logRequest(404, "missing params");
//       return NextResponse.json(
//         { success: false, error: "need token" },
//         { status: 404 },
//       );
//     }

//     if (Date.now() - ts > 8000) {
//       logRequest(403, "token expired");
//       return NextResponse.json(
//         { success: false, error: "Invalid token" },
//         { status: 403 },
//       );
//     }

//     if (!validateBackendToken(tmdbId, f_token, ts, token)) {
//       logRequest(403, "invalid token");
//       return NextResponse.json(
//         { success: false, error: "Invalid token" },
//         { status: 403 },
//       );
//     }

//     const referer = req.headers.get("referer") || "";
//     if (!isValidReferer(referer)) {
//       logRequest(403, "invalid referrer");
//       return NextResponse.json(
//         { success: false, error: "Forbidden" },
//         { status: 403 },
//       );
//     }

//     // -------- MovieBox Logic --------
//     const randomIP = getRandomAfricanIP();
//     const host = "h5.aoneroom.com";
//     const baseUrl = `https://${host}`;
//     const headers = {
//       "X-Client-Info": '{"timezone":"Africa/Nairobi"}',
//       "Accept-Language": "en-US,en;q=0.5",
//       Accept: "application/json",
//       "User-Agent": "okhttp/4.12.0",
//       "X-Forwarded-For": randomIP,
//       "CF-Connecting-IP": randomIP,
//       "X-Real-IP": randomIP,
//     };

//     // -------- Cache Lookup --------
//     let dubs: any[];

//     const { data: cached } = await supabase
//       .from("moviebox_cache")
//       .select("dubs")
//       .eq("tmdb_id", tmdbId)
//       .eq("media_type", mediaType)
//       .maybeSingle();

//     if (cached) {
//       dubs = cached.dubs ?? [];
//     } else {
//       // Search
//       const searchRes = await fetchWithTimeout(
//         `https://h5-api.aoneroom.com/wefeed-h5api-bff/subject/search`,
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             Accept: "application/json",
//             Referer: "https://h5.aoneroom.com/",
//             Origin: "https://h5.aoneroom.com",
//           },
//           body: JSON.stringify({
//             keyword: `${title}`,
//             page: 1,
//             perPage: 24,
//             subjectType: mediaType === "tv" ? 2 : 1,
//           }),
//         },
//         8000,
//       );

//       const searchJson = await searchRes.json();
//       const results = searchJson?.data?.data || searchJson?.data || searchJson;
//       const items = results?.items || [];
//       // console.log(title, year);
//       // console.log("zzz", items);
//       if (!items.length) {
//         logRequest(404, "no search results");
//         return NextResponse.json(
//           { success: false, error: "No search results" },
//           { status: 404 },
//         );
//       }

//       // console.log(title, date);
//       // console.log(items);
//       const normalizedTitle = title?.toLowerCase().trim().replace(/-/g, " ");
//       const LANG_TAGS =
//         /\[(tagalog|hindi|dubbed|multi|spanish|french|arabic|korean|japanese|tamil|telugu)\]/i;

//       const queryWords = normalizedTitle!.split(/\s+/).filter(Boolean);
//       const dateObj = date ? new Date(date) : null;

//       const selectedItem = items.find((item: any) => {
//         const itemTitle = item.title?.toLowerCase().replace(/-/g, " ") || "";
//         // const itemWords = itemTitle.split(/\s+/).filter(Boolean);
//         const itemReleaseDate = item.releaseDate;
//         if (LANG_TAGS.test(itemTitle)) return false;

//         if (!dateObj || !itemReleaseDate) return false;
//         const itemDate = new Date(itemReleaseDate);
//         const diff =
//           itemDate.getFullYear() * 12 +
//           itemDate.getMonth() -
//           (dateObj.getFullYear() * 12 + dateObj.getMonth());
//         if (Math.abs(diff) > 1) return false;

//         const itemTitleClean = itemTitle
//           .replace(/\bs\d+(-s\d+)?\b/gi, "")
//           .trim();
//         const itemWordsClean = itemTitleClean.split(/\s+/).filter(Boolean);
//         if (
//           queryWords.length <= 2 &&
//           itemWordsClean.length !== queryWords.length
//         )
//           return false;
//         return queryWords.every((word) => itemTitle.includes(word));
//       });

//       if (!selectedItem) {
//         logRequest(404, "unavailable");
//         return NextResponse.json(
//           { success: false, error: "Unavailable" },
//           { status: 404 },
//         );
//       }

//       const rawSubjectId = selectedItem?.subjectId;
//       if (!rawSubjectId) {
//         logRequest(404, "subjectId not found");
//         return NextResponse.json(
//           { success: false, error: "SubjectId Not Found" },
//           { status: 404 },
//         );
//       }

//       // Detail — use the selected item's detailPath
//       const detailRes = await fetchWithTimeout(
//         `https://h5-api.aoneroom.com/wefeed-h5api-bff/detail?detailPath=${selectedItem.detailPath}`,

//         // https://h5-api.aoneroom.com/wefeed-h5api-bff/detail?detailPath=teach-you-a-lesson-tagalog-yD5Dt6HRpJ7
//         {
//           headers: {
//             ...headers,
//             Referer: `https://fmoviesunblocked.net/spa/videoPlayPage/movies/${selectedItem.detailPath}?id=${rawSubjectId}&type=/movie/detail`,
//             Origin: "https://fmoviesunblocked.net",
//           },
//         },
//         8000,
//       );
//       const detailJson = await detailRes.json();
//       const info = detailJson?.data?.data || detailJson?.data || detailJson;

//       dubs = info?.subject?.dubs || [];

//       if (dubs.length === 0) {
//         dubs = [
//           {
//             subjectId: rawSubjectId,
//             detailPath: selectedItem.detailPath,
//             original: true,
//             lanCode: "orig",
//             lanName: "Original Audio",
//             type: 0,
//             constructed: true,
//           },
//         ];
//       }

//       // console.log(info);
//       // Save to cache
//       if (dubs.length > 0) {
//         await supabase.from("moviebox_cache").upsert(
//           {
//             tmdb_id: tmdbId,
//             media_type: mediaType,
//             dubs,
//             release_date: date,
//             title,
//           },
//           { onConflict: "tmdb_id,media_type", ignoreDuplicates: true },
//         );
//       }
//     }

//     // -------- Resolve active subjectId/detailPath from dubs --------
//     const original =
//       dubs.find((d: any) => d.original === true) ??
//       dubs.find((d: any) => d.lanCode === "en") ??
//       dubs[0];

//     // console.log(original);
//     if (!original) {
//       logRequest(404, "no original dub entry");
//       return NextResponse.json(
//         { success: false, error: "No original entry in dubs" },
//         { status: 404 },
//       );
//     }

//     let subjectId: string = original.subjectId;
//     let detailPath: string = original.detailPath;

//     if (dubLang) {
//       const dubEntry = dubs.find(
//         (d: any) => d.type === 0 && d.lanCode === dubLang,
//       );
//       if (dubEntry) {
//         subjectId = dubEntry.subjectId;
//         detailPath = dubEntry.detailPath;
//       }
//     }

//     // -------- Download Sources (always fresh) --------
//     const params = new URLSearchParams({ subjectId });
//     if (mediaType === "tv") {
//       if (season) params.set("se", String(season));
//       if (episode) params.set("ep", String(episode));
//     }

//     const sourcesRes = await fetchWithTimeout(
//       `${baseUrl}/wefeed-h5-bff/web/subject/download?${params.toString()}`,
//       {
//         headers: {
//           ...headers,
//           Referer: `https://fmoviesunblocked.net/spa/videoPlayPage/movies/${detailPath}?id=${subjectId}&type=/movie/detail`,
//           Origin: "https://fmoviesunblocked.net",
//         },
//       },
//       8000,
//     );

//     const sourcesJson = await sourcesRes.json();
//     console.log(sourcesJson);
//     const sources = sourcesJson?.data?.data || sourcesJson?.data || sourcesJson;
//     // console.log("asa", sources);
//     const downloads = sources?.downloads || [];
//     if (!downloads.length) {
//       logRequest(404, "no download sources");
//       return NextResponse.json(
//         { success: false, error: "No download sources" },
//         { status: 404 },
//       );
//     }

//     const sortedDownloads = downloads
//       .filter((d: any) => d?.url && typeof d.url === "string")
//       .sort((a: any, b: any) => (b.resolution || 0) - (a.resolution || 0));

//     if (!sortedDownloads.length) {
//       logRequest(404, "no valid download URLs");
//       return NextResponse.json(
//         { success: false, error: "No valid download URLs" },
//         { status: 404 },
//       );
//     }

//     const proxies = [
//       "https://proxy.test4-eb0.workers.dev/",
//       "https://proxy.test3-ed1.workers.dev/",
//       "https://proxy.test2-425.workers.dev/",
//       "https://proxy.test1-845.workers.dev/",
//       "https://proxy.zxcprime4.workers.dev/",
//       "https://proxy.zxcprime3.workers.dev/",
//       "https://proxy.zxcprime2.workers.dev/",
//       "https://proxy.zxcprime1.workers.dev/",
//       "https://proxy.zxcprime.workers.dev/",
//       "https://proxy.angela-estes-o08.workers.dev/",
//       "https://orange-poetry-e481.jindaedalus2.workers.dev/",
//       "https://proxy.primezxc9.workers.dev/",
//       "https://proxy.primezxc84.workers.dev/",
//       "https://proxy.zxcprime368.workers.dev/",
//       "https://proxy.orbitprime27.workers.dev/",
//       "https://proxy.silverlantern64.workers.dev/",
//       "https://proxy.zxcprime380.workers.dev/",
//       "https://mute-shadow-e0c7.zxcprime370.workers.dev/",
//       "https://orange-tooth-0e36.zxcprime369.workers.dev/",
//       "https://sweet-violet-4416.jerometecson99.workers.dev/",
//       "https://silent-glitter-744f.zxcprime365.workers.dev/",
//       "https://nameless-feather-4fca.zxcprime364.workers.dev/",
//       "https://sweet-dust-bdb3.vetenabejar.workers.dev/",
//       "https://blue-hat-477a.jerometecson333.workers.dev/",
//       "https://late-snowflake-5076.zxcprime362.workers.dev/",
//       "https://empty-pond-805b.zxcprime363.workers.dev/",
//       "https://orange-paper-a80d.j61202287.workers.dev/",
//       "https://weathered-frost-60b0.zxcprime361.workers.dev/",
//       "https://long-frog-ec4e.coupdegrace21799.workers.dev/",
//       "https://damp-bird-f3a9.jerometecsonn.workers.dev/",
//       "https://damp-bonus-5625.mosangfour.workers.dev/",
//       "https://still-butterfly-9b3e.zxcprime360.workers.dev/",
//     ];

//     const shuffledProxies = [...proxies].sort(() => Math.random() - 0.5);
//     const workingProxy = await getWorkingProxy(
//       sortedDownloads[0].url,
//       shuffledProxies,
//     );
//     if (!workingProxy) {
//       logRequest(502, "no working proxy");
//       return NextResponse.json(
//         { success: false, error: "No working proxy available" },
//         { status: 502 },
//       );
//     }

//     const links = sortedDownloads.map((d: any) => ({
//       resolution: d.resolution,
//       format: d.format,
//       size: d.size,
//       type: d.url.includes(".m3u8") ? "hls" : "mp4",
//       link: `${workingProxy}?url=${encodeURIComponent(d.url)}`,
//     }));

//     const subtitles = (sources?.captions || []).map((c: any) => ({
//       id: c.lan,
//       display: c.lanName,
//       file: c.url,
//     }));

//     const activeDub =
//       (dubLang
//         ? dubs.find((d: any) => d.type === 0 && d.lanCode === dubLang)
//         : null) ??
//       dubs.find((d: any) => d.original === true) ??
//       dubs[0];
//     logRequest(200, "OK!!!!!");
//     return NextResponse.json({
//       success: true,
//       links,
//       subtitles,
//       dubs: dubs
//         .filter((d: any) => d.type === 0)
//         .map((d: any) => ({
//           lang: d.lanCode,
//           name: d.lanName.replace(/\b(dub|audio)\b/gi, "").trim(),
//           original: d.original,
//         })),
//       meow: !!cached,
//       active: {
//         langCode: activeDub?.lanCode ?? "",
//         langName:
//           activeDub?.lanName?.replace(/\b(dub|audio)\b/gi, "").trim() ?? "",
//       },
//     });
//   } catch (err: any) {
//     logRequest(500, `exception: ${err?.message}`);
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
  process.env.SUPABASE_URL_MOVIEBOX!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_MOVIEBOX!,
);

function getRandomAfricanIP() {
  const ranges: [number, number][] = [
    [41, 57],
    [41, 60],
    [41, 72],
    [41, 73],
    [41, 116],
    [41, 138],
    [41, 160],
    [41, 175],
    [41, 188],
    [41, 203],
    [41, 215],
    [41, 222],
    [102, 0],
    [102, 22],
    [102, 68],
    [102, 89],
    [102, 130],
    [102, 164],
    [102, 176],
    [102, 212],
    [105, 16],
    [105, 48],
    [105, 112],
    [105, 160],
    [105, 224],
    [197, 136],
    [197, 148],
    [197, 156],
    [197, 210],
    [197, 232],
    [197, 248],
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
      if (res.ok || res.status === 206) {
        // console.log(`[PROXY] ✓ ${proxy} | ${res.status}`);
        return proxy;
      }
      // console.log(`[PROXY] ✗ ${proxy} | ${res.status}`);
    } catch (e: any) {
      // console.log(`[PROXY] ✗ ${proxy} | ${e?.message}`);
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const logRequest = (status: number, reason: string) => {
    const tmdbId = req.nextUrl.searchParams.get(FIELD_MAP.id);
    const mediaType = req.nextUrl.searchParams.get("b");
    const season = req.nextUrl.searchParams.get(FIELD_MAP.season);
    const episode = req.nextUrl.searchParams.get(FIELD_MAP.episode);
    const extra = mediaType === "tv" ? `/${season}/${episode}` : "";
    console.log(
      `[ICARUS] ${tmdbId}/${mediaType}${extra} | ${status} | ${reason}`,
    );
  };

  try {
    const tmdbId = req.nextUrl.searchParams.get(FIELD_MAP.id);
    const mediaType = req.nextUrl.searchParams.get("b");
    const season = req.nextUrl.searchParams.get(FIELD_MAP.season);
    const episode = req.nextUrl.searchParams.get(FIELD_MAP.episode);
    const title = req.nextUrl.searchParams.get(FIELD_MAP.title);
    const ts = Number(req.nextUrl.searchParams.get(FIELD_MAP.ts));
    const token = req.nextUrl.searchParams.get(FIELD_MAP.token)!;
    const f_token = req.nextUrl.searchParams.get(FIELD_MAP.fToken)!;
    const dubCode = req.nextUrl.searchParams.get("dubCode");
    const dubType = req.nextUrl.searchParams.get("dubType");
    const date = req.nextUrl.searchParams.get("date");

    if (!tmdbId || !mediaType || !title || !date || !ts || !token) {
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
    const baseUrl = `https://h5-api.aoneroom.com/wefeed-h5api-bff`;
    const headers = {
      "X-Client-Info": '{"timezone":"Africa/Nairobi"}',
      "Accept-Language": "en-US,en;q=0.5",
      Accept: "application/json",
      "User-Agent": "okhttp/4.12.0",
      "X-Forwarded-For": randomIP,
      "CF-Connecting-IP": randomIP,
      "X-Real-IP": randomIP,
    };

    // -------- Cache Lookup (dubs) --------
    let dubs: any[];

    const { data: cached } = await supabase
      .from("moviebox_cache")
      .select("dubs")
      .eq("tmdb_id", tmdbId)
      .eq("media_type", mediaType)
      .maybeSingle();

    if (cached) {
      dubs = cached.dubs ?? [];
    } else {
      const searchRes = await fetchWithTimeout(
        `${baseUrl}/subject/search`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Referer: "https://h5.aoneroom.com/",
            Origin: "https://h5.aoneroom.com",
          },
          body: JSON.stringify({
            keyword: `${title}`,
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

      const normalizedTitle = title?.toLowerCase().trim().replace(/-/g, " ");
      const LANG_TAGS =
        /\[(tagalog|hindi|dubbed|multi|spanish|french|arabic|korean|japanese|tamil|telugu)\]/i;
      const queryWords = normalizedTitle!.split(/\s+/).filter(Boolean);
      const dateObj = date ? new Date(date) : null;

      // const selectedItem = items.find((item: any) => {
      //   const itemTitle = item.title?.toLowerCase().replace(/-/g, " ") || "";
      //   const itemReleaseDate = item.releaseDate;
      //   if (LANG_TAGS.test(itemTitle)) return false;
      //   if (!dateObj || !itemReleaseDate) return false;
      //   const itemDate = new Date(itemReleaseDate);
      //   const diff =
      //     itemDate.getFullYear() * 12 +
      //     itemDate.getMonth() -
      //     (dateObj.getFullYear() * 12 + dateObj.getMonth());
      //   if (Math.abs(diff) > 1) return false;
      //   const itemTitleClean = itemTitle
      //     .replace(/\bs\d+(-s\d+)?\b/gi, "")
      //     .trim();
      //   const itemWordsClean = itemTitleClean.split(/\s+/).filter(Boolean);
      //   if (
      //     queryWords.length <= 2 &&
      //     itemWordsClean.length !== queryWords.length
      //   )
      //     return false;
      //   return queryWords.every((word) => itemTitle.includes(word));
      // });

      let selectedItem = items.find((item: any) => {
        const itemTitle = item.title?.toLowerCase().replace(/-/g, " ") || "";
        const itemReleaseDate = item.releaseDate;
        if (LANG_TAGS.test(itemTitle)) return false; // skip lang-tagged
        if (!dateObj || !itemReleaseDate) return false;
        const itemDate = new Date(itemReleaseDate);
        const diff =
          itemDate.getFullYear() * 12 +
          itemDate.getMonth() -
          (dateObj.getFullYear() * 12 + dateObj.getMonth());
        if (Math.abs(diff) > 1) return false;
        const itemTitleClean = itemTitle
          .replace(/\bs\d+(-s\d+)?\b/gi, "")
          .trim();
        const itemWordsClean = itemTitleClean.split(/\s+/).filter(Boolean);
        if (
          queryWords.length <= 2 &&
          itemWordsClean.length !== queryWords.length
        )
          return false;
        return queryWords.every((word) => itemTitle.includes(word));
      });

      // Fallback: allow lang-tagged if nothing else matched
      if (!selectedItem) {
        selectedItem = items.find((item: any) => {
          const itemTitle = item.title?.toLowerCase().replace(/-/g, " ") || "";
          const itemReleaseDate = item.releaseDate;
          if (!dateObj || !itemReleaseDate) return false;
          const itemDate = new Date(itemReleaseDate);
          const diff =
            itemDate.getFullYear() * 12 +
            itemDate.getMonth() -
            (dateObj.getFullYear() * 12 + dateObj.getMonth());
          if (Math.abs(diff) > 1) return false;
          const itemTitleClean = itemTitle
            .replace(/\bs\d+(-s\d+)?\b/gi, "")
            .trim();
          const itemWordsClean = itemTitleClean.split(/\s+/).filter(Boolean);
          if (
            queryWords.length <= 2 &&
            itemWordsClean.length !== queryWords.length
          )
            return false;
          return queryWords.every((word) => itemTitle.includes(word));
        });
      }
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

      const detailRes = await fetchWithTimeout(
        `${baseUrl}/detail?detailPath=${selectedItem.detailPath}`,
        {
          headers: {
            ...headers,
            Referer: `https://fmoviesunblocked.net/spa/videoPlayPage/movies/${selectedItem.detailPath}?id=${rawSubjectId}&type=/movie/detail`,
            Origin: "https://fmoviesunblocked.net",
          },
        },
        8000,
      );
      const detailJson = await detailRes.json();
      const info = detailJson?.data?.data || detailJson?.data || detailJson;

      dubs = info?.subject?.dubs || [];

      if (dubs.length === 0) {
        dubs = [
          {
            subjectId: rawSubjectId,
            detailPath: selectedItem.detailPath,
            original: true,
            lanCode: "orig",
            lanName: "Original Audio",
            type: 0,
            constructed: true,
          },
        ];
      }

      if (dubs.length > 0) {
        await supabase.from("moviebox_cache").upsert(
          {
            tmdb_id: tmdbId,
            media_type: mediaType,
            dubs,
            release_date: date,
            title,
          },
          { onConflict: "tmdb_id,media_type", ignoreDuplicates: true },
        );
      }
    }

    // -------- Resolve active subjectId/detailPath from dubs --------
    const original =
      dubs.find((d: any) => d.original === true) ??
      dubs.find((d: any) => d.lanCode === "en") ??
      dubs[0];

    if (!original) {
      logRequest(404, "no original dub entry");
      return NextResponse.json(
        { success: false, error: "No original entry in dubs" },
        { status: 404 },
      );
    }

    let subjectId: string = original.subjectId;
    let detailPath: string = original.detailPath;
    let activeDubType: number = original.type ?? 0;
    let activeDubLang: string = original.lanCode ?? "orig";

    if (dubCode) {
      const dubEntry = dubs.find(
        (d: any) => d.lanCode === dubCode && d.type === Number(dubType ?? "0"),
      );
      if (dubEntry) {
        subjectId = dubEntry.subjectId;
        detailPath = dubEntry.detailPath;
        activeDubType = dubEntry.type ?? 0;
        activeDubLang = dubEntry.lanCode;
      }
    }

    // -------- Cache Lookup (downloads) --------
    let sortedDownloads: any[];
    let subtitles: any[];

    const dlQuery = supabase
      .from("moviebox_downloads_cache")
      .select("downloads, subtitles")
      .eq("tmdb_id", tmdbId)
      .eq("media_type", mediaType)
      .eq("dub", activeDubLang)
      .eq("type", activeDubType)
      .gt("expires_at", new Date().toISOString());

    if (season) dlQuery.eq("season", season);
    else dlQuery.eq("season", "");

    if (episode) dlQuery.eq("episode", episode);
    else dlQuery.eq("episode", "");

    const { data: cachedDownloads } = await dlQuery.maybeSingle();
    if (cachedDownloads) {
      console.log(`[ICARUS] downloads cache hit`);
      sortedDownloads = cachedDownloads.downloads ?? [];
      subtitles = cachedDownloads.subtitles ?? [];
    } else {
      const params = new URLSearchParams({ subjectId, detailPath });
      if (mediaType === "tv") {
        if (season) params.set("se", String(season));
        if (episode) params.set("ep", String(episode));
      }

      const sourcesRes = await fetchWithTimeout(
        `${baseUrl}/subject/download?${params.toString()}`,
        {
          headers: {
            ...headers,
            Referer: `https://fmoviesunblocked.net/spa/videoPlayPage/movies/${detailPath}?id=${subjectId}&type=/movie/detail`,
            Origin: "https://fmoviesunblocked.net",
          },
        },
        8000,
      );

      const sourcesJson = await sourcesRes.json();
      const sources =
        sourcesJson?.data?.data || sourcesJson?.data || sourcesJson;
      const downloads = sources?.downloads || [];

      if (!downloads.length) {
        logRequest(404, "no download sources");
        return NextResponse.json(
          { success: false, error: "No download sources" },
          { status: 404 },
        );
      }

      sortedDownloads = downloads
        .filter((d: any) => d?.url && typeof d.url === "string")
        .sort((a: any, b: any) => (b.resolution || 0) - (a.resolution || 0));

      if (!sortedDownloads.length) {
        logRequest(404, "no valid download URLs");
        return NextResponse.json(
          { success: false, error: "No valid download URLs" },
          { status: 404 },
        );
      }

      subtitles = (sources?.captions || []).map((c: any) => ({
        id: c.lan,
        display: c.lanName,
        file: c.url,
      }));
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

    if (!cachedDownloads) {
      await supabase.from("moviebox_downloads_cache").upsert(
        {
          tmdb_id: tmdbId,
          media_type: mediaType,
          season: season ?? "",
          episode: episode ?? "",
          dub: activeDubLang,
          type: activeDubType,
          downloads: sortedDownloads,
          subtitles,
          expires_at: new Date(Date.now() + 1000 * 60 * 60 * 45).toISOString(),
        },
        {
          onConflict: "tmdb_id,media_type,season,episode,dub,type",
          // ignoreDuplicates: true,
        },
      );
    }

    const links = sortedDownloads.map((d: any) => ({
      resolution: d.resolution,
      format: d.format,
      size: d.size,
      type: d.url.includes(".m3u8") ? "hls" : "mp4",
      link: `${workingProxy}?url=${encodeURIComponent(d.url)}`,
    }));

    const activeDub =
      (dubCode ? dubs.find((d: any) => d.lanCode === dubCode) : null) ??
      dubs.find((d: any) => d.original === true) ??
      dubs[0];

    logRequest(200, "OK!!!!!");
    return NextResponse.json({
      success: true,
      links,
      subtitles,
      dubs: dubs.map((d: any) => ({
        lang: d.lanCode,
        type: d.type,
        name:
          d.type === 1
            ? d.lanName
                .replace(/\b(dub|audio)\b/gi, "")
                .trim()
                .replace(/sub$/i, "")
                .trim() + " (Subtitle)"
            : d.lanName.replace(/\b(dub|audio|sub)\b/gi, "").trim(),
        original: d.original,
      })),
      meow: !!cached,
      meowmeow: !!cachedDownloads,
      active: {
        langCode: activeDub?.lanCode ?? "",
        langName:
          activeDub?.lanName?.replace(/\b(dub|audio)\b/gi, "").trim() ?? "",
      },
    });
  } catch (err: any) {
    logRequest(500, `exception: ${err?.message}`);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
