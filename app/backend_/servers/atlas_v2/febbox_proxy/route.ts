import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get("url");

  if (!target) {
    return new Response("Missing url", { status: 400 });
  }

  // 🔥 decode once (fix double encoding)
  let decodedTarget: string;
  try {
    decodedTarget = decodeURIComponent(target);
  } catch {
    decodedTarget = target;
  }

  // 🔥 build headers
  const headers: Record<string, string> = {
    Referer: "https://hls.shegu.net/",
    "User-Agent": request.headers.get("user-agent") || "Mozilla/5.0",
  };

  // 🔥 forward range (important for video)
  const range = request.headers.get("range");
  if (range) {
    headers["Range"] = range;
  }

  const res = await fetch(decodedTarget, {
    method: "GET",
    headers,
  });

  const contentType = res.headers.get("content-type") || "";

  // =========================================
  // 🔥 HANDLE M3U8 PLAYLIST
  // =========================================
  if (contentType.includes("mpegurl") || decodedTarget.includes(".m3u8")) {
    let text = await res.text();
    const base = new URL(decodedTarget);

    text = text.replace(
      /(https?:\/\/[^\s"]+)|URI="([^"]+)"/g,
      (match, absUrl, quotedUrl) => {
        let original = absUrl || quotedUrl;
        if (!original) return match;

        // resolve relative URLs
        try {
          original = new URL(original, base).toString();
        } catch {}

        // 🔥 ONLY proxy .m3u8 (avoid segment 403 issue)
        if (!original.includes(".m3u8")) {
          return match;
        }

        let clean;
        try {
          clean = decodeURIComponent(original);
        } catch {
          clean = original;
        }

        const proxied = `/backend/nyak/?url=${encodeURIComponent(clean)}`;

        return quotedUrl ? `URI="${proxied}"` : proxied;
      },
    );

    return new Response(text, {
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // =========================================
  // 🔥 HANDLE SEGMENTS / MEDIA
  // =========================================
  const outHeaders = new Headers(res.headers);

  outHeaders.set("Access-Control-Allow-Origin", "*");
  outHeaders.set("Access-Control-Expose-Headers", "*");

  return new Response(res.body, {
    status: res.status,
    headers: outHeaders,
  });
}
