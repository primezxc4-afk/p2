//ICARUS
function fromBase64Url(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const bin = atob(str);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function getCryptoKey(aesKey) {
  const keyBytes = Uint8Array.from(
    aesKey.match(/.{2}/g).map((b) => parseInt(b, 16)),
  );
  return crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

async function decryptUrl(data, cryptoKey) {
  const bytes = fromBase64Url(data);
  const iv = bytes.slice(0, 12);
  const ciphertext = bytes.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    ciphertext,
  );
  return new TextDecoder().decode(decrypted);
}

function getCorsOrigin(req) {
  const origin = req.headers.get("Origin");
  if (origin) {
    try {
      const hostname = new URL(origin).hostname;
      if (
        hostname.includes("zxcstream") ||
        hostname.includes("zxcprime") ||
        hostname.includes("mnflix")
      )
        return origin;
    } catch {
      return null;
    }
  }
  return null;
}

export default {
  async fetch(req, env) {
    const worker = new URL(req.url);

    if (worker.pathname === "/" && !worker.search) {
      return new Response("OK", { status: 200 });
    }

    const allowedOrigin = getCorsOrigin(req);
    if (req.method === "OPTIONS") {
      if (!allowedOrigin) return new Response("Forbidden", { status: 403 });
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": allowedOrigin,
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Access-Control-Allow-Headers": "Range, Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }
    try {
      const data = worker.searchParams.get("data");
      if (!data) return new Response("Missing data", { status: 400 });

      const cryptoKey = await getCryptoKey(env.AES_KEY);
      let decodedUrl;
      try {
        decodedUrl = await decryptUrl(data, cryptoKey);
      } catch {
        return new Response("Invalid encrypted URL", { status: 403 });
      }

      const ranges = [
        [41, 57],
        [41, 60],
        [41, 72],
        [41, 73],
        [41, 116],
        [41, 138],
        [41, 160],
        [41, 175],
        [41, 188],
        [41, 203],
        [41, 215],
        [41, 222],
        [102, 0],
        [102, 22],
        [102, 68],
        [102, 89],
        [102, 130],
        [102, 164],
        [102, 176],
        [102, 212],
        [105, 16],
        [105, 48],
        [105, 112],
        [105, 160],
        [105, 224],
        [197, 136],
        [197, 148],
        [197, 156],
        [197, 210],
        [197, 232],
        [197, 248],
        [45, 96],
        [45, 100],
        [45, 108],
      ];
      const base = ranges[Math.floor(Math.random() * ranges.length)];
      const rand = () => Math.floor(Math.random() * 254) + 1;
      const randomIP = `${base[0]}.${base[1]}.${rand()}.${rand()}`;
      const headers = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
        Referer: "https://fmoviesunblocked.net/",
        Origin: "https://fmoviesunblocked.net",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.7",
        "Accept-Encoding": "identity;q=1, *;q=0",
        "X-Forwarded-For": randomIP,
        "CF-Connecting-IP": randomIP,
        "X-Real-IP": randomIP,
      };
      const clientRange = req.headers.get("Range");
      if (clientRange) headers["Range"] = clientRange;

      const upstream = await fetch(decodedUrl, {
        method: req.method === "HEAD" ? "HEAD" : "GET",
        headers,
      });

      if (!upstream.ok && upstream.status !== 206) {
        return new Response(null, {
          status: upstream.status,
          headers: {
            ...(allowedOrigin && {
              "Access-Control-Allow-Origin": allowedOrigin,
            }),
            "Cache-Control": "no-store",
          },
        });
      }

      const newHeaders = new Headers(upstream.headers);
      if (allowedOrigin) {
        newHeaders.set("Access-Control-Allow-Origin", allowedOrigin);
        newHeaders.set("Vary", "Origin");
      } else {
        newHeaders.delete("Access-Control-Allow-Origin");
      }
      newHeaders.set("Accept-Ranges", "bytes");
      newHeaders.set(
        "Content-Type",
        upstream.headers.get("content-type") || "video/mp4",
      );
      return new Response(upstream.body, {
        status: upstream.status,
        headers: newHeaders,
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ success: false, error: err.message }),
        { status: 500 },
      );
    }
  },
};
