import { initialServers } from "@/lib/server-list";
import { ServerTypes } from "@/types/player-types";
import { useState } from "react";

export function usePlayerServers({
  defaultServerIndex,
}: {
  defaultServerIndex: number;
}) {
  const [servers, setServers] = useState<ServerTypes[]>(initialServers);
  const [serverIndex, setServerIndex] = useState(defaultServerIndex);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [allFailed, setAllFailed] = useState(false);
  function handleManualSelect(i: number) {
    if (i === playingIndex) return;
    setAllFailed(false);
    // if leaving a connected server, clear playingIndex
    if (playingIndex === serverIndex) setPlayingIndex(null);

    setServers((prev) =>
      prev.map((s, idx) => {
        if (idx === serverIndex && s.status === "connecting") {
          return { ...s, status: "available" };
        }

        if (idx === i) {
          if (s.status === "queue") return { ...s, status: "checking" };
          if (s.status === "failed") return { ...s, status: "checking" };
          if (s.status === "available") return { ...s, status: "connecting" };
          // if (s.status === "queue") return { ...s, status: "connecting" };
        }

        return s;
      }),
    );
    setServerIndex(i);
  }

  function handleServerFail() {
    setServers((prev) => {
      const find = (status: string) =>
        prev.findIndex((s, i) => i !== serverIndex && s.status === status);

      const next =
        find("available") !== -1
          ? find("available")
          : find("queue") !== -1
            ? find("queue")
            : -1;

      // ✅ All servers exhausted — mark current as failed, don't update index
      if (next === -1) {
        setAllFailed(true);
        return prev.map((s, i) =>
          i === serverIndex ? { ...s, status: "failed" } : s,
        );
      }

      setServerIndex(next);
      return prev.map((s, i) =>
        i === serverIndex ? { ...s, status: "failed" } : s,
      );
    });
  }
  function handleCanPlay() {
    setServers((prev) =>
      prev.map((s, i) =>
        i === serverIndex ? { ...s, status: "available" } : s,
      ),
    );
    setPlayingIndex(serverIndex);
  }

  function handleMarkConnecting() {
    setServers((prev) =>
      prev.map((s, i) =>
        i === serverIndex ? { ...s, status: "connecting" } : s,
      ),
    );
  }
  function handleMarkChecking() {
    setServers((prev) =>
      prev.map((s, i) =>
        i === serverIndex && s.status === "queue"
          ? { ...s, status: "checking" }
          : s,
      ),
    );
  }

  function handleMarkDub() {
    
    setServers((prev) =>
      prev.map((s, i) =>
        i === serverIndex && s.status === "available"
          ? { ...s, status: "checking" }
          : s,
      ),
    );

    setPlayingIndex(null);
  }
  function handleMarkQueue() {
    setServers((prev) =>
      prev.map((s, i) =>
        i === serverIndex && s.status === "checking"
          ? { ...s, status: "queue" }
          : s,
      ),
    );
  }

  function handleQualityChange() {
    setServers((prev) =>
      prev.map((s, i) =>
        i === serverIndex ? { ...s, status: "connecting" } : s,
      ),
    );
    setPlayingIndex(null); // 👈 also clear playingIndex so it's not "Connected"
  }
  function handleResetServers() {
    setAllFailed(false);
    setPlayingIndex(null);
    setServerIndex(0);
    setServers(initialServers);
  }
  return {
    handleCanPlay,
    handleManualSelect,
    handleServerFail,
    serverIndex,
    servers,
    setServers,
    playingIndex,
    handleMarkConnecting,
    handleMarkChecking,
    handleQualityChange,
    handleMarkQueue,
    allFailed,
    handleResetServers,
    handleMarkDub,
  };
}
