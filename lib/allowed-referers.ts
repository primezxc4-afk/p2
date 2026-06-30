const ALLOWED_REFERERS = [
  // "http://localhost:3000/",
  "https://zxcprime.site/",
  "https://www.zxcprime.site/",
  "https://zxcstream.xyz/",
  "https://v.zxcstream.xyz/",
  "https://z.zxcstream.xyz/",
  "https://a.zxcstream.xyz/",
  "https://embed.zxcstream.xyz/",
  "https://cdn.zxcstream.xyz/",
  "https://www.zxcstream.xyz/",
  "https://v-production-ea9a.up.railway.app/",
  "https://v-zxcstream-xyz.up.railway.app/",
  "https://z-zxcstream-xyz.up.railway.app/",
  "https://x-zxcstream-xyz.up.railway.app/",
  "http://192.168.1.5:3000/",
];

export const ALLOWED_ORIGINS = [
  // "http://localhost:3000",
  "https://zxcprime.site",
  "https://www.zxcprime.site",
  "https://zxcstream.xyz",
  "https://www.zxcstream.xyz",
  "https://v.zxcstream.xyz",
  "https://z.zxcstream.xyz",
  "https://a.zxcstream.xyz",
  "https://embed.zxcstream.xyz",
  "https://cdn.zxcstream.xyz",
  "https://v-production-ea9a.up.railway.app",
  "https://v-zxcstream-xyz.up.railway.app",
  "https://z-zxcstream-xyz.up.railway.app",
  "https://x-zxcstream-xyz.up.railway.app",
  "http://192.168.1.5:3000",
];
export function isValidReferer(referer: string): boolean {
  return ALLOWED_REFERERS.some((allowed) => referer.includes(allowed));
}
