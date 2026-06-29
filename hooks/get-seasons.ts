import { SeasonTypes } from "@/types/types";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export function useTvSeason({
  tmdbId,
  season_number,
  media_type,
}: {
  tmdbId: string;
  season_number?: number;
  media_type: string;
}) {
  return useQuery<SeasonTypes>({
    queryKey: ["tv-season", tmdbId, season_number],
    enabled: media_type === "tv" && season_number !== undefined,
    queryFn: async () => {
      const { data } = await axios.get(
        `/backend/tmdb/season/${tmdbId}/season/${season_number}`,
      );
      return data;
    },
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
