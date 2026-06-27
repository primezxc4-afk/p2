//http://localhost:3000/backend/servers/kratos/2?url=https://vimeos.net/embed-ry3hotkpqu1b.html
//VIMEOS EXTRACTOR
import { NextRequest, NextResponse } from "next/server";

function extractM3U8(html: string): string | null {
  // 1. Try plain URL first
  const plain = html.match(/https?:\/\/[^\s"'\\]+\.m3u8[^\s"'\\]*/);
  if (plain) return plain[0];

  // 2. Pull the symbol table and key numbers from the p,a,c,k,e,d packer
  // Format: eval(function(p,a,c,k,e,d){...}('PACKED',BASE,COUNT,'SYMBOLS'.split('|')))
  const packerMatch = html.match(
    /eval\(function\(p,a,c,k,e,d\)\{[\s\S]*?\}\('([\s\S]*?)',(\d+),(\d+),'([\s\S]*?)'\.split\('\|'\)\)\)/,
  );
  if (!packerMatch) return null;

  const [, packed, baseStr, , symbolsStr] = packerMatch;
  const base = parseInt(baseStr);
  const symbols = symbolsStr.split("|");

  // Decode: replace each \b{number}\b with its symbol
  const decode = (str: string) =>
    str.replace(/\b(\w+)\b/g, (match) => {
      const num = parseInt(match, base);
      return !isNaN(num) && symbols[num] ? symbols[num] : match;
    });

  const deobfuscated = decode(packed);

  // Now find m3u8 in the decoded string
  const m3u8 = deobfuscated.match(/https?:\/\/[^\s"'\\]+\.m3u8[^\s"'\\]*/);
  return m3u8?.[0] ?? null;
}
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { success: false, error: "Missing url" },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        Referer: "https://vimeos.net/",
        Accept: "text/html,*/*",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch source" },
        { status: res.status },
      );
    }

    const html = await res.text();

    const m3u8 = extractM3U8(html);

    if (!m3u8) {
      return NextResponse.json(
        { success: false, error: "m3u8 not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      m3u8,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Unknown error" },
      { status: 500 },
    );
  }
}
