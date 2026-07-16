// app/api/extract/pontv/route.ts

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

const cdnMapping: Record<string, string> = {
  storage1: "cab7156e-78c6-44ae-9e2e-bb47f852d378",
  storage2: "6df67a4e-d827-46d8-a688-31166d31d535",
  storage3: "5a1a02f9-64f3-4aa5-a4fd-11bcc61987e6",
  storage4: "437a9249-ca20-41ac-83fd-8c85a82857f4",
  storage5: "b284a23d-3679-44c5-a974-94ad5ba212b7",
  storage6: "5dd0d328-943f-469b-b1bf-f0c675daa698",
  storage1tv: "3e9dfeaf-7304-4885-ad85-5406dcf7590b",
  storage2tv: "bd41a24e-76f8-49d2-a257-d439045c0896",
  storage3tv: "d0e7a6e9-ae68-48f6-9f2f-843c453ca764",
  storage6tv: "a06fcce7-2e2d-44fa-806c-73719b05045e",
  storage7tv: "38f050d1-82b7-41ca-9c3b-c47adcbec27a",
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const tmdb = searchParams.get("id");
    const season = searchParams.get("season") || "";
    const episode = searchParams.get("episode") || "";

    if (!tmdb) {
      return NextResponse.json(
        { error: "Missing id parameter" },
        { status: 400 },
      );
    }

    const isTV = season !== "" && episode !== "";

    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138.0.0.0 Safari/537.36",
      Referer: `https://pontv.to/movies/${tmdb}`,
      Origin: "https://pontv.to",
    };

    const url = isTV
      ? `https://pontv.to/tv-shows/${tmdb}/season/${season}/episode/${episode}`
      : `https://pontv.to/movies/${tmdb}`;

    const html = await fetch(url, {
      headers,
      cache: "no-store",
    }).then((r) => r.text());

    let targetHTML = html;

    if (isTV) {
      let match = html.match(
        new RegExp(
          String.raw`\\?"episodeNumber\\?"\s*:\s*${episode}\s*,.*?\\?"seasonNumber\\?"\s*:\s*${season}\s*,.*?\\?"episodeId\\?"\s*:\s*\d+`,
          "s",
        ),
      );

      if (!match) {
        match = html.match(
          new RegExp(
            String.raw`\\?"seasonNumber\\?"\s*:\s*${season}\s*,.*?\\?"episodeNumber\\?"\s*:\s*${episode}\s*,.*?\\?"episodeId\\?"\s*:\s*\d+`,
            "s",
          ),
        );
      }

      if (!match) {
        throw new Error("Episode not found");
      }

      targetHTML = match[0];
    }

    const name = targetHTML.match(/\\?"name\\?"\s*:\s*\\?"(tt[^"\\]+)/)?.[1];

    if (!name) throw new Error("Video filename not found");

    const host = targetHTML.match(
      /\\?"video_storage\\?"\s*:\s*\\?"([^"\\]+)/,
    )?.[1];

    if (!host) throw new Error("Storage host not found");

    const ip = html.match(/\\?"address\\?"\s*:\s*\\?"([^"\\]+)/)?.[1];

    if (!ip) throw new Error("Client IP not found");

    const secret = cdnMapping[host];

    if (!secret) {
      throw new Error(`Unknown storage host: ${host}`);
    }

    const path = `/${name}.mp4`;
    const expires = Math.floor(Date.now() / 1000) + 7200;

    const token = crypto
      .createHash("sha256")
      .update(`${secret}${path}${expires}${ip}`)
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    const stream = `https://${host}.pontv.to${path}?token=${token}&expires=${expires}`;

    return NextResponse.json({
      success: true,
      source: "PonTV",
      type: "mp4",
      label: "Auto",
      file: stream,
      headers,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
