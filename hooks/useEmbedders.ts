"use client";

import axios from "axios";
import { useQuery } from "@tanstack/react-query";

export interface Embedder {
  id: number;
  embed: string;
  embedder: string;
  sandbox: boolean;

  load_count: number;
  load_today: number;
  last_load_date: string;

  last_seen: string;
  created_at: string;

  status: "Active" | "Inactive";
}

interface EmbeddersResponse {
  success: boolean;
  embedders: Embedder[];
}

export function useEmbedders(enabled = true) {
  return useQuery<EmbeddersResponse>({
    queryKey: ["embedders"],
    enabled,

    queryFn: async () => {
      const res = await axios.get<EmbeddersResponse>("/backend/cdn-cgi");

      return res.data;
    },

    retry: false,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
