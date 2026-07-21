import { NextRequest, NextResponse } from "next/server";
import { validateBackendToken } from "@/lib/validate-token";
import { isValidReferer } from "@/lib/allowed-referers";
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

// ==================== AUTH ====================
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
    if (!xuser) throw new Error("Failed to get server JWT");

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

  let res = await fetch(url, {
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

// ==================== CORE ====================
function cleanTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/\s*\[.*?\]\s*/g, "")
    .replace(/\s*\(.*?\)\s*/g, "")
    .replace(/[^\w\s]/g, "")
    .trim();
}

async function fetchSubjectQualities(
  subjectId: string,
  baseQuery: Record<string, string> = {},
) {
  const params = {
    all: "0",
    page: "1",
    perPage: "10",
    ...baseQuery,
    subjectId,
  };
  const qs = new URLSearchParams(params).toString();

  const res = await gatewayRequest(
    "GET",
    `https://api6.aoneroom.com/wefeed-mobile-bff/subject-api/resource?${qs}`,
  );
  const items = res?.data?.list || res?.data || [];

  return items
    .filter((item: any) => item.url || item.resourceLink || item.link)
    .map((item: any) => ({
      resolution: String(item.resolution || "1080"),
      url: item.url || item.resourceLink || item.link,
      size: Number(item.size) || 0,
      format: "mp4",
      type: (item.url || "").includes(".m3u8") ? "hls" : "mp4",
    }))
    .sort((a: any, b: any) => parseInt(b.resolution) - parseInt(a.resolution));
}

async function fetchSubtitles(subjectId: string, qualityId: string) {
  try {
    const url = `https://h5-api.aoneroom.com/wefeed-h5api-bff/subject/caption?format=MP4&id=${encodeURIComponent(qualityId)}&subjectId=${encodeURIComponent(subjectId)}`;
    const res = await fetch(url, {
      headers: { accept: "application/json", "user-agent": "Mozilla/5.0" },
    });
    const data = await res.json();
    return (data?.data?.list || data?.data?.captions || [])
      .map((sub: any) => ({
        url: sub.url || sub.link,
        language: sub.lang || sub.language || "en",
        label: sub.label || sub.display || "Subtitle",
      }))
      .filter((s: any) => s.url);
  } catch {
    return [];
  }
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

// ==================== MAIN ROUTE ====================
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const tmdbId = sp.get(FIELD_MAP.id);
  const mediaType = sp.get("b");
  const title = sp.get(FIELD_MAP.title);
  const date = sp.get("date");
  const ts = Number(sp.get(FIELD_MAP.ts));
  const token = sp.get(FIELD_MAP.token);
  const f_token = sp.get(FIELD_MAP.fToken);
  const season = sp.get(FIELD_MAP.season);
  const episode = sp.get(FIELD_MAP.episode);

  if (!tmdbId || !mediaType || !title || !ts || !token) {
    return NextResponse.json(
      { success: false, error: "Missing parameters" },
      { status: 400 },
    );
  }

  if (
    Date.now() - ts > 30000 ||
    !validateBackendToken(tmdbId, f_token!, ts, token)
  ) {
    return NextResponse.json(
      { success: false, error: "Invalid token" },
      { status: 403 },
    );
  }

  if (!isValidReferer(req.headers.get("referer") || "")) {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 },
    );
  }

  try {
    const year = date ? new Date(date).getFullYear().toString() : null;
    const keyword = `${title} ${year || ""}`.trim();

    const search = await gatewaySearch(keyword);
    if (search?.code !== 0 || !search?.data?.results?.length) {
      return NextResponse.json(
        { success: false, error: "No search results" },
        { status: 404 },
      );
    }

    const subjects = search.data.results.flatMap((r: any) => r.subjects || []);
    const filtered = subjects.filter(
      (s: any) => s.subjectType === (mediaType === "movie" ? 1 : 2),
    );

    const ct = cleanTitle(title);
    const primary =
      filtered.find((s: any) => {
        const st = cleanTitle(s.title || "");
        const sy = (s.releaseDate || "").split("-")[0];
        return (st.includes(ct) || ct.includes(st)) && (!year || sy === year);
      }) || filtered[0];

    if (!primary) {
      return NextResponse.json(
        { success: false, error: "No matching content" },
        { status: 404 },
      );
    }

    const baseQuery: Record<string, string> =
      mediaType === "tv"
        ? { se: (season || "1").toString(), ep: (episode || "1").toString() }
        : {};

    const qualities = await fetchSubjectQualities(primary.subjectId, baseQuery);
    const subtitles = qualities.length
      ? await fetchSubtitles(primary.subjectId, qualities[0].resolution)
      : [];

    return NextResponse.json({
      success: true,
      title: primary.title,
      subjectId: primary.subjectId,
      links: qualities,
      subtitles,
      dubs: [],
      active: { langCode: "orig", langName: "Original" },
    });
  } catch (err: any) {
    console.error("[Resshin Error]", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
