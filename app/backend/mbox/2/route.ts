import { NextRequest, NextResponse } from "next/server";

const UPSTREAM_BASE = "https://netfilm.world/wefeed-h5api-bff/subject/play";

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

function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}

export async function GET(req: NextRequest) {
  const subjectId = req.nextUrl.searchParams.get("subjectId");
  const se = req.nextUrl.searchParams.get("se");
  const ep = req.nextUrl.searchParams.get("ep");
  const detailPath = req.nextUrl.searchParams.get("detailPath");

  if (!subjectId) {
    return NextResponse.json(
      { success: false, error: "subjectId is required" },
      { status: 400 },
    );
  }

  const randomIP = getRandomAfricanIP();

  const upstreamUrl = new URL(UPSTREAM_BASE);
  upstreamUrl.searchParams.set("subjectId", subjectId);
  if (se) upstreamUrl.searchParams.set("se", se);
  if (ep) upstreamUrl.searchParams.set("ep", ep);
  if (detailPath) upstreamUrl.searchParams.set("detailPath", detailPath);

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",

    // region spoofing
    "X-Forwarded-For": randomIP,
    "CF-Connecting-IP": randomIP,
    "X-Real-IP": randomIP,

    // IMPORTANT: match real site
    Referer: `https://netfilm.world/spa/videoPlayPage/movies/${detailPath || ""}?id=${subjectId}&type=/movie/detail&detailSe=${se || ""}&detailEp=${ep || ""}&lang=en`,
    Origin: "https://netfilm.world",

    "X-Client-Info": JSON.stringify({ timezone: "Africa/Nairobi" }),
  };

  try {
    const res = await fetchWithTimeout(
      upstreamUrl.toString(),
      {
        method: "GET",
        headers,
      },
      8000,
    );

    const contentType = res.headers.get("content-type") || "";

    const data = contentType.includes("application/json")
      ? await res.json()
      : await res.text();

    return new NextResponse(
      typeof data === "string" ? data : JSON.stringify(data),
      {
        status: res.status,
        headers: {
          "content-type": contentType || "application/json",
        },
      },
    );
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return NextResponse.json(
        { success: false, error: "Request timed out" },
        { status: 504 },
      );
    }

    return NextResponse.json(
      { success: false, error: err?.message },
      { status: 500 },
    );
  }
}
