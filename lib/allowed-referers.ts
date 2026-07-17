const ALLOWED_REFERERS = [
  "http://localhost:3000/",
  "http://192.168.1.5:3000/",
  //
  "https://zxcstream.xyz/",
  "https://www.zxcstream.xyz/",
  //
  "https://zxcprime.xyz/",
  "https://www.zxcprime.xyz/",
  "https://v1.zxcprime.xyz/",
  //
  "https://zxcprime.site/",
  "https://www.zxcprime.site/",
  //

  "https://q.zxcstream.xyz/",
  "https://embed.zxcstream.xyz/",
  "https://cdn.zxcstream.xyz/",
  "https://v1.zxcstream.xyz/",
  "https://v2.zxcstream.xyz/",
  "https://v3.zxcstream.xyz/",
  "https://v4.zxcstream.xyz/",
  "https://v5.zxcstream.xyz/",
  "https://v6.zxcstream.xyz/",
  "https://r1.zxcstream.xyz/",
  "https://r2.zxcstream.xyz/",
  "https://r3.zxcstream.xyz/",
  "https://r4.zxcstream.xyz/",
  "https://r5.zxcstream.xyz/",
  "https://test.zxcstream.xyz/",
  "https://v1-zxcstream-xyz.up.railway.app/",
];

export const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://192.168.1.5:3000",
  //
  "https://zxcstream.xyz",
  "https://www.zxcstream.xyz",
  //
  "https://zxcprime.xyz",
  "https://www.zxcprime.xyz",
  "https://v1.zxcprime.xyz",
  //
  "https://zxcprime.site",
  "https://www.zxcprime.site",
  //

  "https://q.zxcstream.xyz",
  "https://embed.zxcstream.xyz",
  "https://cdn.zxcstream.xyz",
  "https://v1.zxcstream.xyz",
  "https://v2.zxcstream.xyz",
  "https://v3.zxcstream.xyz",
  "https://v4.zxcstream.xyz",
  "https://v5.zxcstream.xyz",
  "https://v6.zxcstream.xyz",
  "https://r1.zxcstream.xyz",
  "https://r2.zxcstream.xyz",
  "https://r3.zxcstream.xyz",
  "https://r4.zxcstream.xyz",
  "https://r5.zxcstream.xyz",
  "https://test.zxcstream.xyz",
  "https://v1-zxcstream-xyz.up.railway.app",
];
export function isValidReferer(referer: string): boolean {
  return ALLOWED_REFERERS.some((allowed) => referer.includes(allowed));
}
