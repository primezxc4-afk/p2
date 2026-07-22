import { fetchWithTimeout } from "@/lib/fetch-timeout";
import { NextRequest, NextResponse } from "next/server";
import { validateBackendToken } from "@/lib/validate-token";

import { FIELD_MAP } from "@/lib/token";
import { encryptUrl } from "@/lib/encryptor";
import { createClient } from "@supabase/supabase-js";

let blacklistCache: Set<string> | null = null;
let blacklistCacheTime = 0;
const BLACKLIST_TTL = 5 * 60_000;
async function getNext8AMPH(): Promise<string> {
  const now = new Date();
  const ph = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const next8AM = new Date(ph);
  next8AM.setHours(8, 0, 0, 0);
  if (ph >= next8AM) next8AM.setDate(next8AM.getDate() + 1);
  const diff = next8AM.getTime() - ph.getTime();
  return new Date(now.getTime() + diff).toISOString();
}
async function blacklistProxy(proxy: string) {
  const expires_at = await getNext8AMPH();
  await supabase
    .from("proxy_blacklist")
    .upsert(
      { proxy, expires_at },
      { onConflict: "proxy", ignoreDuplicates: false },
    );
  blacklistCache?.add(proxy);
  console.log(`[PROXY] ⛔ blacklisted ${proxy}`);
}
async function getActiveProxies(proxies: string[]): Promise<string[]> {
  if (!blacklistCache || Date.now() - blacklistCacheTime > BLACKLIST_TTL) {
    const { data } = await supabase
      .from("proxy_blacklist")
      .select("proxy")
      .gt("expires_at", new Date().toISOString());
    blacklistCache = new Set((data ?? []).map((r: any) => r.proxy));
    blacklistCacheTime = Date.now();
  }
  return proxies.filter((p) => !blacklistCache!.has(p));
}
const supabase = createClient(
  process.env.NEXT_PUBLIC_HOLLY_SUPABASE_URL_HOLLY!,
  process.env.HOLLY_SUPABASE_SERVICE_ROLE_KEY_HOLLY!,
);
const GOOD_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.7871.114 Safari/537.36",
  Origin: "https://goodstream.cc",
  Referer:
    "https://goodstream.cc/embed/W3cPjhjEzF?__cf_chl_tk=SUf37oAYSwhfVhF8URs6D8SK2iP_w5RW9NDtbtCzul8-1783909042-1.0.1.1-2jmKyV_qr4Y10vE0u8rjgxQxVJxZZwFDSCLLQ_FdlbI",
  Cookie:
    "cf_clearance=Shib.kVZbVDgJDU1GKv1nbUVUVOmaQ5xdjU5pvCwLxg-1783909046-1.2.1.1-3iK8K2GIOeCtRAJ3l3WmPdDHjpKVpo8ieaAy17TRByJ0l0wKYlDPz2dRkqyRSeqz0TziVHmaJraDRzSBukJ.zJxeUwgxvat9hz8kCvB9kMjEmtKQpFxcxoYQ3I7FguWEndAqQppX9Xo.wkTgzNHGaQZuzDE6znn7G0RvI2BcRsIIR0u4wlxrsANladOz8CRnsMN.EQ7mvPcHd3AWq0hXpsjG1n6WJljyriChUetClEthytE4mhzRc_3qMEPlJ85W2wz9RfuH1247.rEjaBt1ztWlACrkcUtDDsYOquAojthHFmKygvZOYhnw.KVZXacdIQGVSakwm4ISD9z4C4M_qkxqYV4gG6jdqvOBLKKFho3j9rU.VpZ1vzMErFSMYH5NgETYeV3sYBCSOQFtd.ELqqBLIM_vvCF6WMj1OPDynQSxX28EGs7irFkcJGLQh6WPwE4LzHYfPYUfuP76bfKx3tj6aE6HVYfhZlmNb7QYTkgC62NvSBh6eh3snymTMkVN",
};
const HOLLY_WORKERS = [
  "https://orion.zxcprime362.workers.dev/",
  "https://orion.test8-98b.workers.dev/",
  "https://orion.test15-e6c.workers.dev/",
  "https://orion.test14-b67.workers.dev/",
  "https://orion.test13-ab8.workers.dev/",
  "https://orion.test12-3d3.workers.dev/",
  "https://orion.test11-a1b.workers.dev/",
  "https://orion.test5-9ab.workers.dev/",
  "https://orion.test7-337.workers.dev/",
  "https://orion.test6-cb9.workers.dev/",
  "https://orion.test9-6da.workers.dev/",
  "https://lucky-leaf-9eed.test26-ee5.workers.dev/",
  "https://black-thunder-0223.test25-30d.workers.dev/",
  "https://plain-lab-17af.test24-6ad.workers.dev/",
  "https://small-wood-adba.test23-515.workers.dev/",
  "https://dawn-field-efbb.test22-f82.workers.dev/",
  "https://rapid-rain-1898.test21-0af.workers.dev/",
  "https://blue-sun-2b6e.test20-5b4.workers.dev/",
  "https://broken-paper-2e14.test19-31a.workers.dev/",
  "https://polished-rice-b094.test18-8cb.workers.dev/",
  "https://soft-bread-864e.test16-011.workers.dev/",
  "https://dry-moon-e266.test66-8cc.workers.dev/",
  "https://fragrant-rice-8998.test65-8de.workers.dev/",
  "https://restless-resonance-a8a8.test63-bfc.workers.dev/",
  "https://nameless-tooth-8cbb.test64-0d5.workers.dev/",
  "https://spring-darkness-8beb.test61-86c.workers.dev/",
  "https://odd-river-ed9f.test29-be6.workers.dev/",
  "https://shrill-smoke-e6eb.test60-598.workers.dev/",
  "https://twilight-resonance-eb4d.test28-f24.workers.dev/",
  "https://billowing-rain-7239.test27-15e.workers.dev/",
  "https://throbbing-dream-bb83.test62-63e.workers.dev/",
  "https://small-hall-439b.test83-291.workers.dev/",
  "https://rough-bonus-f4e3.test82-ac2.workers.dev/",
  "https://quiet-sun-4390.test80-1f4.workers.dev/",
  "https://curly-sea-0553.test79-29a.workers.dev/",
  "https://mute-bonus-b2b6.test78-564.workers.dev/",
  "https://fragrant-silence-a7d1.test77-a68.workers.dev/",
  "https://weathered-king-9f51.test76-4e9.workers.dev/",
  "https://delicate-dream-a0ac.test75-da4.workers.dev/",
  "https://twilight-mode-af23.test74-635.workers.dev/",
  "https://sweet-feather-58ef.test73-bfb.workers.dev/",
  "https://morning-bar-88d3.test74-635.workers.dev/",
  "https://curly-fire-36d7.test73-bfb.workers.dev/",
  "https://restless-term-9ca1.test72-165.workers.dev/",
  "https://wispy-sea-969e.test71-dc9.workers.dev/",
  "https://silent-rain-377c.test68-6e8.workers.dev/",
  "https://flat-darkness-ef7a.test70-ee3.workers.dev/",
  "https://restless-brook-d944.test67-989.workers.dev/",
  "https://silent-rain-377c.test68-6e8.workers.dev/",
  "https://long-dew-a85b.test84-c55.workers.dev/",
  "https://muddy-sky-afea.test92-0aa.workers.dev/",
  //
  "https://green-resonance-ba27.orion001.workers.dev/",
  "https://plain-tooth-a5ef.orion002.workers.dev/",
  "https://lively-rice-79f8.orion004.workers.dev/",
  "https://morning-mountain-b270.orion003.workers.dev/",
  "https://young-poetry-2f1e.orion005.workers.dev/",
  "https://broken-fire-37fb.orion006.workers.dev/",
  "https://wispy-sea-c35e.orion008.workers.dev/",
  "https://broken-pond-08af.orion007.workers.dev/",
  "https://dry-rain-6c61.orion0010.workers.dev/",
  "https://morning-paper-2c32.orion009.workers.dev/",
  "https://sparkling-bush-c28f.orion0012.workers.dev/",
  "https://late-firefly-ca73.orion0011.workers.dev/",
  "https://snowy-grass-18ac.orion0014.workers.dev/",
  "https://billowing-glitter-4e38.orion0013.workers.dev/",
  "https://curly-glitter-b0c4.orion0016.workers.dev/",
  "https://billowing-hat-4025.orion0015.workers.dev/",
  "https://restless-hill-ae23.orion0017.workers.dev/",
  "https://dark-wave-57fc.orion0018.workers.dev/",
  "https://cold-hat-5c06.orion0020.workers.dev/",
  "https://morning-voice-8620.orion0019.workers.dev/",
  //
  "https://holy-snowflake-2fb4.orion0001.workers.dev/",
  "https://hidden-moon-0989.orion0002.workers.dev/",
  "https://throbbing-pine-dceb.orion0003.workers.dev/",
  "https://gentle-boat-15ec.orion0004.workers.dev/",
  "https://lingering-glade-54f6.orion0005.workers.dev/",
  "https://lively-bush-0572.orion0006.workers.dev/",
  "https://jolly-bread-cd55.orion0007.workers.dev/",
  "https://nameless-paper-1bf8.orion0008.workers.dev/",
  "https://super-hat-bcbd.orion0009.workers.dev/",
  "https://old-fog-35b0.orion00010.workers.dev/",
  //
  "https://curly-field-b7ab.onlinesho1.workers.dev/",
  "https://icy-glade-a2f9.onlineshop2-4fa.workers.dev/",
  "https://misty-smoke-703c.onlineshop3.workers.dev/",
  "https://steep-mode-f072.onlineshop4.workers.dev/",
  "https://damp-tree-2a80.onlineshop5.workers.dev/",
  "https://shy-glade-89f9.onlineshop6.workers.dev/",
  "https://empty-glade-d144.onlineshop7.workers.dev/",
  "https://orange-bush-746c.onlineshop8.workers.dev/",
  "https://blue-morning-b0ed.onlineshop10.workers.dev/",
  "https://cold-block-fb91.onlineshop9.workers.dev/",
  "https://wild-limit-4cdd.onion-468.workers.dev/",
];
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export async function getWorkingProxy(proxies: string[]) {
  const activeProxies = await getActiveProxies(proxies);
  const shuffledProxies = shuffle(activeProxies);
  for (const proxy of shuffledProxies) {
    try {
      const res = await fetchWithTimeout(
        proxy,
        { method: "HEAD", headers: { Range: "bytes=0-1" } },
        3000,
      );
      if (res.status === 429) {
        await blacklistProxy(proxy);
        continue;
      }
      if (res.ok) {
        return proxy;
      }
    } catch (e: any) {
      // console.log(`[PROXY] ✗ ${proxy} | ${e?.message}`);
    }
  }
  return null;
}
const priority = (file: string) => {
  if (file.includes("tripplestream.online")) return 0;
  if (file.includes("/pl/")) return 1;
  if (file.includes("/streamsvr/")) return 2;
  return 3;
};
export async function GET(req: NextRequest) {
  const logRequest = (status: number, reason: string) => {
    const tmdbId = req.nextUrl.searchParams.get(FIELD_MAP.id);
    const mediaType = req.nextUrl.searchParams.get("b");
    const season = req.nextUrl.searchParams.get(FIELD_MAP.season);
    const episode = req.nextUrl.searchParams.get(FIELD_MAP.episode);
    const extra = mediaType === "tv" ? `/${season}/${episode}` : "";

    const ip =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    console.log(
      `[ORION] ${tmdbId}/${mediaType}${extra} | ${status} | ${reason} | IP: ${ip}`,
    );
  };

  try {
    const tmdbId = req.nextUrl.searchParams.get(FIELD_MAP.id);
    const mediaType = req.nextUrl.searchParams.get("b");
    const season = req.nextUrl.searchParams.get(FIELD_MAP.season) ?? "";
    const episode = req.nextUrl.searchParams.get(FIELD_MAP.episode) ?? "";
    const title = req.nextUrl.searchParams.get(FIELD_MAP.title);
    const year = req.nextUrl.searchParams.get(FIELD_MAP.year);
    const ts = Number(req.nextUrl.searchParams.get(FIELD_MAP.ts));
    const token = req.nextUrl.searchParams.get(FIELD_MAP.token)!;
    const f_token = req.nextUrl.searchParams.get(FIELD_MAP.fToken)!;

    if (!tmdbId || !mediaType || !title || !year || !ts || !token) {
      logRequest(404, "missing params");
      return NextResponse.json(
        { success: false, error: "need token" },
        { status: 404 },
      );
    }

    if (Date.now() - ts > 8000) {
      logRequest(403, "token expired");
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 403 },
      );
    }

    if (!validateBackendToken(tmdbId, f_token, ts, token)) {
      logRequest(403, "invalid token");
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 403 },
      );
    }

    const worker = await getWorkingProxy(HOLLY_WORKERS);

    if (!worker) {
      logRequest(502, "no working worker");
      return NextResponse.json(
        { success: false, error: "No available worker" },
        { status: 502 },
      );
    }
    // ─── CACHE CHECK ─────────────────────────────────────────────────────────
    const { data: cached } = await supabase
      .from("holly_movie_cache")
      .select("sources")
      .eq("tmdb_id", Number(tmdbId))
      .eq("media_type", mediaType)
      .eq("season", season)
      .eq("episode", episode)
      .single();

    if (cached?.sources?.length) {
      const encryptedH = await encryptUrl(JSON.stringify(GOOD_HEADERS));

      const links = await Promise.all(
        [...cached.sources]
          .sort((a: any, b: any) => priority(a.file) - priority(b.file))
          .map(async (source: any) => ({
            source: source.file.includes("/pl/")
              ? "pl"
              : source.file.includes("/streamsvr/")
                ? "streamsvr"
                : "default",
            type: source.type === "hls" ? "hls" : "mp4",
            link: `${worker}proxy?data=${encodeURIComponent(await encryptUrl(source.file))}&h=${encodeURIComponent(encryptedH)}`,
          })),
      );
      logRequest(200, "OK!!!!!");
      return NextResponse.json({
        success: true,
        links,
        subtitles: [],
        meow: true,
      });
    }

    // ─── STEP 1: Scrape ──────────────────────────────────────────────────────
    const baseSlug = title
      .toLowerCase()
      .replace(/['''`]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const hollySlug =
      mediaType === "tv" && season && episode
        ? `${baseSlug}-season-${season}-episode-${episode}`
        : `${baseSlug}-${year}`;

    let step1Res = await fetchWithTimeout(
      `${worker}scrape?slug=${encodeURIComponent(hollySlug)}`,
      {},
      15000,
    );

    if (step1Res.status === 429) {
      const remaining = (await getActiveProxies(HOLLY_WORKERS)).filter(
        (w) => w !== worker,
      );
      for (const w of shuffle(remaining)) {
        const res = await fetchWithTimeout(
          `${w}scrape?slug=${encodeURIComponent(hollySlug)}`,
          {},
          15000,
        );
        if (res.status === 429) continue;
        step1Res = res;
        break;
      }
    }

    if (!step1Res.ok) {
      logRequest(502, "step 1 failed");
      return NextResponse.json(
        { success: false, error: "Holly step 1 failed" },
        { status: 502 },
      );
    }

    const step1Data = await step1Res.json();
    const qualities = step1Data.qualities ?? [];

    if (!qualities.length) {
      logRequest(404, "no qualities found");
      return NextResponse.json(
        { success: false, error: "No qualities found" },
        { status: 404 },
      );
    }

    // ─── STEP 2: Resolve embed ────────────────────────────────────────────────
    const bestQuality =
      qualities.find((q: any) => q.quality === "1080p") ??
      qualities.find((q: any) => q.quality === "default") ??
      qualities[0];
    const encryptedH = await encryptUrl(JSON.stringify(GOOD_HEADERS));
    const step2Res = await fetchWithTimeout(
      `${worker}resolve?embed_url=${encodeURIComponent(bestQuality.embed_url)}&h=${encodeURIComponent(encryptedH)}`,
      {},
      15000,
    );

    if (!step2Res.ok) {
      logRequest(502, "step 2 failed");
      return NextResponse.json(
        { success: false, error: "Holly step 2 failed" },
        { status: 502 },
      );
    }

    const step2Data = await step2Res.json();
    const sources = step2Data.sources ?? [];

    if (!sources.length) {
      logRequest(404, "no sources from step 2");
      return NextResponse.json(
        { success: false, error: "No sources from step 2" },
        { status: 404 },
      );
    }

    await supabase.from("holly_movie_cache").upsert(
      {
        tmdb_id: Number(tmdbId),
        media_type: mediaType,
        season,
        episode,
        embeds: qualities,
        sources,
      },
      { onConflict: "tmdb_id,media_type,season,episode" },
    );

    // ─── STEP 3: Build links ──────────────────────────────────────────────────

    const links = await Promise.all(
      [...sources]
        .sort((a: any, b: any) => priority(a.file) - priority(b.file))
        .map(async (source: any) => ({
          source: source.file.includes("/pl/")
            ? "pl"
            : source.file.includes("/streamsvr/")
              ? "streamsvr"
              : "default",
          type: source.type === "hls" ? "hls" : "mp4",
          link: `${worker}proxy?data=${encodeURIComponent(await encryptUrl(source.file))}&h=${encodeURIComponent(encryptedH)}`,
        })),
    );

    logRequest(200, "OK!!!!!");
    return NextResponse.json({ success: true, links, subtitles: [] });
  } catch (err) {
    console.error("Holly route error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
