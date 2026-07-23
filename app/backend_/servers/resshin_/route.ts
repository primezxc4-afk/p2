//RESSHIN SERVER
import { NextRequest, NextResponse } from "next/server";
import { validateBackendToken } from "@/lib/validate-token";
import { FIELD_MAP } from "@/lib/token";
import crypto from "node:crypto";

// ==================== CONFIG ====================
const GATEWAY_SECRET = "76iRl07s0xSN9jqmEWAt79EBJZulIQIsV64FZr2O";
const BOTTOM_TAB_URL =
  "https://api3.aoneroom.com/wefeed-mobile-bff/subject-api/bottom-tab";
const BOTTOM_TAB_CLIENT_TOKEN =
  "1782204604620,cea850d15d46b9b316c073ba0ad05f2f";

let cachedServerJwt: string | null = null;
let cachedServerJwtPromise: Promise<string> | null = null;
let cachedDevice = { deviceId: "", gaid: "", timestamp: 0 };

// ==================== HELPERS ====================
function getDeviceCredentials() {
  const now = Date.now();
  if (!cachedDevice.deviceId || now - cachedDevice.timestamp > 43200000) {
    cachedDevice = {
      deviceId: crypto.randomBytes(16).toString("hex"),
      gaid: [
        crypto.randomBytes(4).toString("hex"),
        crypto.randomBytes(2).toString("hex"),
        crypto.randomBytes(2).toString("hex"),
        crypto.randomBytes(2).toString("hex"),
        crypto.randomBytes(6).toString("hex"),
      ].join("-"),
      timestamp: now,
    };
  }
  return cachedDevice;
}

function normalizeQuery(qs: string): string {
  if (!qs) return "";
  const pairs: [string, string][] = [];
  for (const pair of qs.split("&")) {
    if (!pair) continue;
    const idx = pair.indexOf("=");
    const key = idx === -1 ? pair : pair.slice(0, idx);
    const val = idx === -1 ? "" : pair.slice(idx + 1);
    try {
      pairs.push([decodeURIComponent(key), decodeURIComponent(val)]);
    } catch {
      pairs.push([key, val]);
    }
  }
  pairs.sort((a, b) => a[0].localeCompare(b[0]));
  return pairs.map(([k, v]) => `${k}=${v}`).join("&");
}

function bodyMd5(body: string): string {
  if (!body) return "";
  const buf = Buffer.from(body, "utf8");
  const chunk = buf.length > 102400 ? buf.subarray(0, 102400) : buf;
  return crypto.createHash("md5").update(chunk).digest("hex");
}

function buildCanonical(
  method: string,
  headers: Record<string, string>,
  body: string,
  fullUrl: string,
  ts: number,
): string {
  const u = new URL(fullUrl);
  const accept = headers["accept"] ?? "";
  const contentType = headers["content-type"] ?? "";
  let contentLength = headers["content-length"] ?? "";
  if (!contentLength && body)
    contentLength = String(Buffer.byteLength(body, "utf8"));
  if (method.toUpperCase() === "GET" && !body) contentLength = "";
  const md5 = bodyMd5(body);
  const normalizedQuery = normalizeQuery(u.search.replace(/^\?/, ""));
  const pathUrl = u.pathname + (normalizedQuery ? `?${normalizedQuery}` : "");
  return [
    method.toUpperCase(),
    accept,
    contentType,
    contentLength,
    String(ts),
    md5,
    pathUrl,
  ].join("\n");
}

function sign(secretB64: string, canonical: string): string {
  const key =
    /^[A-Za-z0-9+/=]+$/.test(secretB64) && secretB64.length % 4 === 0
      ? Buffer.from(secretB64, "base64")
      : Buffer.from(secretB64, "utf8");
  const h = crypto.createHmac("md5", key);
  h.update(canonical, "utf8");
  return h.digest("base64");
}

function makeXTr(
  method: string,
  url: string,
  headers: Record<string, string>,
  body: string,
): string {
  const ts = Date.now();
  const canonical = buildCanonical(method, headers, body, url, ts);
  return `${ts}|2|${sign(GATEWAY_SECRET, canonical)}`;
}

async function getServerJwt(): Promise<string> {
  if (cachedServerJwt) return cachedServerJwt;
  if (cachedServerJwtPromise) return cachedServerJwtPromise;

  cachedServerJwtPromise = (async () => {
    const device = getDeviceCredentials();
    const headers: Record<string, string> = {
      accept: "*/*",
      "accept-encoding": "gzip, deflate, br",
      connection: "keep-alive",
      host: "api3.aoneroom.com",
      "user-agent":
        "com.community.mbox.in.geobypass/51042203 (Linux; U; Android 7.1.2; en_US; SM-G955N; Build/NRD90M.G955NKSU1AQDC; Cronet/104.0.5112.46)",
      "x-client-info": JSON.stringify({
        package_name: "com.community.mbox.in.geobypass",
        version_name: "3.0.14.0422.03",
        version_code: 51042203,
        os: "android",
        os_version: "7.1.2",
        device_id: device.deviceId,
        gaid: device.gaid,
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
      "x-client-token": BOTTOM_TAB_CLIENT_TOKEN,
      "x-family-mode": "0",
      "x-play-mode": "2",
    };

    headers["x-tr-signature"] = makeXTr("GET", BOTTOM_TAB_URL, headers, "");
    headers["x-tr-signature-method"] = "HmacMD5";

    const res = await fetch(BOTTOM_TAB_URL, { method: "GET", headers });
    const xuser = res.headers.get("x-user") || res.headers.get("X-User");
    if (!xuser) throw new Error("Failed to get JWT");

    let token = xuser;
    try {
      const parsed = JSON.parse(xuser);
      if (parsed?.token) token = parsed.token;
    } catch {}
    cachedServerJwt = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
    return cachedServerJwt;
  })();

  return cachedServerJwtPromise;
}

async function gatewayRequest(
  method: string,
  url: string,
  opts: { headers?: Record<string, string>; body?: string } = {},
) {
  const authToken = await getServerJwt();
  const headers: Record<string, string> = {
    accept: "*/*",
    authorization: authToken,
    "accept-encoding": "gzip, deflate, br",
    "user-agent":
      "com.community.mbox.in.geobypass/51042203 (Linux; U; Android 7.1.2; en_US; SM-G955N; Build/NRD90M.G955NKSU1AQDC; Cronet/104.0.5112.46)",
    "x-client-info": JSON.stringify({
      ...getDeviceCredentials(),
      timezone: "Africa/Brazzaville",
    }),
    ...opts.headers,
  };

  headers["x-tr-signature"] = makeXTr(method, url, headers, opts.body ?? "");
  headers["x-tr-signature-method"] = "HmacMD5";

  const res = await fetch(url, {
    method,
    headers,
    body: method === "POST" ? opts.body : undefined,
  });

  if (res.status === 401 || res.status === 403) {
    cachedServerJwt = null;
    return gatewayRequest(method, url, opts);
  }

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { code: -1, raw: text };
  }
}

function cleanTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/\s*\[.*?\]\s*/g, "")
    .replace(/\s*\(.*?\)\s*/g, "")
    .replace(/[^\w\s]/g, "")
    .trim();
}

async function gatewaySearch(keyword: string) {
  return gatewayRequest(
    "POST",
    "https://api6.aoneroom.com/wefeed-mobile-bff/subject-api/search/v2",
    {
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ keyword, page: 1, perPage: 20 }),
    },
  );
}

async function gatewayGetSubject(subjectId: string) {
  return gatewayRequest(
    "GET",
    `https://api6.aoneroom.com/wefeed-mobile-bff/subject-api/get?subjectId=${encodeURIComponent(subjectId)}`,
  );
}

async function gatewayGetResource(
  subjectId: string,
  query: Record<string, string> = {},
) {
  const params = {
    ...query,
    all: query.all ?? "0",
    page: query.page ?? "1",
    perPage: query.perPage ?? "5",
    subjectId,
  };
  const qs = new URLSearchParams(params).toString();
  return gatewayRequest(
    "GET",
    `https://api6.aoneroom.com/wefeed-mobile-bff/subject-api/resource?${qs}`,
  );
}

function defaultString(value: unknown, fallback: string): string {
  const str = String(value ?? "").trim();
  return str || fallback;
}

function extractQualities(list: any[]): any[] {
  const groups = new Map();
  for (const item of list ?? []) {
    if (!item || typeof item !== "object") continue;
    const url = item.url || item.resourceLink || item.link;
    if (!url) continue;
    const resolution = String(item.resolution || "1080");
    const quality = {
      resolution,
      url,
      size: Number(item.size) || 0,
      format: "mp4",
    };
    const key = resolution;
    const existing = groups.get(key);
    if (!existing || quality.size > existing.size) {
      groups.set(key, quality);
    }
  }
  return Array.from(groups.values()).sort(
    (a, b) => parseInt(b.resolution) - parseInt(a.resolution),
  );
}

async function fetchSubjectQualities(
  subject: any,
  baseQuery: Record<string, string> = {},
) {
  const allItems: any[] = [];

  // Default request
  const first = await gatewayGetResource(subject.subjectId, baseQuery);
  allItems.push(...(first?.data?.list ?? []));

  // Query each resolution
  for (const resolution of ["360", "480", "720", "1080"]) {
    const res = await gatewayGetResource(subject.subjectId, {
      ...baseQuery,
      resolution,
    });

    if (res?.code === 0) {
      allItems.push(...(res?.data?.list ?? []));
    }
  }

  return extractQualities(allItems);
}

// ==================== MAIN ROUTE ====================
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
      `[RESSHIN] ${tmdbId}/${mediaType}${extra} | ${status} | ${reason} | IP: ${ip}`,
    );
  };

  try {
    const tmdbId = req.nextUrl.searchParams.get(FIELD_MAP.id);
    const mediaType = req.nextUrl.searchParams.get("b");
    const season = req.nextUrl.searchParams.get(FIELD_MAP.season);
    const episode = req.nextUrl.searchParams.get(FIELD_MAP.episode);
    const title = req.nextUrl.searchParams.get(FIELD_MAP.title);
    const date = req.nextUrl.searchParams.get("date");
    const ts = Number(req.nextUrl.searchParams.get(FIELD_MAP.ts));
    const token = req.nextUrl.searchParams.get(FIELD_MAP.token)!;
    const f_token = req.nextUrl.searchParams.get(FIELD_MAP.fToken)!;
    const dubCode = req.nextUrl.searchParams.get("dubCode");
    const dubType = Number(req.nextUrl.searchParams.get("dubType") ?? "0");

    if (!tmdbId || !mediaType || !title || !date || !ts || !token) {
      logRequest(404, "missing params");
      return NextResponse.json(
        { success: false, error: "missing params" },
        { status: 404 },
      );
    }

    if (
      Date.now() - ts > 30000 ||
      !validateBackendToken(tmdbId, f_token, ts, token)
    ) {
      logRequest(403, "invalid token");
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 403 },
      );
    }

    const year = date ? new Date(date).getFullYear().toString() : null;
    const keyword = `${title} ${year || ""}`.trim();

    const search = await gatewaySearch(keyword);
    if (search?.code !== 0) {
      logRequest(404, "no search results");
      return NextResponse.json(
        { success: false, error: "No search results" },
        { status: 404 },
      );
    }

    const subjects = (search.data?.results || []).flatMap(
      (r: any) => r.subjects || [],
    );
    const filtered = subjects.filter(
      (s: any) => s.subjectType === (mediaType === "movie" ? 1 : 2),
    );

    if (!filtered.length) {
      logRequest(404, "no matching content");
      return NextResponse.json(
        { success: false, error: "No matching content" },
        { status: 404 },
      );
    }

    const ct = cleanTitle(title);
    const matches = filtered.filter((s: any) => {
      const st = cleanTitle(s.title ?? "");
      const sy = (s.releaseDate ?? "").split("-")[0];
      const tm = st.includes(ct) || ct.includes(st);
      const ym = !year || !sy || year === sy;
      return tm && ym;
    });

    const primary = matches[0] || filtered[0];
    const subjectDetails = await gatewayGetSubject(primary.subjectId);

    let dubs = subjectDetails?.data?.dubs ?? [];

    if (!dubs.length) {
      dubs = [
        {
          subjectId: primary.subjectId,
          lanCode: "orig",
          lanName: "Original Audio",
          original: true,
          type: 0,
        },
      ];
    }
    const original =
      dubs.find((d: any) => d.original) ??
      dubs.find((d: any) => d.lanCode === "en") ??
      dubs[0];

    let activeDub = original;

    if (dubCode) {
      const found = dubs.find(
        (d: any) => d.lanCode === dubCode && Number(d.type ?? 0) === dubType,
      );

      if (found) {
        activeDub = found;
      }
    }
    const baseQuery: Record<string, string> =
      mediaType === "tv"
        ? {
            all: "0",
            page: "1",
            perPage: "5",
            se: String(season || 1),
            ep: String(episode || 1),
            epFrom: String(episode || 1),
            epTo: String(episode || 1),
            startPosition: String(episode || 1),
            endPosition: String(episode || 1),
            pagerMode: "2",
          }
        : {};

    let qualities = await fetchSubjectQualities(
      {
        subjectId: activeDub.subjectId,
      },
      baseQuery,
    );
    let fallback = false;

    if (!qualities.length && activeDub.subjectId !== original.subjectId) {
      fallback = true;

      activeDub = original;

      qualities = await fetchSubjectQualities(
        {
          subjectId: original.subjectId,
        },
        baseQuery,
      );
    }
    logRequest(200, "OK");
    return NextResponse.json({
      success: true,
      links: qualities.map((q: any) => ({
        resolution: q.resolution,
        format: q.format,
        size: q.size,
        type: q.url.includes(".m3u8") ? "hls" : "mp4",
        link: "",
      })),
      subtitles: [],
      dubs: dubs.map((d: any) => ({
        lang: d.lanCode,
        type: d.type,
        name:
          d.type === 1
            ? d.lanName
                .replace(/\b(dub|audio)\b/gi, "")
                .trim()
                .replace(/sub$/i, "")
                .trim() + " (Subtitle)"
            : d.lanName.replace(/\b(dub|audio|sub)\b/gi, "").trim(),
        original: d.original,
      })),
      active: {
        langCode: activeDub.lanCode,
        langType: activeDub.type,
        langName: activeDub.lanName,
      },
      fallback,
    });
  } catch (err: any) {
    logRequest(500, err.message);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
