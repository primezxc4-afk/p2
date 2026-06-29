import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
      season: string;
    }>;
  },
) {
  const { id, season } = await params;

  const { searchParams } = new URL(req.url);
  const language = searchParams.get("language") || "en-US";

  const url = `https://api.themoviedb.org/3/tv/${id}/season/${season}?api_key=47a1a7df542d3d483227f758a7317dff&language=${encodeURIComponent(language)}`;

  const res = await fetch(url, {
    next: {
      revalidate: 60 * 60 * 24,
    },
  });

  if (!res.ok) {
    return NextResponse.json(
      { message: "Failed to fetch season" },
      { status: res.status },
    );
  }

  const data = await res.json();

  return NextResponse.json({
    id: data.id,
    season_number: data.season_number,
    name: data.name,
    overview: data.overview,
    air_date: data.air_date,
    poster_path: data.poster_path,
    episodes:
      data.episodes?.map((episode: any) => ({
        id: episode.id,
        episode_number: episode.episode_number,
        season_number: episode.season_number,
        name: episode.name,
        overview: episode.overview,
        runtime: episode.runtime,
        still_path: episode.still_path,
        air_date: episode.air_date,
        vote_average: episode.vote_average,
      })) ?? [],
  });
}
