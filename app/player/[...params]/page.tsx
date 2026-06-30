"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useDoubleTap } from "use-double-tap";
import { ArrowLeft, ExternalLink, TriangleAlert, X } from "lucide-react";
import { Tailspin } from "ldrs/react";
import "ldrs/react/Tailspin.css";
import { cn } from "@/lib/utils";
import { makeKey } from "@/zustand/videoProgressStore";
import { useSettingsStore } from "@/zustand/settings-store";
import { useIsMobile } from "@/hooks/use-mobile";
import { useHiddenOverlay } from "@/lib/hide-overlay";
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
import { useTmdbDetails } from "@/hooks/fetch-details";
import { useAdStore2 } from "@/zustand/ad-store2";
import { useIntro } from "@/hooks/intro";
import { SkipSegment } from "./controls/skip_segment";

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
  const [showServer, setShowServer] = useState(true);
  const defaultServerIndex = Number(searchParams.get("server")) || 0;
  const domain = searchParams.get("domainAd") || "zxcstream.icu";
  const color = searchParams.get("color") || "b91c1c";

  const language = searchParams.get("language") || "en-US";
  const subLang = searchParams.get("subLang") || "off";
  const back = searchParams.get("back") === "true";
  const dubLang =
    searchParams.get("dubLang") || searchParams.get("dublang") || "";

  const dubType =
    searchParams.get("dubType") || searchParams.get("dubtype") || "0";
  const [showFallbackBanner, setShowFallbackBanner] = useState(false);
  const auto_play = searchParams.get("autoplay") === "true";
  const enableSaveProgress = searchParams.get("save_progress") !== "false"; // default true
  const enableLoadProgress = searchParams.get("load_progress") !== "false"; // default true
  const load = Number(searchParams.get("load")) || undefined; // default undefined
  const dubLangApplied = useRef(false);
  const playCountCalled = useRef(false);
  const errorReportCalled = useRef(false);
  const [isSandboxed, setIsSandboxed] = useState(false);
  const [checkedSandbox, setCheckedSandbox] = useState(false);
  // ─── Local State ─────────────────────────────────────────────────────────────
  const isMobile = useIsMobile();
  const [doubleTapSide, setDoubleTapSide] = useState<"left" | "right" | null>(
    null,
  );
  const [cCToggle, setCcToggle] = useState(true);
  const [loaded, setLoaded] = useState(false);

  // ─── Settings ────────────────────────────────────────────────────────────────
  const triggerAd = useAdStore2((state) => state.triggerAd);
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
    (s) => s.values["Source quality"]?.id ?? "auto",
  );
  const brightness = useSettingsStore(
    (s) => s.values["Brightness"]?.id ?? "100%",
  );
  const dub = useSettingsStore((s) => s.values["Audio Dub"]?.value ?? "");
  const initialType = useSettingsStore(
    (s) => s.values["Audio Dub"]?.type ?? "",
  );
  // derive after
  const type = dub === "" ? "" : initialType;

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
  // const { data: metadata, isError: metadataError } = useMovieById({
  //   media_type,
  //   tmdbId,
  //   language,
  // });
  const { data: metadata, isError: metadataError } = useTmdbDetails(
    media_type,
    tmdbId,
    language,
  );

  const imdbId = metadata?.imdb_id || null;
  const movie_id = metadata?.id;
  const poster = metadata?.poster_path || null;
  const backdrop =
    metadata?.images?.backdrops?.find((f) => f.iso_639_1 === "en")?.file_path ||
    metadata?.backdrop_path ||
    null;
  const title = metadata?.title || "";
  const date = metadata?.release_date;
  const year = date ? String(new Date(date).getFullYear()) : "";
  const genre = metadata?.genres?.[0]?.name ?? "N/A";
  const seasons = metadata?.seasons ?? [];
  const logo = metadata?.images?.logos?.find(
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
    date: String(date),
    enable: !allFailed,
    dubCode: dub || dubLang,
    dubType: dub || dubLang ? (dub ? type : dubType) : "",
  });

  const { data: introData } = useIntro({
    imdbId,
    tmdbId,
    season,
    episode,
    enabled: media_type === "tv",
  });

  // ─── Subtitles ───────────────────────────────────────────────────────────────
  const { data: openSubtitleData = [] } = useOpenSubtitle({
    imdbId,
    season: media_type === "tv" ? season : undefined,
    episode: media_type === "tv" ? episode : undefined,
  });
  const dubs = source?.dubs || [];
  const mergeSubtitles = [...(source?.subtitles || []), ...openSubtitleData];

  const isAuto = sourceQualityId === "auto" ? "0" : sourceQualityId;
  // ─── Video Player ────────────────────────────────────────────────────────────
  const playerSrc =
    servers[serverIndex].status === "connecting" ||
    servers[serverIndex].status === "available"
      ? (source?.links[Number(isAuto)]?.link ?? null)
      : null;

  // console.log("server index:", serverIndex, " player src=", playerSrc);

  const srcType = source?.links?.[Number(isAuto)]?.type ?? "";
  // console.log(isAuto, playerSrc, srcType);
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
  const timer = isMobile ? 5000 : 3000;
  const { isVisible, resetTimer, setIsVisible, lockTimer } =
    useHiddenOverlay(timer);

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

  // default dub effect
  useEffect(() => {
    if (dubLangApplied.current) return; // skip if dubLang was applied or user picked
    if (dubLang) return;
    if (!source?.dubs?.[0]) return;
    useSettingsStore.getState().setValue("Audio Dub", {
      display: String(source.dubs[0].name),
      id: "0",
      value: "",
      type: "",
    });
  }, [source?.dubs]);

  useEffect(() => {
    if (!source?.fallback) return;
    if (!state.canPlay) return;
    if (fetchServer.server !== "icarus") return;
    setShowFallbackBanner(true);
    const timer = setTimeout(() => setShowFallbackBanner(false), 5000);
    return () => clearTimeout(timer);
  }, [source?.fallback, state.canPlay]);

  useEffect(() => {
    if (!state.canPlay) return;
    if (fetchServer.server !== "icarus") return;
    if (playCountCalled.current) return;
    if (!source?.active) return;

    playCountCalled.current = true;

    fetch("/backend_/servers/icarus/report_play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tmdbId,
        mediaType: media_type,
        season: media_type === "tv" ? season : "",
        episode: media_type === "tv" ? episode : "",
        dub: source.active.langCode,
        type: source.active.langType,
      }),
    });
  }, [state.canPlay, source?.active]);

  // useEffect(() => {
  //   dubLangApplied.current = false;
  //    if (!source?.dubs?.[0]) return;
  //   useSettingsStore.getState().setValue("Audio Dub", {
  //     display: String(source.dubs[0].name),
  //     id: "0",
  //     value: "",
  //     type: "",
  //   });
  //   setLoaded(false);
  // }, [serverIndex]);

  // dubLang effect
  useEffect(() => {
    if (!dubLang) return;
    if (dubLangApplied.current) return;
    if (!source?.dubs?.length) return;
    const index = source.dubs.findIndex(
      (f) => f.lang === dubLang && String(f.type) === dubType,
    );
    const matched = index !== -1 ? source.dubs[index] : null;
    dubLangApplied.current = true;
    useSettingsStore.getState().setValue("Audio Dub", {
      display: matched?.name ?? source.dubs[0].name, // 👈 fallback to first
      id: index !== -1 ? String(index) : "0",
      type: dubType,
      value: matched?.lang ?? source.dubs[0].lang, // 👈 fallback to first
    });
  }, [source?.dubs]);

  // user manually picks
  useEffect(() => {
    if (!dub && !type) return;
    dubLangApplied.current = true; // 👈 same ref, locks out both effects above
    handleMarkDub();
  }, [dub, type]);

  useEffect(() => {
    if (!source?.links?.[0]?.resolution) return;

    useSettingsStore.getState().setValue("Source quality", {
      display:
        String(source.links[0].resolution) +
        (source.links[0].resolution === 4 ? "K" : "p"),
      id: "auto",
    });
  }, [source?.links]);

  useEffect(() => {
    if (!source?.links) return;
    if (source?.links.length > 0) handleMarkConnecting();
  }, [source?.links]);

  // Effect 2: Handle quality change separately
  useEffect(() => {
    if (!playerSrc) return;
    handleQualityChange();
  }, [playerSrc]);

  useEffect(() => {
    if (canNext && state.ended) {
      router.push(`/player/tv/${tmdbId}/${nextSeason}/${nextEpisode}`);
    }
  }, [state.ended]);

  // console.log("sds", servers[serverIndex].status);

  useEffect(() => {
    if (!mergeSubtitles.length) return;

    const exactMatch = [...mergeSubtitles]
      .reverse()
      .find((s) => s.display.toLowerCase() === subLang);
    const fuzzyMatch = mergeSubtitles.find((s) =>
      s.display.toLowerCase().includes(subLang),
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

  useEffect(() => {
    if (state.canPlay) {
      setShowServer(false);
      resetTimer();
    } else {
      setShowServer(true);
      lockTimer();
    }
  }, [state.canPlay]);

  const handleDoubleTap = useDoubleTap(
    (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const side = e.clientX - rect.left < rect.width / 2 ? "left" : "right";
      controls.skipBy(side === "left" ? -15 : 15);
      setDoubleTapSide(side);
      resetTimer();
      setTimeout(() => setDoubleTapSide(null), 600);
    },
    250,
    {
      onSingleTap: () => {
        if (isMobile) {
          setIsVisible((prev) => !prev);
        } else {
          controls.togglePlay();
          resetTimer();
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
        )}
      >
        <div className="absolute w-64 h-64 rounded-full bg-blue-600/10 blur-3xl pointer-events-none animate-pulse" />
        <div className="relative z-10 text-center px-4">
          <div className="space-y-2">
            <p className="text-muted-foreground lg:text-2xl md:text-xl text-lg landscape:text-base -tracking-[0.04em] font-semibold">
              No resources found
            </p>
            <p className="text-muted-foreground lg:text-base text-sm landscape:text-xs max-w-md">
              Nothing to stream here. The resource you're looking for doesn't
              exist or has been removed.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="mt-8 landscape:text-xs landscape:px-2 landscape:py-1"
          >
            <ArrowLeft /> Go back
          </Button>
        </div>
      </div>
    );
  }
  if (allFailed) {
    return (
      <div
        className={cn(
          "h-screen flex flex-col justify-center items-center gap-6 bg-background relative overflow-hidden",
        )}
      >
        {back && !state.canPlay && (
          <button onClick={() => router.back()} className="cursor-pointer">
            <ArrowLeftIcon className="absolute lg:top-4 top-3 lg:left-6 left-2 lg:size-13  md:size-10 size-8  landscape:size-5.5 text-muted-foreground z-30" />
          </button>
        )}
        <div className="absolute w-64 h-64 rounded-full bg-blue-600/10 blur-3xl pointer-events-none animate-pulse" />
        <div className="relative z-10 text-center px-4">
          <div className="space-y-2">
            <span className="font-bold lg:text-xl md:text-lg text-base landscape:text-sm">
              ༼;´༎ຶ ۝ ༎ຶ༽
            </span>
            <p className=" lg:text-2xl md:text-xl text-lg landscape:text-base -tracking-[0.04em] font-semibold mt-6">
              All servers failed
            </p>
            <p className="text-muted-foreground lg:text-base text-sm landscape:text-xs max-w-md">
              The content may not be available yet, or the servers are currently
              failing.
            </p>
          </div>
          <div className="flex justify-center items-center gap-3">
            <Button
              variant="outline"
              className="mt-6"
              onClick={handleResetServers}
            >
              Try Again
            </Button>
            {/* <Button className="mt-6" onClick={handleResetServers}>
              Contact Us
            </Button> */}
          </div>
        </div>
      </div>
    );
  }
  if (isSandboxed) {
    return (
      <div
        className={cn(
          "h-screen flex flex-col justify-center items-center gap-6 bg-background relative overflow-hidden",
        )}
      >
        {back && !state.canPlay && (
          <button onClick={() => router.back()} className="cursor-pointer">
            <ArrowLeftIcon className="absolute lg:top-4 top-3 lg:left-6 left-2 lg:size-13  md:size-10 size-8  landscape:size-5.5 text-muted-foreground z-30" />
          </button>
        )}
        <div className="absolute w-64 h-64 rounded-full bg-blue-600/10 blur-3xl pointer-events-none animate-pulse" />
        <div className="relative z-10 text-center px-4">
          <div className="space-y-2">
            <div className="animate-bounce">
              <span className="font-bold lg:text-xl md:text-lg text-base landscape:text-sm">
                ༼;´༎ຶ ۝ ༎ຶ༽
              </span>
            </div>
            <p className=" lg:text-2xl md:text-xl text-lg landscape:text-base -tracking-[0.04em] font-semibold mt-6 landscape:mt-1">
              Unsupported Sandbox Environment
            </p>
            <p className="text-muted-foreground lg:text-base text-sm font-medium landscape:text-xs max-w-xl">
              This player cannot run inside a sandboxed iframe. Please disable
              the
              <code className="mx-1">sandbox</code>
              attribute or ask the website owner to remove the sandbox
              restrictions.
            </p>
          </div>

          {/* <div className="flex items-center gap-6 mt-6">
            <div className="h-px bg-border flex-1"></div>{" "}
            <h3 className="text-xs uppercase text-muted-foreground">
              Contact Us
            </h3>
            <div className="h-px bg-border flex-1"></div>
          </div>
          <div className="flex justify-center items-center gap-3">
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => setIsSandboxed(false)}
            >
              <ExternalLink /> Facebook
            </Button>

            <Button
              variant="outline"
              className="mt-6"
              onClick={() => setIsSandboxed(false)}
            >
              <ExternalLink /> Telegram
            </Button>
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => setIsSandboxed(false)}
            >
              <ExternalLink /> Discord
            </Button>
           
          </div> */}
        </div>
      </div>
    );
  }
  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-svh w-full overflow-hidden bg-black ",
        isVisible ? "" : "cursor-none",
      )}
      onClick={() => {
        if (!checkedSandbox && window.self !== window.top) {
          const popup = window.open(
            "",
            "_blank",
            "popup=yes,width=1,height=1,right=-10000,bottom=-10000",
          );

          const sandboxed =
            !popup || popup.closed || typeof popup.closed === "undefined";

          if (popup && !sandboxed) {
            popup.close();
          }

          setCheckedSandbox(true);

          if (sandboxed) {
            setIsSandboxed(true);
            return;
          }
        }

        if (color !== "305CDE") {
          triggerAd();
        }
      }}
    >
      <AnimatePresence>
        {showFallbackBanner && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={cn(
              "absolute lg:top-4 top-2 inset-x-0  flex justify-center items-center z-30",
            )}
          >
            <div
              className={cn(
                "flex items-center lg:gap-3 md:gap-2 gap-1.5",
                "bg-amber-600/80 backdrop-blur-md rounded-md",
                "text-foreground lg:text-base md:text-sm text-xs  lg:px-4 md:px-3 px-2 lg:py-2.5 py-1.5",
              )}
            >
              <TriangleAlert className="md:size-4 size-3" />
              <h3>Language unavailable, falling back to default.</h3>
              <button
                onClick={() => setShowFallbackBanner(false)}
                className="hover:opacity-70"
              >
                <X className="md:size-4 size-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Video */}
      <div className="h-full w-full">
        <video
          key={playerSrc}
          ref={videoRef}
          onCanPlayThrough={handleCanPlay}
          onError={(e) => {
            handleServerFail();
            if (fetchServer.server === "icarus" && !errorReportCalled.current) {
              errorReportCalled.current = true;
              fetch("/backend_/servers/icarus/report_error", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  tmdbId,
                  mediaType: media_type,
                  season: media_type === "tv" ? season : "",
                  episode: media_type === "tv" ? episode : "",
                  dub: source?.active?.langCode,
                  type: source?.active?.langType,
                }),
              });
            }
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
            <motion.img
              src={`https://image.tmdb.org/t/p/original/${metadata?.backdrop_path}`}
              alt=""
              className="h-full w-full object-cover"
              animate={{
                filter:
                  servers[serverIndex].status === "checking" ||
                  servers[serverIndex].status === "queue"
                    ? "grayscale(1) contrast(1.3) brightness(0.75)"
                    : "grayscale(0)",
              }}
              transition={{
                duration: 0.7,
                ease: "easeInOut",
              }}
              onLoad={() => setLoaded(true)}
            />
          </motion.div>
        )}
      </AnimatePresence>
      {back && !state.canPlay && (
        <button onClick={() => router.back()} className="cursor-pointer">
          <ArrowLeftIcon className="absolute lg:top-4 top-3 lg:left-6 left-2 lg:size-13  md:size-10 size-8  landscape:size-5.5 text-muted-foreground z-30" />
        </button>
      )}
      {state.playing && state.canPlay && (
        <SkipSegment
          className="absolute  lg:bottom-32  lg:right-7 md:bottom-23 md:right-5 bottom-27 right-3 z-30 landscape:bottom-20"
          currentTime={state.currentTime}
          intro={introData?.intro}
          outro={introData?.outro}
          onSkip={controls.skipTo}
        />
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
            <span className="text-3xl landscape:text-xs font-medium text-white">
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
        {(isVisible || !state.canPlay) && showServer && (
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
            seasons={seasons}
            source={source?.links ?? []}
            color={color}
            back={back}
            canNext={canNext}
            nextEpisode={nextEpisode}
            nextSeason={nextSeason}
            showServer={showServer}
            setShowServer={setShowServer}
            introData={introData}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
