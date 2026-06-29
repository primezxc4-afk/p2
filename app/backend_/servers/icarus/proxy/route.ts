import { NextRequest } from "next/server";

async function handleProxy(req: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(req.url);
    const urlParam = searchParams.get("url");
    if (!urlParam) return new Response("Missing url", { status: 400 });

    const decodedUrl = decodeURIComponent(urlParam);

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
    const randomIP = `${base[0]}.${base[1]}.${rand()}.${rand()}`;

    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
      Referer: "https://netfilm.world/",
      Origin: "https://netfilm.world",
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.7",
      "Accept-Encoding": "identity;q=1, *;q=0",
      "X-Forwarded-For": randomIP,
      "CF-Connecting-IP": randomIP,
      "X-Real-IP": randomIP,
    };

    const clientRange = req.headers.get("Range");
    if (clientRange) headers["Range"] = clientRange;

    const upstream = await fetch(decodedUrl, {
      method: req.method === "HEAD" ? "HEAD" : "GET",
      headers,
    });

    if (!upstream.ok && upstream.status !== 206)
      return new Response(`Upstream failed: ${upstream.status}`, {
        status: upstream.status,
      });

    const newHeaders = new Headers(upstream.headers);
    newHeaders.set("Access-Control-Allow-Origin", "*");
    newHeaders.set("Accept-Ranges", "bytes");
    newHeaders.set(
      "Content-Type",
      upstream.headers.get("content-type") || "video/mp4",
    );

    return new Response(upstream.body, {
      status: upstream.status,
      headers: newHeaders,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
    });
  }
}

export async function GET(req: NextRequest) {
  return handleProxy(req);
}

export async function HEAD(req: NextRequest) {
  return handleProxy(req);
}
