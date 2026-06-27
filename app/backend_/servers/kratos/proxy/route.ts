import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const url =
    "https://vimeos.zip/hls2/03/00003/ry3hotkpqu1b_,n,h,.urlset/master.m3u8?t=bKn44IMKBX0EDh9vs028RNwvA-zx6q76U2Bd9NEtY8M&s=1782219142&e=43200&v=269888928&srv=s8&i=0.3&sp=0&r=e";

  const res = await fetch(url, {
    headers: {
      referer: "https://vimeos.net/",
      origin: "https://vimeos.net/",
      "user-agent": "Mozilla/5.0",
    },
  });

  const text = await res.text();

  return new NextResponse(text, {
    headers: {
      "content-type": "application/vnd.apple.mpegurl",
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
    },
  });
}
