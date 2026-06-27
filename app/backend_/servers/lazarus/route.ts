// import { fetchWithTimeout } from "@/lib/fetch-timeout";
// import { NextRequest, NextResponse } from "next/server";
// import { validateBackendToken } from "@/lib/validate-token";
// import { isValidReferer } from "@/lib/allowed-referers";

// const VIXSRC_WORKER = "https://test.jerometecson-main.workers.dev";

// export async function GET(req: NextRequest) {
//   try {
//     const tmdbId = req.nextUrl.searchParams.get("a");
//     const mediaType = req.nextUrl.searchParams.get("b");
//     const season = req.nextUrl.searchParams.get("c");
//     const episode = req.nextUrl.searchParams.get("d");
//     const title = req.nextUrl.searchParams.get("f");
//     const year = req.nextUrl.searchParams.get("g");
//     const ts = Number(req.nextUrl.searchParams.get("gago"));
//     const token = req.nextUrl.searchParams.get("putangnamo")!;
//     const f_token = req.nextUrl.searchParams.get("f_token")!;

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

//     // Build vixsrc worker URL
//     let workerUrl: string;
//     if (mediaType === "tv" && season && episode) {
//       workerUrl = `${VIXSRC_WORKER}/tv/${tmdbId}/${season}/${episode}`;
//     } else {
//       workerUrl = `${VIXSRC_WORKER}/movie/${tmdbId}`;
//     }

//     const m3u8Url = workerUrl; // worker returns raw M3U8 directly

//     return NextResponse.json({
//       success: true,
//       links: [
//         {
//           type: "hls",
//           link: m3u8Url,
//         },
//       ],
//       subtitles: [],
//     });
//   } catch (err) {
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

const VIXSRC_WORKERS = [
  "https://lazarus.coupdegrace21799.workers.dev",
  "https://lazarus.amenohabakiri174.workers.dev",
  "https://lazarus.jerometecsonn.workers.dev",
  "https://lazarus.jerometecson33.workers.dev",
  // add more workers here
];

export async function GET(req: NextRequest) {
  try {
    const tmdbId = req.nextUrl.searchParams.get("a");
    const mediaType = req.nextUrl.searchParams.get("b");
    const season = req.nextUrl.searchParams.get("c");
    const episode = req.nextUrl.searchParams.get("d");
    const title = req.nextUrl.searchParams.get("f");
    const year = req.nextUrl.searchParams.get("g");
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

    if (!validateBackendToken(tmdbId, f_token, ts, token)) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 403 },
      );
    }

    const referer = req.headers.get("referer") || "";
    if (!isValidReferer(referer)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    // Build the path for all workers to test
    const path =
      mediaType === "tv" && season && episode
        ? `/tv/${tmdbId}/${season}/${episode}`
        : `/movie/${tmdbId}`;

    const worker = await getWorkingProxy(path, VIXSRC_WORKERS);
    if (!worker) {
      return NextResponse.json(
        { success: false, error: "No working worker available" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      links: [{ type: "hls", link: `${worker}${path}` }],
      subtitles: [],
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function getWorkingProxy(path: string, workers: string[]) {
  for (const worker of workers) {
    try {
      const testUrl = `${worker}${path}`;
      const res = await fetchWithTimeout(
        testUrl,
        {
          method: "HEAD",
          headers: { Range: "bytes=0-1" },
        },
        3000,
      );
      if (res.ok) return worker;
    } catch (e) {}
  }
  return null;
}
