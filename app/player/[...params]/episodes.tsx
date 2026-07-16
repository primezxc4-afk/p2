import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Swiper, SwiperSlide } from "swiper/react";
import { Keyboard, Mousewheel } from "swiper/modules";
import "swiper/css";
import { useTvSeason } from "@/hooks/get-seasons";
import { cn } from "@/lib/utils";
import type { Swiper as SwiperInstance } from "swiper";
import { SeasonsType } from "@/hooks/tmdb-types";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { VideoOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
export default function Episodes({
  tmdbId,
  season,
  episode,
  lockTimer,
  resetTimer,
  seasons,
  open,
  setOpen,
  selectSeason,
  color,
}: {
  tmdbId: string;
  season: number;
  episode: number;
  lockTimer: () => void;
  resetTimer: () => void;
  seasons: SeasonsType[];
  open: boolean;
  setOpen: (open: boolean) => void;
  selectSeason: number;
  color: string;
}) {
  const searchParams = useSearchParams();
  const [visualIndex, setVisualIndex] = useState(0);
  const swiperRef = useRef<SwiperInstance | null>(null);
  const [loadedImages, setLoadedImages] = useState<Record<number, boolean>>({});
  const { data, isLoading } = useTvSeason({
    tmdbId,
    season_number: selectSeason,
    media_type: "tv",
    enable: open,
  });

  const closeDrawer = () => {
    setOpen(false);
    resetTimer();
  };

  // Default to the currently playing episode if we're on the currently
  // playing season, otherwise the first episode.
  const defaultIndex =
    selectSeason === season
      ? Math.max(
          0,
          data?.episodes.findIndex((e) => e.episode_number === episode) ?? 0,
        )
      : 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0  bg-linear-to-l from-black/80 via-transparent to-transparent pointer-events-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeDrawer}
          />

          <motion.div
            className={cn(
              "fixed top-0 bottom-0 right-0  lg:px-12 px-4 py-4",
              "space-y-3",
            )}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 45, stiffness: 420 }}
          >
            <Swiper
              key={selectSeason}
              modules={[Mousewheel, Keyboard]}
              direction="vertical"
              slidesPerView="auto"
              centeredSlides
              initialSlide={defaultIndex}
              mousewheel={{
                sensitivity: 1,
                thresholdDelta: 10,
                forceToAxis: true,
              }}
              onSwiper={(swiper) => {
                swiperRef.current = swiper;
                setVisualIndex(swiper.activeIndex);
              }}
              onSlideChange={(swiper) => {
                setVisualIndex(swiper.activeIndex);
              }}
              keyboard={{ enabled: true, onlyInViewport: true }}
              className="absolute h-full overflow-visible! pointer-events-auto"
              style={
                {
                  "--swiper-wrapper-transition-timing-function":
                    "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                } as React.CSSProperties
              }
            >
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => {
                  const distance = i - visualIndex;

                  const isActive = distance === 0;
                  const isPrev = distance === -1;
                  const isNext = distance === 1;
                  const isPrev2 = distance === -2;
                  const isNext2 = distance === 2;

                  return (
                    <SwiperSlide
                      key={`skeleton-${i}`}
                      className={cn(
                        "relative w-auto! h-auto!",
                        isActive && "z-30",
                        (isPrev || isNext) && "z-20",
                        (isPrev2 || isNext2) && "z-10",
                        Math.abs(distance) > 2 && "z-0",
                      )}
                    >
                      <div
                        className={cn(
                          "transition-all duration-300 aspect-video lg:w-md md:w-sm w-60 rounded-lg overflow-hidden backdrop-blur-2xl",
                          isActive && "scale-100",
                          isPrev &&
                            "md:translate-y-20 translate-y-10 translate-x-5 scale-85",
                          isNext &&
                            "md:-translate-y-20 -translate-y-10 translate-x-5 scale-85",
                          isPrev2 &&
                            "md:translate-y-40 translate-y-20 translate-x-10 scale-80",
                          isNext2 &&
                            "md:-translate-y-40 -translate-y-20 translate-x-10 scale-80",
                          Math.abs(distance) > 2 && "scale-70",
                        )}
                      >
                        <Skeleton className="h-full w-full" />
                      </div>
                    </SwiperSlide>
                  );
                })
              ) : data?.episodes.length === 0 ? (
                <SwiperSlide className="w-auto! h-auto!">
                  <div className="aspect-video lg:w-md md:w-sm w-60 rounded-lg overflow-hidden bg-background border border-white/10 flex flex-col items-center justify-center text-center p-6">
                    <div className="flex items-center justify-center size-14 rounded-full bg-white/5 mb-4">
                      <VideoOff className="size-7 text-white/40" />
                    </div>

                    <h2 className="text-lg font-semibold text-white">
                      No Episodes Found
                    </h2>

                    <p className="mt-2 text-sm text-white/50 max-w-xs">
                      This season doesn't have any available episodes yet.
                    </p>
                  </div>
                </SwiperSlide>
              ) : (
                data?.episodes.map((e, i) => {
                  const distance = i - visualIndex;

                  const isActive = distance === 0;
                  const isPrev = distance === -1;
                  const isNext = distance === 1;
                  const isPrev2 = distance === -2;
                  const isNext2 = distance === 2;

                  return (
                    <SwiperSlide
                      key={e.id}
                      className={cn(
                        " w-auto! h-auto!",
                        isActive && "z-3",
                        isPrev && "z-2",
                        isNext && "z-2",
                        isPrev2 && "z-1",
                        isNext2 && "z-1",
                        Math.abs(distance) > 2 && "z-0",
                      )}
                      onClick={() => swiperRef.current?.slideTo(i)}
                    >
                      <Link
                        href={`/player/tv/${tmdbId}/${selectSeason}/${e.episode_number}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}
                        replace
                        onClick={closeDrawer}
                        className="group"
                      >
                        <div
                          className={cn(
                            " transition-all duration-300  aspect-video lg:w-md md:w-sm w-60 rounded-lg overflow-hidden drop-shadow-2xl bg-background",
                            isActive && "scale-100 md:border-3 border-2  ",
                            isPrev &&
                              "md:translate-y-20 translate-y-10 translate-x-5 scale-85 brightness-40 ",
                            isNext &&
                              "md:-translate-y-20 -translate-y-10 translate-x-5 scale-85 brightness-40 ",
                            isPrev2 &&
                              "md:translate-y-40 scale-80 translate-y-20 brightness-20 translate-x-10 ",
                            isNext2 &&
                              "md:-translate-y-40 -translate-y-20 scale-80 brightness-20 translate-x-10",
                            Math.abs(distance) > 2 && " scale-70 brightness-20",
                          )}
                          style={
                            isActive
                              ? {
                                  borderColor: `#${color}`,
                                }
                              : undefined
                          }
                        >
                          {e.still_path ? (
                            <img
                              src={`https://image.tmdb.org/t/p/w500${e.still_path}`}
                              alt={e.name}
                              loading="lazy"
                              className={cn(
                                "w-full h-full object-cover",
                                "transition-all duration-500 group-hover:brightness-75 opacity-100",
                                loadedImages[e.id]
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                              onLoad={() =>
                                setLoadedImages((prev) => ({
                                  ...prev,
                                  [e.id]: true,
                                }))
                              }
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-neutral-900">
                              <span className="text-5xl font-black text-neutral-800">
                                {e.episode_number}
                              </span>
                            </div>
                          )}
                          <div
                            className={cn(
                              "absolute inset-0  z-40 flex justify-start items-end p-3 ",
                              isActive
                                ? "bg-linear-to-tr from-black to-transparent"
                                : "",
                            )}
                          >
                            <div>
                              <h1 className="font-semibold md:text-lg text-sm">
                                {e.episode_number}. {e.name}
                              </h1>
                              <div className="flex items-center gap-2 mt-05 text-gray-300 text-xs md:text-sm font-medium">
                                {e.runtime && (
                                  <span className="">{e.runtime} min</span>
                                )}
                                {e.runtime && e.air_date && (
                                  <span className="">·</span>
                                )}
                                {e.air_date && (
                                  <span className="">
                                    {new Date(e.air_date).toLocaleDateString(
                                      "en-US",
                                      {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      },
                                    )}
                                  </span>
                                )}
                              </div>
                              {isActive && (
                                <p className="text-sm lg:line-clamp-3 md:line-clamp-2 hidden  text-gray-300 mt-2 ">
                                  {e.overview}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </SwiperSlide>
                  );
                })
              )}
            </Swiper>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
