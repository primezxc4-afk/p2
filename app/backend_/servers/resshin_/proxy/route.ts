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

    // ==================== HEADERS (matching RESSHIN gateway) ====================
    const headers: Record<string, string> = {
      accept: "*/*",
      "accept-encoding": "gzip, deflate, br",
      "user-agent":
        "com.community.mbox.in.geobypass/51042203 (Linux; U; Android 7.1.2; en_US; SM-G955N; Build/NRD90M.G955NKSU1AQDC; Cronet/104.0.5112.46)",
      "x-client-info": JSON.stringify({
        package_name: "com.community.mbox.in.geobypass",
        version_name: "3.0.14.0422.03",
        version_code: 51042203,
        os: "android",
        os_version: "7.1.2",
        brand: "samsung",
        model: "SM-G955N",
        system_language: "en",
        net: "NETWORK_WIFI",
        region: "US",
        timezone: "Africa/Brazzaville",
        sp_code: "20801",
        "X-Play-Mode": "2",
        "X-Family-Mode": "0",
      }),
      "x-client-status": "0",
      "x-family-mode": "0",
      "x-play-mode": "2",
    };

    // Forward important client headers
    const range = req.headers.get("range");
    if (range) headers["Range"] = range;

    const accept = req.headers.get("accept");
    if (accept) headers["accept"] = accept;

    const authorization = req.headers.get("authorization");
    if (authorization) headers["authorization"] = authorization;

    // Optional: forward more headers if needed
    const xClientInfo = req.headers.get("x-client-info");
    if (xClientInfo) headers["x-client-info"] = xClientInfo;

    const upstream = await fetch(url, {
      method: req.method,
      headers,
      // Important for video streaming
      redirect: "follow",
    });

    const responseHeaders = new Headers(upstream.headers);

    // Clean up hop-by-hop headers that shouldn't be forwarded
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    responseHeaders.delete("transfer-encoding");
    responseHeaders.delete("connection");

    return new NextResponse(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (err: any) {
    console.error("[Proxy Error]", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }
}
