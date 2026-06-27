import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ media_type: string; id: string }> },
) {
  const { media_type, id } = await params;
  const { searchParams } = new URL(req.url);
  const language = searchParams.get("language") || "en-US";

  const url = `https://api.themoviedb.org/3/${media_type}/${id}?api_key=47a1a7df542d3d483227f758a7317dff&language=${encodeURIComponent(language)}&append_to_response=videos,credits,images,external_ids&include_image_language=en,null`;

  const res = await fetch(url, { next: { revalidate: 60 * 60 * 6 } });

  const data = await res.json();

  const filtered = {
    id: data.id,
    title: data.title || data.name,
    overview: data.overview,
    poster_path: data.poster_path,
    backdrop_path: data.backdrop_path,
    release_date: data.release_date || data.first_air_date,
    runtime: data.runtime || data.episode_run_time?.[0],
    rating: data.vote_average,
    genres: data.genres,
    status: data.status,

    // videos: data.videos?.results?.map((v: any) => ({
    //   id: v.id,
    //   key: v.key,
    //   site: v.site,
    //   type: v.type,
    // })),

    trailer:
      data.videos?.results?.find(
        (v: any) =>
          v.site === "YouTube" && v.type === "Trailer" && v.iso_639_1 === "en",
      )?.key ??
      data.videos?.results?.find(
        (v: any) => v.site === "YouTube" && v.iso_639_1 === "en",
      )?.key ??
      data.videos?.results?.[0]?.key ??
      null,

    cast: data.credits?.cast?.slice(0, 5).map((c: any) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      profile_path: c.profile_path,
    })),
    imdb_id: data.external_ids?.imdb_id ?? null,
    country:
      data.production_countries?.[0]?.iso_3166_1 || // movies
      data.origin_country?.[0] || // tv shows
      null,
    original_language: data.original_language,
    images: {
      backdrops: data.images?.backdrops
        ?.filter((f: any) => f.iso_639_1 === "en" || f.iso_639_1 === null)
        .slice(0, 1),

      posters: data.images?.posters
        ?.filter((f: any) => f.iso_639_1 === "en" || f.iso_639_1 === null)
        .slice(0, 1),

      logos: data.images?.logos
        ?.filter((f: any) => f.iso_639_1 === "en" || f.iso_639_1 === null)
        .slice(0, 1),
    },
    seasons:
      media_type === "tv"
        ? (data.seasons
            ?.filter((s: any) => s.season_number > 0) // drop "Specials"
            .map((s: any) => ({
              season_number: s.season_number,
              name: s.name,
              episode_count: s.episode_count,
            })) ?? [])
        : [],
  };

  return NextResponse.json(filtered);
}
