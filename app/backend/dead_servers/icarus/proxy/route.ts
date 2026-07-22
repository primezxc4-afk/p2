import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return proxy(req);
}

export async function HEAD(req: NextRequest) {
  return proxy(req);
}
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
async function proxy(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get("url");

    if (!url) {
      return new NextResponse("Missing url", { status: 400 });
    }

    const base = ranges[Math.floor(Math.random() * ranges.length)];
    const rand = () => Math.floor(Math.random() * 254) + 1;

    const randomIP = `${base[0]}.${base[1]}.${rand()}.${rand()}`;

    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
      Referer: "https://sflix.film/",
      Origin: "https://sflix.film",
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.7",
      "Accept-Encoding": "identity;q=1, *;q=0",
      "X-Forwarded-For": randomIP,
      "CF-Connecting-IP": randomIP,
      "X-Real-IP": randomIP,
    };

    const range = req.headers.get("range");
    if (range) {
      headers["Range"] = range;
    }

    const upstream = await fetch(url, {
      method: req.method,
      headers,
    });

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: upstream.headers,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }
}

// import { NextRequest, NextResponse } from "next/server";

// export const runtime = "nodejs";

// function fromBase64Url(str: string): Uint8Array {
//   str = str.replace(/-/g, "+").replace(/_/g, "/");
//   while (str.length % 4) str += "=";

//   return new Uint8Array(Buffer.from(str, "base64"));
// }

// async function getCryptoKey(aesKey: string): Promise<CryptoKey> {
//   const keyBytes = Uint8Array.from(
//     aesKey.match(/.{2}/g)!.map((b) => parseInt(b, 16)),
//   );

//   return crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, [
//     "decrypt",
//   ]);
// }

// async function decryptUrl(data: string, cryptoKey: CryptoKey): Promise<string> {
//   const bytes = fromBase64Url(data);
//   const iv = bytes.slice(0, 12);
//   const ciphertext = bytes.slice(12);

//   const decrypted = await crypto.subtle.decrypt(
//     {
//       name: "AES-GCM",
//       iv,
//     },
//     cryptoKey,
//     ciphertext,
//   );

//   return new TextDecoder().decode(decrypted);
// }

// function getCorsOrigin(req: NextRequest): string | null {
//   const origin = req.headers.get("origin");

//   if (origin) {
//     try {
//       const hostname = new URL(origin).hostname;

//       if (
//         hostname.includes("zxcstream") ||
//         hostname.includes("zxcprime") ||
//         hostname.includes("mnflix")
//       ) {
//         return origin;
//       }
//     } catch {}
//   }

//   return null;
// }

// const ranges: [number, number][] = [
//   [41, 57],
//   [41, 60],
//   [41, 72],
//   [41, 73],
//   [41, 116],
//   [41, 138],
//   [41, 160],
//   [41, 175],
//   [41, 188],
//   [41, 203],
//   [41, 215],
//   [41, 222],
//   [102, 0],
//   [102, 22],
//   [102, 68],
//   [102, 89],
//   [102, 130],
//   [102, 164],
//   [102, 176],
//   [102, 212],
//   [105, 16],
//   [105, 48],
//   [105, 112],
//   [105, 160],
//   [105, 224],
//   [197, 136],
//   [197, 148],
//   [197, 156],
//   [197, 210],
//   [197, 232],
//   [197, 248],
//   [45, 96],
//   [45, 100],
//   [45, 108],
// ];

// async function proxy(req: NextRequest): Promise<NextResponse> {
//   try {
//     const allowedOrigin = getCorsOrigin(req);

//     if (req.method === "OPTIONS") {
//       if (!allowedOrigin) {
//         return new NextResponse("Forbidden", { status: 403 });
//       }

//       return new NextResponse(null, {
//         status: 204,
//         headers: {
//           "Access-Control-Allow-Origin": allowedOrigin,
//           "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
//           "Access-Control-Allow-Headers": "Range, Content-Type",
//           "Access-Control-Max-Age": "86400",
//         },
//       });
//     }

//     const { searchParams } = new URL(req.url);
//     const data = searchParams.get("data");

//     if (!data) {
//       return new NextResponse("Missing data", {
//         status: 400,
//       });
//     }

//     const aesKey = process.env.AES_KEY;

//     if (!aesKey) {
//       return NextResponse.json(
//         { error: "AES_KEY is not configured." },
//         { status: 500 },
//       );
//     }

//     const cryptoKey = await getCryptoKey(aesKey);

//     let decodedUrl: string;

//     try {
//       decodedUrl = await decryptUrl(data, cryptoKey);
//     } catch {
//       return new NextResponse("Invalid encrypted URL", {
//         status: 403,
//       });
//     }

//     const base = ranges[Math.floor(Math.random() * ranges.length)];
//     const rand = () => Math.floor(Math.random() * 254) + 1;

//     const randomIP = `${base[0]}.${base[1]}.${rand()}.${rand()}`;

//     const headers: Record<string, string> = {
//       "User-Agent":
//         "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
//       Referer: "https://fmoviesunblocked.net/",
//       Origin: "https://fmoviesunblocked.net",
//       Accept: "*/*",
//       "Accept-Language": "en-US,en;q=0.7",
//       "Accept-Encoding": "identity;q=1, *;q=0",
//       "X-Forwarded-For": randomIP,
//       "CF-Connecting-IP": randomIP,
//       "X-Real-IP": randomIP,
//     };

//     const clientRange = req.headers.get("range");

//     if (clientRange) {
//       headers.Range = clientRange;
//     }

//     const upstream = await fetch(decodedUrl, {
//       method: req.method === "HEAD" ? "HEAD" : "GET",
//       headers,
//     });

//     if (!upstream.ok && upstream.status !== 206) {
//       return new NextResponse(null, {
//         status: upstream.status,
//         headers: {
//           ...(allowedOrigin && {
//             "Access-Control-Allow-Origin": allowedOrigin,
//           }),
//           "Cache-Control": "no-store",
//         },
//       });
//     }

//     const responseHeaders = new Headers(upstream.headers);

//     if (allowedOrigin) {
//       responseHeaders.set("Access-Control-Allow-Origin", allowedOrigin);
//       responseHeaders.set("Vary", "Origin");
//     } else {
//       responseHeaders.delete("Access-Control-Allow-Origin");
//     }

//     responseHeaders.set("Accept-Ranges", "bytes");
//     responseHeaders.set(
//       "Content-Type",
//       upstream.headers.get("content-type") ?? "video/mp4",
//     );

//     return new NextResponse(upstream.body, {
//       status: upstream.status,
//       headers: responseHeaders,
//     });
//   } catch (err) {
//     return NextResponse.json(
//       {
//         success: false,
//         error: err instanceof Error ? err.message : "Unknown error",
//       },
//       {
//         status: 500,
//       },
//     );
//   }
// }

// export async function GET(req: NextRequest) {
//   return proxy(req);
// }

// export async function HEAD(req: NextRequest) {
//   return proxy(req);
// }

// export async function OPTIONS(req: NextRequest) {
//   return proxy(req);
// }
