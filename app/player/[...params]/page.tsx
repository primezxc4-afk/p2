"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useDoubleTap } from "use-double-tap";
import { ArrowLeft } from "lucide-react";
import { Tailspin } from "ldrs/react";
import "ldrs/react/Tailspin.css";

import { cn } from "@/lib/utils";
import { makeKey } from "@/zustand/videoProgressStore";
import { useSettingsStore } from "@/zustand/settings-store";
import { useAdStore } from "@/zustand/ad-store";

import { useIsMobile } from "@/hooks/use-mobile";
import { useHiddenOverlay } from "@/lib/hide-overlay";
import useMovieById from "@/hooks/metadata";
import useSource from "@/hooks/source";
import { useOpenSubtitle } from "@/hooks/open-subtitle";
import { usePlayerServers } from "./useServers";
import { useVideoPlayer } from "./useVideoPlayer";
import { useKeyboardControls } from "./useKeyboard";

import { Button } from "@/components/ui/button";
import MainControls from "./controls/main";
import { LyricsServerPicker } from "./serverSelection";
import SubtitleOverlay from "./subtitle/SubtitleOverlay";
import Pause from "./pause";
import DynamicTip from "./tips";
import { useQueryClient } from "@tanstack/react-query";
import LoadingMetadata from "./logo";
import { ArrowLeftIcon } from "@/components/icons/arrow";
import Link from "next/link";

export default function Player() {
  // ─── URL Params ─────────────────────────────────────────────────────────────
  const { params } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const media_type = String(params?.[0]);
  const tmdbId = String(params?.[1]);
  const season = Number(params?.[2]) || 1;
  const episode = Number(params?.[3]) || 1;
  const [showServer, setShowServer] = useState(false);
  const defaultServerIndex = Number(searchParams.get("server")) || 0;
  const domain = searchParams.get("domainAd") || "zxcstream.icu";
  const color = searchParams.get("color") || "dc2626";
  const back = searchParams.get("back") === "true";
  const dubLang = searchParams.get("dubLang");
  const auto_play = searchParams.get("autoplay") === "true";
  const enableSaveProgress = searchParams.get("save_progress") !== "false"; // default true
  const enableLoadProgress = searchParams.get("load_progress") !== "false"; // default true
  const load = Number(searchParams.get("load")) || undefined; // default undefined

  // ─── Local State ─────────────────────────────────────────────────────────────
  const isMobile = useIsMobile();
  const [doubleTapSide, setDoubleTapSide] = useState<"left" | "right" | null>(
    null,
  );
  const [cCToggle, setCcToggle] = useState(true);
  const [loaded, setLoaded] = useState(false);

  // ─── Settings ────────────────────────────────────────────────────────────────
  const triggerAd = useAdStore((state) => state.triggerAd);
  const aspectRatio = useSettingsStore(
    (s) => s.values["Aspect Ratio"]?.id ?? "16:9",
  );
  const mirror = useSettingsStore((s) => s.values["Mirror"]?.id ?? "off");
  const subtitleUrl = useSettingsStore(
    (s) => s.values["Subtitles"]?.file ?? null,
  );
  const dualSubtitleUrl = useSettingsStore(
    (s) => s.values["Dual subtitles"]?.file ?? null,
  );
  const autoplay = useSettingsStore((s) => s.values["Autoplay"]?.id ?? "on");
  const sourceQualityId = useSettingsStore(
    (s) => s.values["Source quality"]?.id ?? "0",
  );
  const brightness = useSettingsStore(
    (s) => s.values["Brightness"]?.id ?? "100%",
  );
  const dub = useSettingsStore((s) => s.values["Audio Dub"]?.id ?? "");

  // ─── Servers ─────────────────────────────────────────────────────────────────
  const {
    handleCanPlay,
    handleManualSelect,
    handleServerFail,
    handleMarkConnecting,
    handleMarkChecking,
    handleQualityChange,
    handleMarkQueue,
    serverIndex,
    servers,
    setServers,
    playingIndex,
    allFailed,
    handleResetServers,
    handleMarkDub,
  } = usePlayerServers({ defaultServerIndex });

  const fetchServer = servers[serverIndex];

  // ─── Metadata ────────────────────────────────────────────────────────────────
  const { data: metadata, isError: metadataError } = useMovieById({
    media_type,
    tmdbId,
  });

  const imdbId = metadata?.external_ids?.imdb_id ?? null;
  const movie_id = metadata?.id;
  const poster = metadata?.poster_path || null;
  const backdrop =
    metadata?.images?.backdrops?.find((f) => f.iso_639_1 === "en")?.file_path ||
    metadata?.backdrop_path ||
    null;
  const title = metadata?.title || metadata?.name || "";
  const date = metadata?.release_date ?? metadata?.first_air_date;
  const year = date ? String(new Date(date).getFullYear()) : "";
  const genre = metadata?.genres?.[0]?.name ?? "N/A";
  const totalSeasons = metadata?.number_of_seasons || 0;
  const logo = metadata?.images.logos.find(
    (f) => f.iso_639_1 === "en",
  )?.file_path;
  useEffect(() => {
    window.parent.postMessage(
      {
        type: "METADATA",
        payload: {
          movie_id,
          media_type,
          season: media_type === "tv" ? season : null,
          episode: media_type === "tv" ? episode : null,
          title,
          year,
          genre,
          poster,
          backdrop,
        },
      },
      "*",
    );
  }, [
    movie_id,
    media_type,
    season,
    episode,
    title,
    year,
    genre,
    poster,
    backdrop,
  ]);

  // ─── Source ──────────────────────────────────────────────────────────────────
  const {
    data: source,
    error: sourceError,
    isLoading: sourceLoading,
    refetch,
  } = useSource({
    media_type,
    tmdbId,
    season,
    episode,
    server: fetchServer.server,
    imdbId,
    title,
    year,
    enable: !allFailed,
    dub: dubLang ?? dub,
  });

  // ─── Subtitles ───────────────────────────────────────────────────────────────
  const { data: openSubtitleData = [] } = useOpenSubtitle({
    imdbId,
    season: media_type === "tv" ? season : undefined,
    episode: media_type === "tv" ? episode : undefined,
  });
  const dubs = source?.dubs || [];
  const mergeSubtitles = [...(source?.subtitles || []), ...openSubtitleData];

  // ─── Video Player ────────────────────────────────────────────────────────────
  const playerSrc =
    servers[serverIndex].status === "connecting" ||
    servers[serverIndex].status === "available"
      ? (source?.links[Number(sourceQualityId)].link ?? null)
      : null;

  const srcType = source?.links?.[Number(sourceQualityId)]?.type ?? "";

  const { videoRef, containerRef, state, controls, quality, audioTracks } =
    useVideoPlayer({
      playerSrc,
      srcType,
      serverIndex,
      progressKey: makeKey(media_type, tmdbId, season, episode),
      initialMuted: auto_play && autoplay === "on",
      enableSaveProgress,
      enableLoadProgress,
      load,
      handleServerFail,
    });

  const { isVisible, resetTimer, setIsVisible, lockTimer } =
    useHiddenOverlay(5000);

  // ─── Next Episode ────────────────────────────────────────────────────────────
  const allSeason = metadata?.seasons?.length ?? 0;
  const activeSeason = metadata?.seasons?.find(
    (s) => s.season_number === season,
  );
  const episodeCount = activeSeason?.episode_count ?? 0;

  let nextSeason = season;
  let nextEpisode = episode;
  let canNext = true;

  if (episode < episodeCount) {
    nextEpisode = episode + 1;
  } else if (season < allSeason) {
    nextSeason = season + 1;
    nextEpisode = 1;
  } else {
    canNext = false;
  }

  // ─── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (sourceLoading) handleMarkChecking();
  }, [sourceLoading]);

  useEffect(() => {
    return () => {
      handleMarkQueue();
    };
  }, [serverIndex]);
  useEffect(() => {
    if (sourceError || source?.links.length === 0) {
      queryClient.removeQueries({
        queryKey: [
          "get-source",
          tmdbId,
          media_type,
          season,
          episode,
          imdbId,
          fetchServer.server,
          title,
          year,
        ],
      });
      handleServerFail();
    }
  }, [source?.links, sourceError]);
  useEffect(() => {
    if (!source?.active) return;
    useSettingsStore.getState().setValue("Audio Dub", {
      display: source.active.langName,
      id: source.active.langCode,
    });
  }, [source?.links]);

  useEffect(() => {
    if (!source?.links?.[0]?.resolution) return;

    useSettingsStore.getState().setValue("Source quality", {
      display:
        String(source.links[0].resolution) +
        (source.links[0].resolution === 4 ? "K" : "p"),
      id: "0",
    });
  }, [source?.links]);

  useEffect(() => {
    if (!source?.links) return;
    if (source?.links.length > 0) handleMarkConnecting();
  }, [source?.links]);
  // useEffect(() => {
  //   if (sourceLoading || (!source?.links && !sourceError)) return;
  //   if (sourceError || source?.links.length === 0) {
  //     queryClient.removeQueries({
  //       queryKey: [
  //         "get-source",
  //         tmdbId,
  //         media_type,
  //         season,
  //         episode,
  //         imdbId,
  //         fetchServer.server,
  //         title,
  //         year,
  //       ],
  //     });
  //     handleServerFail();
  //   } else {
  //     handleMarkConnecting();
  //   }
  // }, [source?.links, sourceError, sourceLoading]);

  // Effect 2: Handle quality change separately
  useEffect(() => {
    if (!source?.links) return;
    handleQualityChange();
  }, [sourceQualityId]);

  useEffect(() => {
    if (!dub) return;
    handleMarkDub();
    refetch();
  }, [dub]);

  useEffect(() => {
    if (canNext && state.ended) {
      router.push(`/player/tv/${tmdbId}/${nextSeason}/${nextEpisode}`);
    }
  }, [state.ended]);

  useEffect(() => {
    setLoaded(false);
  }, [serverIndex]);

  useEffect(() => {
    if (!mergeSubtitles.length) return;

    const exactMatch = [...mergeSubtitles]
      .reverse()
      .find((s) => s.display.toLowerCase() === "english");
    const fuzzyMatch = mergeSubtitles.find((s) =>
      s.display.toLowerCase().includes("english"),
    );
    const chosen = exactMatch ?? fuzzyMatch;

    useSettingsStore.getState().setValue("Subtitles", {
      display: chosen?.display ?? "Off",
      id: chosen?.id ?? "off",
      file: chosen?.file,
    });
    useSettingsStore.getState().setValue("Dual subtitles", {
      display: "Off",
      id: "off",
    });
  }, [mergeSubtitles.length]);

  // ─── Interactions ─────────────────────────────────────────────────────────────
  useKeyboardControls({ controls, setDoubleTapSide });

  const handleDoubleTap = useDoubleTap(
    (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const side = e.clientX - rect.left < rect.width / 2 ? "left" : "right";
      controls.skipBy(side === "left" ? -15 : 15);
      setDoubleTapSide(side);
      setTimeout(() => setDoubleTapSide(null), 600);
    },
    250,
    {
      onSingleTap: () => {
        if (isMobile) {
          setIsVisible((prev) => !prev);
        } else {
          controls.togglePlay();
        }
      },
    },
  );

  // ─── Error State ──────────────────────────────────────────────────────────────
  if (metadataError) {
    return (
      <div
        className={cn(
          "h-screen flex flex-col justify-center items-center gap-6 bg-background relative overflow-hidden",
          isVisible ? "cursor-default" : "cursor-none",
        )}
      >
        <div className="absolute w-64 h-64 rounded-full bg-blue-600/10 blur-3xl pointer-events-none animate-pulse" />
        <div className="relative z-10 text-center px-4">
          <div className="space-y-2">
            <p className="text-muted-foreground lg:text-2xl md:text-xl text-lg max-[340px]:text-base -tracking-[0.04em] font-semibold">
              No resources found
            </p>
            <p className="text-muted-foreground lg:text-base text-sm max-[340px]:text-xs max-w-md">
              Nothing to stream here. The resource you're looking for doesn't
              exist or has been removed.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="mt-8 max-[340px]:text-xs max-[340px]:px-2 max-[340px]:py-1"
          >
            <ArrowLeft /> Go back
          </Button>
        </div>
      </div>
    );
  }
  if (allFailed) {
    return (
      <div className="relative h-screen flex flex-col justify-center items-center gap-2 bg-black">
        {back && !state.canPlay && (
          <button onClick={() => router.back()} className="cursor-pointer">
            <ArrowLeftIcon className="absolute lg:top-4 top-3 lg:left-6 left-2 lg:size-13  md:size-10 size-8  max-[340px]:size-5.5 text-muted-foreground z-30" />
          </button>
        )}
        <h1 className="text-2xl font-medium">All servers failed</h1>
        <h1 className="text-muted-foreground">
          The content may not be available yet, or the servers are currently
          failing.
        </h1>
        <Button className="mt-6" onClick={handleResetServers}>
          Try Again
        </Button>
      </div>
    );
  }
  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="relative h-svh w-full overflow-hidden bg-black"
      onClick={triggerAd}
    >
      {/* Video */}
      <div className="h-full w-full">
        <video
          key={playerSrc}
          ref={videoRef}
          onCanPlayThrough={handleCanPlay}
          onError={(e) => {
            handleServerFail();
            const error = e.currentTarget.error;
            // console.log(
            //   "Video error code:",
            //   error?.code,
            //   "message:",
            //   error?.message,
            // );
          }}
          autoPlay={auto_play && autoplay === "on"}
          muted={auto_play && autoplay === "on"}
          className={cn(
            "absolute inset-0 w-full h-full transition-opacity duration-700 mx-auto brightness-200",
            servers[serverIndex].status === "available"
              ? "opacity-100"
              : "opacity-0",
            mirror === "on" && "-scale-x-100",
            aspectRatio === "fill" && "object-fill",
            aspectRatio === "4:3" && "object-contain max-w-[calc(100vh*4/3)]",
            aspectRatio === "21:9" && "object-contain max-w-[calc(100vh*21/9)]",
            aspectRatio === "16:9" && "object-contain",
            brightness === "50%" && "brightness-50",
            brightness === "75%" && "brightness-75",
            brightness === "100%" && "brightness-100",
            brightness === "125%" && "brightness-125",
            brightness === "150%" && "brightness-150",
            brightness === "200%" && "brightness-200",
          )}
        />
      </div>

      {/* Backdrop (shown while buffering) */}
      <AnimatePresence>
        {!state.canPlay && metadata?.backdrop_path && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            className={cn(
              "fixed inset-0",
              loaded ? "opacity-100" : "opacity-0",
            )}
          >
            <img
              src={`https://image.tmdb.org/t/p/original/${metadata?.backdrop_path}`}
              alt=""
              className="h-full w-full object-cover transition-opacity duration-700"
              onLoad={() => setLoaded(true)}
            />
          </motion.div>
        )}
      </AnimatePresence>
      {back && !state.canPlay && (
        <button onClick={() => router.back()} className="cursor-pointer">
          <ArrowLeftIcon className="absolute lg:top-4 top-3 lg:left-6 left-2 lg:size-13  md:size-10 size-8  max-[340px]:size-5.5 text-muted-foreground z-30" />
        </button>
      )}
      {/* Loading tip */}
      {!state.canPlay && <DynamicTip />}

      {/* Pause overlay */}
      <AnimatePresence>
        {metadata && !state.playing && !isVisible && state.canPlay && (
          <Pause metadata={metadata} color={color} />
        )}
      </AnimatePresence>

      {logo && !isMobile && !state.canPlay && <LoadingMetadata logo={logo} />}
      {/* Double tap indicator */}
      <AnimatePresence>
        {doubleTapSide && state.canPlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={`absolute top-0 bottom-0 w-1/2 flex items-center justify-center z-20 pointer-events-none ${
              doubleTapSide === "left" ? "left-0" : "right-0"
            }`}
          >
            <span className="text-3xl max-[340px]:text-xs font-medium text-white">
              {doubleTapSide === "left" ? "−15s" : "+15s"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Buffering spinner */}
      <div
        className={cn(
          "absolute -translate-y-1/2 top-1/2 -translate-x-1/2 left-1/2 z-30 transition-opacity duration-300",
          state.waiting && state.canPlay
            ? "opacity-100"
            : "opacity-0 pointer-events-none",
        )}
      >
        <Tailspin size="60" stroke="8" speed="0.9" color="white" />
      </div>

      {/* Subtitles */}
      {cCToggle && state.canPlay && state.playing && (
        <>
          <SubtitleOverlay
            subtitleUrl={subtitleUrl}
            currentTime={state.currentTime}
            isVisible={isVisible}
            domain={domain}
          />
          <SubtitleOverlay
            subtitleUrl={dualSubtitleUrl}
            currentTime={state.currentTime}
            position="top"
            isVisible={isVisible}
            domain={domain}
          />
        </>
      )}

      {/* Touch / pointer interaction layer */}
      {state.canPlay && (
        <div
          className="absolute inset-0"
          onPointerMove={resetTimer}
          {...handleDoubleTap}
        />
      )}

      {/* Server picker */}
      <AnimatePresence>
        {(isVisible || !state.canPlay) && (
          <LyricsServerPicker
            servers={servers}
            playingIndex={playingIndex}
            activeIndex={serverIndex}
            onSelect={handleManualSelect}
            lockTimer={lockTimer}
          />
        )}
      </AnimatePresence>

      {/* Main controls */}
      <AnimatePresence>
        {isVisible && playerSrc && state.canPlay && (
          <MainControls
            state={state}
            controls={controls}
            playerSrc={playerSrc}
            tmdbId={tmdbId}
            imdbId={imdbId}
            season={season}
            episode={episode}
            media_type={media_type}
            currentTime={state.currentTime}
            skipBy={controls.skipBy}
            year={year}
            genre={genre}
            quality={quality}
            audioTracks={audioTracks}
            mergeSubtitles={mergeSubtitles}
            dubs={dubs}
            title={title}
            onPip={controls.togglePip}
            cCToggle={cCToggle}
            setCcToggle={setCcToggle}
            resetTimer={resetTimer}
            lockTimer={lockTimer}
            totalSeasons={totalSeasons}
            source={source?.links ?? []}
            color={color}
            back={back}
            canNext={canNext}
            nextEpisode={nextEpisode}
            nextSeason={nextSeason}
            showServer={showServer}
            setShowServer={setShowServer}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
