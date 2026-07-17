"use client";

import { useEffect, useState } from "react";

export function useSandboxDetection() {
  const [isSandboxed, setIsSandboxed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (window.self === window.top) {
      setIsLoading(false);
      return;
    }

    try {
      document.domain = document.domain;
    } catch (err) {
      if (err instanceof DOMException && err.name === "SecurityError") {
        setIsSandboxed(true);
      }
    }

    setIsLoading(false);
  }, []);

  return {
    isSandboxed,
    isLoading,
  };
}
