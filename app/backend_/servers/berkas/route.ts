import { NextRequest, NextResponse } from "next/server";
import { validateBackendToken } from "@/lib/validate-token";
import { isValidReferer } from "@/lib/allowed-referers";
import { fetchWithTimeout } from "@/lib/fetch-timeout";
import { FIELD_MAP } from "@/lib/token";
import { createClient } from "@supabase/supabase-js";
import { encryptUrl } from "@/lib/encryptor";
// create a worker and name it berkas and add a worker subdomain the final url should look like berkas.test041.workers.dev, make it fast
//ZXCTEST8
//AES_KEY
//48cea93448b6719f32471b15777eb140db961b6ba6f1fc92cb92b0fdd7da555d
const supabase = createClient(
  process.env.SUPABASE_URL_BERKAS!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_BERKAS!,
);
// /workers/subdomain
const PROXY_WORKERS = [
  "https://berkas.test047-123.workers.dev/",
  "https://berkas.test049-123.workers.dev/",
  "https://berkas.test050-123.workers.dev/",
  "https://berkas.test048-123.workers.dev/",
  "https://berkas.test045.workers.dev/",
  "https://berkas.test046-43r.workers.dev/",

  "https://berkas.test98-a64.workers.dev/",
  "https://berkas.test97-f4b.workers.dev/",
  "https://berkas.test96-27b.workers.dev/",
  "https://berkas.test95-7d8.workers.dev/",
  "https://berkas.test100-1ff.workers.dev/",
  //

  "https://berkas.test-zxcstream.workers.dev/",
  "https://berkas.test042.workers.dev/",
  "https://berkas.test041.workers.dev/",
  "https://berkas.zxcstream.workers.dev/", //Test040
  "https://berkas.test038.workers.dev/",
  "https://berkas.test032.workers.dev/",
  "https://berkas.test034.workers.dev/",
  "https://berkas.test035.workers.dev/",
  "https://berkas.test033.workers.dev/",
  "https://berkas.test031.workers.dev/",
  "https://berkas.test030.workers.dev/",
  "https://berkas.test029.workers.dev/",
  "https://berkas.test027.workers.dev/",
  "https://berkas.test028.workers.dev/",
  "https://berkas.test025.workers.dev/",
  "https://berkas.test026.workers.dev/",
  "https://berkas.test024.workers.dev/",
  "https://berkas.test023.workers.dev/",
  "https://berkas.test022.workers.dev/",
  "https://berkas.test021.workers.dev/",
  "https://berkas.test017.workers.dev/",
  "https://berkas.test019.workers.dev/",
  "https://berkas.test018.workers.dev/",
  "https://berkas.test020.workers.dev/",
  // "https://berkas.test013.workers.dev/",
  // "https://berkas.test015-505.workers.dev/",
  // "https://berkas.test016.workers.dev/",
  // "https://berkas.test014-25a.workers.dev/",
  // "https://berkas.test09-635.workers.dev/",
  // "https://berkas.test010-f3d.workers.dev/",
  // "https://berkas.test011.workers.dev/",
  // "https://berkas.test012.workers.dev/",
  // "https://berkas.test05-187.workers.dev/",
  // "https://berkas.test06-c51.workers.dev/",
  // "https://berkas.test07-84f.workers.dev/",
  // "https://berkas.test08-0df.workers.dev/",
  // "https://berkas.test01-05a.workers.dev/",
  // "https://berkas.test02-663.workers.dev/",
  // "https://berkas.test03-4fb.workers.dev/",
  // "https://berkas.test04-cee.workers.dev/",
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
async function getHealthyWorker(): Promise<string | null> {
  const candidates = shuffle(PROXY_WORKERS);

  for (const worker of candidates) {
    try {
      const res = await fetchWithTimeout(worker, { method: "HEAD" }, 3000);

      console.log(worker, res.status);

      if (res.ok) {
        return worker;
      }
    } catch (err) {
      console.error(worker, err);
    }
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

    // -------- Cache Lookup --------
    let streamUrls: string[];
    let subtitles: any[];

    const cacheQuery = supabase
      .from("berkas_cache")
      .select("stream_urls, subtitles")
      .eq("tmdb_id", tmdbId)
      .eq("media_type", mediaType)
      .eq("season", season ?? "")
      .eq("episode", episode ?? "")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    const { data: cached } = await cacheQuery;

    if (cached) {
      console.log(`[BERKAS] cache hit`);
      streamUrls = cached.stream_urls ?? [];
      subtitles = cached.subtitles ?? [];
    } else {
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

      streamUrls = data?.data?.stream_urls ?? [];

      if (data?.status_code !== "200" || !streamUrls.length) {
        logRequest(404, "no streams found");
        return NextResponse.json(
          { success: false, error: "No streams found" },
          { status: 404 },
        );
      }

      subtitles = (data?.default_subs ?? []).map((sub: any, index: number) => ({
        id: sub.sid ?? sub.id ?? index,
        display:
          sub.lang ?? sub.language ?? sub.display ?? sub.code ?? "Unknown",
        language: sub.code ?? "",
        file: sub.url ?? sub.file,
      }));

      await supabase.from("berkas_cache").upsert(
        {
          tmdb_id: tmdbId,
          media_type: mediaType,
          season: season ?? "",
          episode: episode ?? "",
          stream_urls: streamUrls,
          subtitles,
          refreshed_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString(),
        },
        { onConflict: "tmdb_id,media_type,season,episode" },
      );
    }

    const proxyWorker = await getHealthyWorker();

    if (!proxyWorker) {
      logRequest(503, "all proxy workers unavailable");
      return NextResponse.json(
        { success: false, error: "No proxy workers available" },
        { status: 503 },
      );
    }

    const links = await Promise.all(
      streamUrls.map(async (url, i) => {
        const encrypted = await encryptUrl(url);

        return {
          type: "hls" as const,
          link: `${proxyWorker}?data=${encodeURIComponent(encrypted)}`,
          resolution: streamUrls.length - i,
        };
      }),
    );

    logRequest(200, "OK!!!!!");
    return NextResponse.json({
      success: true,
      links,
      subtitles,
      meow: !!cached,
    });
  } catch (err: any) {
    console.error("API Error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

//AES_KEY
//48cea93448b6719f32471b15777eb140db961b6ba6f1fc92cb92b0fdd7da555d

// function toBase64Url(bytes) {
//   let str = "";
//   for (const b of bytes) str += String.fromCharCode(b);

//   return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
// }

// function fromBase64Url(str) {
//   str = str.replace(/-/g, "+").replace(/_/g, "/");

//   while (str.length % 4) str += "=";

//   const bin = atob(str);

//   return Uint8Array.from(bin, (c) => c.charCodeAt(0));
// }

// async function getCryptoKey(aesKey) {
//   const keyBytes = Uint8Array.from(
//     aesKey.match(/.{2}/g).map((b) => parseInt(b, 16)),
//   );

//   return crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, [
//     "encrypt",
//     "decrypt",
//   ]);
// }

// async function encryptUrl(url, cryptoKey) {
//   const iv = crypto.getRandomValues(new Uint8Array(12));

//   const encrypted = await crypto.subtle.encrypt(
//     { name: "AES-GCM", iv },
//     cryptoKey,
//     new TextEncoder().encode(url),
//   );

//   const out = new Uint8Array(iv.length + encrypted.byteLength);

//   out.set(iv, 0);
//   out.set(new Uint8Array(encrypted), iv.length);

//   return toBase64Url(out);
// }

// async function decryptUrl(data, cryptoKey) {
//   const bytes = fromBase64Url(data);

//   const iv = bytes.slice(0, 12);
//   const ciphertext = bytes.slice(12);

//   const decrypted = await crypto.subtle.decrypt(
//     { name: "AES-GCM", iv },
//     cryptoKey,
//     ciphertext,
//   );

//   return new TextDecoder().decode(decrypted);
// }

// function getCorsOrigin(req) {
//   const origin = req.headers.get("Origin");

//   if (origin) {
//     try {
//       const hostname = new URL(origin).hostname;

//       if (
//         hostname.includes("localhost") ||
//         hostname.includes("zxcstream") ||
//         hostname.includes("zxcprime") ||
//         hostname.includes("mnflix")
//       ) {
//         return origin;
//       }
//     } catch {}

//     return null;
//   }

//   return null;
// }

// export default {
//   async fetch(request, env) {
//     const worker = new URL(request.url);

//     if (worker.pathname === "/" && !worker.search) {
//       return new Response("OK", { status: 200 });
//     }

//     const cryptoKey = await getCryptoKey(env.AES_KEY);

//     const allowedOrigin = getCorsOrigin(request);

//     // Handle CORS preflight
//     if (request.method === "OPTIONS") {
//       if (!allowedOrigin) {
//         return new Response("Forbidden", { status: 403 });
//       }

//       return new Response(null, {
//         status: 204,
//         headers: {
//           "Access-Control-Allow-Origin": allowedOrigin,
//           "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
//           "Access-Control-Allow-Headers": "Range, Content-Type",
//           "Access-Control-Max-Age": "86400",
//         },
//       });
//     }

//     const data = worker.searchParams.get("data");

//     if (!data) {
//       return new Response("Missing ?data=", { status: 400 });
//     }

//     let target;

//     try {
//       target = await decryptUrl(data, cryptoKey);
//     } catch {
//       return new Response("Invalid encrypted URL", { status: 403 });
//     }

//     const upstream = new URL(target);

//     // Random IP ranges
//     const ranges = [
//       [41, 57],
//       [41, 60],
//       [41, 72],
//       [41, 73],
//       [41, 116],
//       [41, 138],
//       [41, 160],
//       [41, 175],
//       [41, 188],
//       [41, 203],
//       [41, 215],
//       [41, 222],
//       [102, 0],
//       [102, 22],
//       [102, 68],
//       [102, 89],
//       [102, 130],
//       [102, 164],
//       [102, 176],
//       [102, 212],
//       [105, 16],
//       [105, 48],
//       [105, 112],
//       [105, 160],
//       [105, 224],
//       [197, 136],
//       [197, 148],
//       [197, 156],
//       [197, 210],
//       [197, 232],
//       [197, 248],
//       [45, 96],
//       [45, 100],
//       [45, 108],
//     ];

//     const base = ranges[Math.floor(Math.random() * ranges.length)];
//     const rand = () => Math.floor(Math.random() * 254) + 1;
//     const randomIP = `${base[0]}.${base[1]}.${rand()}.${rand()}`;

//     const headers = new Headers({
//       Origin: "https://nextgencloudfabric.com",
//       Referer: "https://nextgencloudfabric.com/",
//       "User-Agent":
//         "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
//       Accept: "*/*",
//       "Accept-Language": "en-US,en;q=0.7",
//       "Accept-Encoding": "identity;q=1, *;q=0",
//       "X-Forwarded-For": randomIP,
//       "CF-Connecting-IP": randomIP,
//       "X-Real-IP": randomIP,
//     });

//     const clientRange = request.headers.get("Range");
//     if (clientRange) {
//       headers.set("Range", clientRange);
//     }

//     const response = await fetch(upstream, {
//       method: request.method,
//       headers,
//       body:
//         request.method === "GET" || request.method === "HEAD"
//           ? undefined
//           : request.body,
//       redirect: "follow",
//     });

//     if (!response.ok && response.status !== 206) {
//       return new Response(null, {
//         status: response.status,
//         headers: {
//           ...(allowedOrigin && {
//             "Access-Control-Allow-Origin": allowedOrigin,
//           }),
//           "Cache-Control": "no-store",
//         },
//       });
//     }

//     const contentType = response.headers.get("content-type") || "";

//     // Rewrite .m3u8 playlists
//     if (
//       upstream.pathname.endsWith(".m3u8") ||
//       contentType.includes("mpegurl")
//     ) {
//       const playlist = await response.text();

//       const lines = playlist.split(/\r?\n/);
//       const rewritten = [];

//       for (const line of lines) {
//         if (!line || line.startsWith("#")) {
//           rewritten.push(line);
//           continue;
//         }

//         const absolute = new URL(line, upstream).toString();
//         const encrypted = await encryptUrl(absolute, cryptoKey);

//         rewritten.push(
//           `${worker.origin}/?data=${encodeURIComponent(encrypted)}`,
//         );
//       }

//       const output = rewritten.join("\n");

//       const out = new Headers({
//         "Content-Type": "application/vnd.apple.mpegurl",
//         "Access-Control-Allow-Headers": "*",
//         "Access-Control-Expose-Headers": "*",
//       });

//       if (allowedOrigin) {
//         out.set("Access-Control-Allow-Origin", allowedOrigin);
//         out.set("Vary", "Origin");
//       }

//       return new Response(output, { status: response.status, headers: out });
//     }

//     // Proxy everything else (.ts, .m4s, .mp4, .key, etc.)
//     const out = new Headers(response.headers);

//     if (allowedOrigin) {
//       out.set("Access-Control-Allow-Origin", allowedOrigin);
//       out.set("Vary", "Origin");
//     } else {
//       out.delete("Access-Control-Allow-Origin");
//     }

//     out.set("Access-Control-Allow-Headers", "*");
//     out.set("Access-Control-Expose-Headers", "*");
//     out.set("Accept-Ranges", "bytes");

//     return new Response(response.body, {
//       status: response.status,
//       headers: out,
//     });
//   },
// };
