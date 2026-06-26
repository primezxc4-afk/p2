import { TmdbDetailsResponse } from "@/hooks/tmdb-types";
import { MovieTypes } from "@/types/types";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function Pause({
  metadata,
  color,
}: {
  metadata: TmdbDetailsResponse;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "fixed inset-0 z-10",
        "bg-black/60",
        "overflow-hidden pointer-events-none",
        "flex items-end justify-end  flex-col lg:p-20 md:p-10 p-4",
      )}
    >
      <div className="w-full flex flex-col gap-12 landscape:gap-3">
        <div className=" max-w-3xl ">
          <div className={cn()}>
            <h3
              className={cn(
                "md:text-lg text-sm landscape:text-[0.6rem]",
                "text-gray-400 font-medium",
              )}
            >
              You're watching
            </h3>
            <h1
              className={cn(
                "text-2xl md:text-3xl lg:text-5xl landscape:text-base",
                "font-bold text-white",
                "mt-1 landscape:mt-0",
              )}
            >
              {metadata.title} ({metadata.release_date?.slice(0, 4)})
            </h1>
            <h1
              className={cn(
                "lg:text-xl md:text-lg landscape:text-xs",
                "font-semibold italic",
                "lg:mt-4 mt-2 landscape:mt-0.5",
              )}
            >
              {metadata.tagline}
            </h1>

            <div
              className={cn(
                "lg:w-32 w-22 landscape:w-15",
                "lg:h-0.5 h-px",
                "mt-4 landscape:mt-1.5",
              )}
              style={{ backgroundColor: `#${color}` }}
            />
            <p
              className={cn(
                "text-sm md:text-base lg:text-xl landscape:text-[0.6rem]",
                "text-gray-400",
                "lg:mt-8 mt-4 landscape:mt-1.5",
                "line-clamp-3",
              )}
            >
              {metadata.overview}
            </p>
          </div>
        </div>

        <div className={cn(" text-sm md:text-base landscape:text-xs")}>
          <h1 className="lg:text-lg">Paused</h1>
        </div>
      </div>
    </motion.div>
  );
}
