// app/api/netfilm/route.ts

import { NextResponse } from "next/server";

export async function GET() {
  const url =
    "https://netfilm.world/wefeed-h5api-bff/subject/download?subjectId=4350152697279040288&se=1&ep=1";

  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",

      referer:
        "https://netfilm.world/spa/videoPlayPage/movies/your-name-EAK9NIdKlb5?id=4350152697279040288&type=/movie&lang=en",
    },

    cache: "no-store",
  });

  const body = await response.text();

  return new NextResponse(body, {
    status: response.status,
    headers: {
      "content-type":
        response.headers.get("content-type") ?? "application/json",
    },
  });
}

// // import { NextRequest, NextResponse } from "next/server";
// // import https from "https";

// // function getRandomAfricanIP() {
// //   const ranges: [number, number][] = [
// //     [41, 57],
// //     [41, 60],
// //     [41, 72],
// //     [41, 73],
// //     [102, 0],
// //     [102, 22],
// //     [105, 16],
// //     [105, 48],
// //     [197, 136],
// //     [45, 96],
// //   ];
// //   const base = ranges[Math.floor(Math.random() * ranges.length)];
// //   const rand = () => Math.floor(Math.random() * 254) + 1;
// //   return `${base[0]}.${base[1]}.${rand()}.${rand()}`;
// // }

// // function postJson(
// //   url: string,
// //   body: any,
// //   headers: Record<string, string>,
// // ): Promise<any> {
// //   return new Promise((resolve, reject) => {
// //     const data = JSON.stringify(body);
// //     const u = new URL(url);
// //     const req = https.request(
// //       {
// //         hostname: u.hostname,
// //         path: u.pathname,
// //         method: "POST",
// //         headers: { ...headers, "Content-Length": Buffer.byteLength(data) },
// //       },
// //       (res) => {
// //         let chunks = "";
// //         res.on("data", (c) => (chunks += c));
// //         res.on("end", () => {
// //           try {
// //             resolve(JSON.parse(chunks));
// //           } catch (e) {
// //             reject(e);
// //           }
// //         });
// //       },
// //     );
// //     req.on("error", reject);
// //     req.write(data);
// //     req.end();
// //   });
// // }

// // export async function GET(req: NextRequest) {
// //   const keyword = req.nextUrl.searchParams.get("keyword");
// //   const page = req.nextUrl.searchParams.get("page") ?? "1";
// //   const perPage = req.nextUrl.searchParams.get("perPage") ?? "10";

// //   if (!keyword) {
// //     return NextResponse.json(
// //       { success: false, error: "keyword is required" },
// //       { status: 400 },
// //     );
// //   }

// //   const randomIP = getRandomAfricanIP();
// //   const headers = {
// //     "Content-Type": "application/json",
// //     "X-Client-Info": '{"timezone":"Africa/Nairobi"}',
// //     "Accept-Language": "en-US,en;q=0.5",
// //     Accept: "application/json",
// //     "User-Agent": "okhttp/4.12.0",
// //     "X-Forwarded-For": randomIP,
// //     "CF-Connecting-IP": randomIP,
// //     "X-Real-IP": randomIP,
// //     Referer: "https://fmoviesunblocked.net/",
// //     Origin: "https://fmoviesunblocked.net",
// //   };

// //   try {
// //     const json = await postJson(
// //       "https://api6.aoneroom.com/wefeed-mobile-bff/subject-api/search/v2",
// //       { page: Number(page), perPage: Number(perPage), keyword },
// //       headers,
// //     );

// //     return NextResponse.json({ success: true, raw: json });
// //   } catch (err: any) {
// //     return NextResponse.json(
// //       { success: false, error: err?.message },
// //       { status: 500 },
// //     );
// //   }
// // }
// // // import { NextResponse } from "next/server";
// // // import { createClient } from "@supabase/supabase-js";

// // // const supabase = createClient(
// // //   process.env.SUPABASE_URL_MOVIEBOX!,
// // //   process.env.SUPABASE_SERVICE_ROLE_KEY_MOVIEBOX!,
// // // );
// // // const MOVIE_FN =
// // //   "https://streambox-scrapper.vercel.app/_serverFn/047e86a9630f58b72dd91c87b92545d6747ca2ef4d6f56ceef48efd8f9532b4d";

// // // const TV_FN =
// // //   "https://streambox-scrapper.vercel.app/_serverFn/d0a9a6772829aa71c223f129e8463656d6a3d2c7dbab0b16241e47edc346af55";

// // // function decodeTSS(node: any): any {
// // //   if (!node || typeof node !== "object") return node;

// // //   switch (node.t) {
// // //     case 0:
// // //     case 1:
// // //     case 2:
// // //       return node.s;

// // //     case 9:
// // //       return (node.a || []).map(decodeTSS);

// // //     case 10: {
// // //       const obj: Record<string, any> = {};
// // //       const keys = node.p?.k || [];
// // //       const values = node.p?.v || [];

// // //       for (let i = 0; i < keys.length; i++) {
// // //         obj[keys[i]] = decodeTSS(values[i]);
// // //       }

// // //       return obj;
// // //     }

// // //     case 11:
// // //       return {};

// // //     default:
// // //       return node.s ?? node;
// // //   }
// // // }

// // // export async function GET(req: Request) {
// // //   try {
// // //     const { searchParams } = new URL(req.url);

// // //     const tmdbId = Number(searchParams.get("tmdbId"));
// // //     const mediaType = searchParams.get("mediaType");

// // //     const season = Number(searchParams.get("season") || 0);
// // //     const episode = Number(searchParams.get("episode") || 0);

// // //     const endpoint = mediaType === "tv" ? TV_FN : MOVIE_FN;

// // //     if (!mediaType) {
// // //       return NextResponse.json(
// // //         {
// // //           success: false,
// // //           message: "mediatype required",
// // //         },
// // //         { status: 500 },
// // //       );
// // //     }
// // //     const payload =
// // //       mediaType === "tv"
// // //         ? {
// // //             t: {
// // //               t: 10,
// // //               i: 0,
// // //               p: {
// // //                 k: ["data"],
// // //                 v: [
// // //                   {
// // //                     t: 10,
// // //                     i: 1,
// // //                     p: {
// // //                       k: ["tmdbId", "season", "episode"],
// // //                       v: [
// // //                         { t: 0, s: tmdbId },
// // //                         { t: 0, s: season },
// // //                         { t: 0, s: episode },
// // //                       ],
// // //                     },
// // //                     o: 0,
// // //                   },
// // //                 ],
// // //               },
// // //               o: 0,
// // //             },
// // //             f: 63,
// // //             m: [],
// // //           }
// // //         : {
// // //             t: {
// // //               t: 10,
// // //               i: 0,
// // //               p: {
// // //                 k: ["data"],
// // //                 v: [
// // //                   {
// // //                     t: 10,
// // //                     i: 1,
// // //                     p: {
// // //                       k: ["tmdbId"],
// // //                       v: [{ t: 0, s: tmdbId }],
// // //                     },
// // //                     o: 0,
// // //                   },
// // //                 ],
// // //               },
// // //               o: 0,
// // //             },
// // //             f: 63,
// // //             m: [],
// // //           };

// // //     const res = await fetch(endpoint, {
// // //       method: "POST",
// // //       headers: {
// // //         Accept:
// // //           "application/x-tss-framed, application/x-ndjson, application/json",
// // //         "Content-Type": "application/json",
// // //         Origin: "https://streambox-scrapper.vercel.app",
// // //         Referer: "https://streambox-scrapper.vercel.app/",
// // //         "x-tsr-serverfn": "true",
// // //       },
// // //       body: JSON.stringify(payload),
// // //     });

// // //     const text = await res.text();
// // //     const raw = JSON.parse(text);
// // //     const decoded = decodeTSS(raw);

// // //     const data = decoded?.result?.data;
// // //     const subjects = data?.allSubjects || [];
// // //     const subject = subjects[0];

// // //     const dubs = (data?.languages || [])
// // //       .map((dub: any) => {
// // //         const dubSubject = subjects.find(
// // //           (s: any) => s.subjectId === dub.subjectId,
// // //         );
// // //         const dubDetailPath = dubSubject?.detailUrl?.split("/detail/")[1] ?? "";
// // //         if (!dubDetailPath) return null;

// // //         return {
// // //           type: dub.code === "en" ? 0 : 1,
// // //           lanCode: dub.code,
// // //           lanName: dub.label,
// // //           original: dub.code === "en",
// // //           subjectId: dub.subjectId,
// // //           detailPath: dubDetailPath,
// // //           isMain: false,
// // //         };
// // //       })
// // //       .filter(Boolean);

// // //     const result = {
// // //       tmdb_id: String(tmdbId),
// // //       media_type: mediaType,
// // //       season: mediaType === "tv" ? season : "",
// // //       episode: mediaType === "tv" ? episode : "",
// // //       title: subject?.title ?? "",
// // //       release_date: subject?.releaseDate ?? "",
// // //       dubs,
// // //     };

// // //     if (dubs.length > 0) {
// // //       await supabase.from("moviebox_cache").upsert(
// // //         {
// // //           tmdb_id: result.tmdb_id,
// // //           media_type: result.media_type,
// // //           title: result.title,
// // //           release_date: result.release_date,
// // //           dubs: result.dubs,
// // //         },
// // //         { onConflict: "tmdb_id,media_type", ignoreDuplicates: true },
// // //       );
// // //     }

// // //     return NextResponse.json(result);
// // //   } catch (error) {
// // //     return NextResponse.json(
// // //       {
// // //         success: false,
// // //         error: error instanceof Error ? error.message : "Unknown error",
// // //       },
// // //       { status: 500 },
// // //     );
// // //   }
// // // }
// import { NextRequest, NextResponse } from "next/server";
// function getRandomAfricanIP() {
//   const ranges: [number, number][] = [
//     [41, 57],
//     [41, 60],
//     [41, 72],
//     [41, 73],
//     [102, 0],
//     [102, 22],
//     [105, 16],
//     [105, 48],
//     [197, 136],
//     [45, 96],
//   ];
//   const base = ranges[Math.floor(Math.random() * ranges.length)];
//   const rand = () => Math.floor(Math.random() * 254) + 1;
//   return `${base[0]}.${base[1]}.${rand()}.${rand()}`;
// }

// function fetchWithTimeout(
//   url: string,
//   options: { headers: Record<string, string> },
//   timeoutMs: number,
// ): Promise<Response> {
//   const controller = new AbortController();
//   const timer = setTimeout(() => controller.abort(), timeoutMs);
//   return fetch(url, { ...options, signal: controller.signal }).finally(() =>
//     clearTimeout(timer),
//   );
// }

// export async function GET(req: NextRequest) {
//   const detailPath = req.nextUrl.searchParams.get("detailPath");

//   if (!detailPath) {
//     return NextResponse.json(
//       { success: false, error: "detailPath is required" },
//       { status: 400 },
//     );
//   }

//   const randomIP = getRandomAfricanIP();
//   const headers: Record<string, string> = {
//     "Content-Type": "application/json",
//     "X-Client-Info": '{"timezone":"Africa/Nairobi"}',
//     "Accept-Language": "en-US,en;q=0.5",
//     Accept: "application/json",
//     "User-Agent": "okhttp/4.12.0",
//     "X-Forwarded-For": randomIP,
//     "CF-Connecting-IP": randomIP,
//     "X-Real-IP": randomIP,
//     Referer: `https://fmoviesunblocked.net/spa/videoPlayPage/movies/${detailPath}?type=/movie/detail`,
//     Origin: "https://fmoviesunblocked.net",
//   };

//   try {
//     const detailRes = await fetchWithTimeout(
//       `https://h5-api.aoneroom.com/wefeed-h5api-bff/detail?detailPath=${detailPath}`,
//       { headers },
//       8000,
//     );

//     const detailJson = await detailRes.json();
//     const info = detailJson?.data?.data || detailJson?.data || detailJson;
//     const subject = info?.subject || {};
//     const media_type = subject.subjectType === 1 ? "movie" : "tv";

//     return NextResponse.json({
//       success: true,
//       title: subject?.title ?? null,
//       media_type,
//       releaseDate: subject?.releaseDate ?? null,
//       dubs: subject?.dubs ?? [],
//       isForbid: false,
//     });
//   } catch (err: any) {
//     if (err?.name === "AbortError") {
//       return NextResponse.json(
//         { success: false, error: "Request timed out" },
//         { status: 504 },
//       );
//     }
//     return NextResponse.json(
//       { success: false, error: err?.message },
//       { status: 500 },
//     );
//   }
// }

// // [
// //   {
// //     type: 0,
// //     lanCode: "en",
// //     lanName: "Original Audio",
// //     original: true,
// //     subjectId: "7451954164072336160",
// //     detailPath: "the-godfather-O7h3JYN1uS8",
// //   },
// //   {
// //     type: 0,
// //     lanCode: "fr",
// //     lanName: "French dub",
// //     original: false,
// //     subjectId: "1876648983540416520",
// //     detailPath: "the-godfather-epHCfKt4De2",
// //   },
// //   {
// //     type: 0,
// //     lanCode: "hi",
// //     lanName: "Hindi dub",
// //     original: false,
// //     subjectId: "2746848304473464152",
// //     detailPath: "the-godfather-2bD2yMQAUg3",
// //   },
// //   {
// //     type: 1,
// //     lanCode: "ru",
// //     lanName: "Russian sub",
// //     original: false,
// //     subjectId: "1031664100805331496",
// //     detailPath: "the-godfather-sUHI3212de1",
// //   },
// //   {
// //     type: 0,
// //     lanCode: "ru",
// //     lanName: "Russian dub",
// //     original: false,
// //     subjectId: "8923466406826592640",
// //     detailPath: "the-godfather-Cbur3dozbDa",
// //   },
// //   {
// //     type: 0,
// //     lanCode: "es",
// //     lanName: "Spanish dub",
// //     original: false,
// //     subjectId: "6276146626118014488",
// //     detailPath: "the-godfather-Gha3WTIOCt7",
// //   },
// //   {
// //     type: 0,
// //     lanCode: "ptbr",
// //     lanName: "ptbr dub",
// //     original: false,
// //     subjectId: "3121450502475631312",
// //     detailPath: "the-godfather-cyUn2y8hAI3",
// //   },
// // ];
