import { VIDEOS } from "@/content/videos";
import type { VideoId } from "@/content/videos";

export function VideoGallery({
  ids,
  columns = 3,
}: {
  ids: readonly VideoId[];
  columns?: 1 | 2 | 3;
}) {
  const grid =
    columns === 3
      ? "grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3"
      : columns === 2
        ? "grid gap-x-6 gap-y-10 sm:grid-cols-2"
        : "grid gap-10";

  return (
    <div className={grid}>
      {ids.map((id) => {
        const video = VIDEOS[id];
        const seconds = Math.round(video.duration);
        const duration = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

        return (
          <figure className="min-w-0" id={id} key={id}>
            <video
              aria-describedby={`${id}-caption`}
              aria-label={video.title}
              className="block max-h-[36rem] w-full rounded-sm bg-[#141414] object-contain"
              controls
              height={video.height}
              playsInline
              poster={video.poster}
              preload="none"
              style={{ aspectRatio: `${video.width} / ${video.height}` }}
              width={video.width}
            >
              <source src={video.src} type="video/mp4" />
              <track
                kind="captions"
                label="English"
                src={`/captions/${id}.vtt`}
                srcLang="en"
              />
              <a href={video.src}>Watch {video.title}</a>
            </video>
            <figcaption className="mt-4" id={`${id}-caption`}>
              <p className="credit-block text-[10px] text-[#737373]">
                {video.category} · {duration}
              </p>
              <h3 className="mt-2 font-display text-xl text-[#f4ede1]">
                {video.title}
              </h3>
              <p className="mt-2 font-display text-base leading-snug text-[#a3a3a3]">
                {video.description}
              </p>
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
