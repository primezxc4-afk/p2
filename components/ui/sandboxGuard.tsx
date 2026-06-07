// components/SandboxGuard.jsx
"use client";

import { useEffect, useState } from "react";

export default function SandboxGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSandboxed, setIsSandboxed] = useState(false);

  useEffect(() => {
    const inIframe = window.self !== window.top;
    if (!inIframe) return;

    try {
      localStorage.setItem("__sb__", "1");
      localStorage.removeItem("__sb__");
    } catch (e) {
      if (e instanceof DOMException && e.name === "SecurityError") {
        setIsSandboxed(true);
      }
    }
  }, []);

  if (isSandboxed) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-8">
        <h1 className="text-2xl font-bold  mb-3">⚠️ Sandbox Detected</h1>
        <p className="text-gray-600 mb-2">
          This page cannot be embedded inside a sandboxed iframe.
        </p>
        <p className="text-gray-600">
          Please remove the{" "}
          <code className=" text-red-500 px-1.5 py-0.5 rounded text-sm font-medium">
            sandbox
          </code>{" "}
          attribute from your iframe, or contact the site owner.
        </p>
      </div>
    );
  }

  return children;
}
