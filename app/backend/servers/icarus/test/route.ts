//app/backend/server/icarus/test/route.ts

import { NextRequest, NextResponse } from "next/server";

function getRandomAfricanIP() {
  const ranges: [number, number][] = [
    [41, 57],
    [41, 60],
    [41, 72],
    [41, 73],
    [102, 0],
    [102, 22],
    [105, 16],
    [105, 48],
    [197, 136],
    [45, 96],
  ];
  const base = ranges[Math.floor(Math.random() * ranges.length)];
  const rand = () => Math.floor(Math.random() * 254) + 1;
  return `${base[0]}.${base[1]}.${rand()}.${rand()}`;
}

export async function GET(req: NextRequest) {
  const detailPath = req.nextUrl.searchParams.get("detailPath");
  const season = req.nextUrl.searchParams.get("season");
  const episode = req.nextUrl.searchParams.get("episode");

  if (!detailPath) {
    return NextResponse.json(
      { success: false, error: "detailPath is required" },
      { status: 400 },
    );
  }

  const randomIP = getRandomAfricanIP();
  const headers = {
    "X-Client-Info": '{"timezone":"Africa/Nairobi"}',
    "Accept-Language": "en-US,en;q=0.5",
    Accept: "application/json",
    "User-Agent": "okhttp/4.12.0",
    "X-Forwarded-For": randomIP,
    "CF-Connecting-IP": randomIP,
    "X-Real-IP": randomIP,
    Referer: `https://fmoviesunblocked.net/spa/videoPlayPage/movies/${detailPath}?type=/movie/detail`,
    Origin: "https://fmoviesunblocked.net",
  };

  const params = new URLSearchParams({ detailPath });
  if (season) params.set("se", season);
  if (episode) params.set("ep", episode);

  try {
    const res = await fetch(
      `https://h5.aoneroom.com/wefeed-h5-bff/web/subject/download?${params.toString()}`,
      { headers },
    );

    const json = await res.json();
    const sources = json?.data?.data || json?.data || json;
    const downloads = sources?.downloads || [];
    const captions = sources?.captions || [];

    return NextResponse.json({
      success: true,
      downloads,
      subtitles: captions.map((c: any) => ({
        id: c.lan,
        display: c.lanName,
        file: c.url,
      })),
      raw: json,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message },
      { status: 500 },
    );
  }
}
