import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return proxy(req);
}

export async function HEAD(req: NextRequest) {
  return proxy(req);
}

async function proxy(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get("url");

    if (!url) {
      return new NextResponse("Missing url", { status: 400 });
    }

    const headers: HeadersInit = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
      Referer: "https://fmoviesunblocked.net/",
      Origin: "https://fmoviesunblocked.net",
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.7",
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
