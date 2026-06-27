import { fetchWithTimeout } from "@/lib/fetch-timeout";
import { NextRequest, NextResponse } from "next/server";

const API = "https://enc-dec.app/api";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
  Accept: "application/json",
};

async function validate(data: any, path: string) {
  if (data.status !== 200) {
    return null;
  }
  return data.result;
}

async function getEncKey(content_id: string, type: "vid" | "sub") {
  const url = `${API}/enc-kisskh?text=${content_id}&type=${type}`;

  const res = await fetchWithTimeout(
    url,
    { method: "GET", cache: "no-store" },
    8000,
  ).catch(() => null);

  if (!res?.ok) return null;

  const json = await res.json();
  return validate(json, url);
}

async function getVideo(content_id: string, vid_key: string) {
  const url = `https://kisskh.do/api/DramaList/Episode/${content_id}.png?err=false&ts=&time=&kkey=${vid_key}`;

  const res = await fetchWithTimeout(
    url,
    { headers: HEADERS, cache: "no-store" },
    10000,
  ).catch(() => null);

  if (!res?.ok) return null;
  return res.json();
}

async function getSubtitles(content_id: string, sub_key: string) {
  const url = `https://kisskh.do/api/Sub/${content_id}?kkey=${sub_key}`;

  const res = await fetchWithTimeout(
    url,
    { headers: HEADERS, cache: "no-store" },
    10000,
  ).catch(() => null);

  if (!res?.ok) return null;
  return res.json();
}

async function decryptSubtitle(src: string) {
  const url = `${API}/dec-kisskh?url=${encodeURIComponent(src)}`;

  const res = await fetchWithTimeout(url, { cache: "no-store" }, 8000).catch(
    () => null,
  );

  if (!res?.ok) return null;
  return res.text();
}

export async function GET(req: NextRequest) {
  try {
    const content_id = req.nextUrl.searchParams.get("id") || "192143";

    // --- ENCRYPTION KEYS ---
    const vid_key = await getEncKey(content_id, "vid");
    if (!vid_key) {
      return NextResponse.json(
        { success: false, error: "Failed to get video key" },
        { status: 502 },
      );
    }

    const sub_key = await getEncKey(content_id, "sub");
    if (!sub_key) {
      return NextResponse.json(
        { success: false, error: "Failed to get subtitle key" },
        { status: 502 },
      );
    }

    // --- VIDEO ---
    const video = await getVideo(content_id, vid_key);
    if (!video) {
      return NextResponse.json(
        { success: false, error: "Video fetch failed" },
        { status: 502 },
      );
    }

    // --- SUBTITLES ---
    const subtitles = await getSubtitles(content_id, sub_key);
    if (!subtitles) {
      return NextResponse.json(
        { success: false, error: "Subtitle fetch failed" },
        { status: 502 },
      );
    }

    // --- DECRYPT FIRST SUBTITLE ---
    const firstSrc = subtitles?.[0]?.src;

    let decrypted = null;

    if (firstSrc) {
      decrypted = await decryptSubtitle(firstSrc);
    }

    // --- CLEAN VIDEO ---
    const videoUrl = video?.Video || null;

    // --- CLEAN SUBTITLES ---
    const cleanSubtitles = subtitles.map((s: any) => ({
      url: s.src,
      lang: s.land,
      label: s.label,
      default: s.default,
    }));

    // --- PARSE SRT ---
    const parsedSubtitle = decrypted
      ?.split("\n\n")
      .map((b: string) => {
        const l = b.split("\n");
        return l.length >= 3
          ? {
              index: l[0],
              time: l[1],
              text: l.slice(2).join(" "),
            }
          : null;
      })
      .filter(Boolean);

    // --- RESPONSE ---
    return NextResponse.json({
      success: true,
      links: [
        {
          type: "hls",
          link: video?.Video || null,
        },
      ],
      subtitles: [],
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
