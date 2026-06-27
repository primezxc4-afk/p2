// app/api/stream/route.js

import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tmdb = searchParams.get("tmdb");
  const type = searchParams.get("type") ?? "movie";

  if (!tmdb) {
    return Response.json(
      { error: "tmdb query param is required" },
      { status: 400 },
    );
  }

  const targetUrl = `https://streamdata.vaplayer.ru/api.php?tmdb=${tmdb}&type=${type}`;

  const spoofHeaders = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.7",
    // ❌ removed Accept-Encoding — Node fetch sets this itself and auto-decompresses
    Origin: "https://brightpathsignals.com",
    Referer: "https://brightpathsignals.com/",
    "Sec-CH-UA": '"Brave";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
    "Sec-CH-UA-Mobile": "?0",
    "Sec-CH-UA-Platform": '"Windows"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "cross-site",
    "Sec-GPC": "1",
    Priority: "u=1, i",
  };

  try {
    const upstream = await fetch(targetUrl, {
      method: "GET",
      headers: spoofHeaders,
    });

    if (!upstream.ok) {
      return Response.json(
        {
          error: `Upstream returned ${upstream.status} ${upstream.statusText}`,
        },
        { status: upstream.status },
      );
    }

    const data = await upstream.json();

    return Response.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (err) {
    console.error("[stream proxy] fetch error:", err);
    return Response.json(
      { error: "Failed to fetch stream data" },
      { status: 500 },
    );
  }
}
