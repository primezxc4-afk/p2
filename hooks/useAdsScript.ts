import { useEffect } from "react";

interface UseAdsScriptProps {
  enabled: boolean;
}
export function useAdsScript({ enabled }: UseAdsScriptProps) {
  useEffect(() => {
    if (!enabled) return;

    const host = window.location.hostname;

    let script: HTMLScriptElement | null = null;

    if (
      host === "zxcstream.xyz" ||
      host.endsWith(".zxcstream.xyz") ||
      (host.endsWith(".up.railway.app") && host.includes("zxcstream-xyz"))
    ) {
      // script = document.createElement("script");
      // script.src =
      //   "https://injusticebakery.com/5c/15/e7/5c15e7185944758aafe9b32aa87f5279.js";
      script = document.createElement("script");
      script.src = "//fp.caligoatabals.com/rN5gaF9kjWFkD7SVQ/146575";
      script.setAttribute("data-cfasync", "false");
    } else if (host === "zxcprime.xyz" || host.endsWith(".zxcprime.xyz")) {
      script = document.createElement("script");
      script.src =
        "https://injusticebakery.com/13/0a/d5/130ad559daaa237711442437661b86a6.js";
    }

    if (!script) return;

    script.async = true;
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, [enabled]);
}
