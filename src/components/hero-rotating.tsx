"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import type { HeroFrame } from "@/lib/covers";

interface Props {
  /** Curated frames (photo + slug + caption) to cycle through. */
  frames: HeroFrame[];
  /** Milliseconds each frame stays before cross-fading to the next. */
  intervalMs?: number;
}

export function HeroRotating({ frames, intervalMs = 4800 }: Props) {
  // Cap the rotating pool so the hero doesn't pull a dozen full-size images.
  const pool = frames.slice(0, 8);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (pool.length <= 1) {
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % pool.length);
    }, intervalMs);
    return () => {
      window.clearInterval(id);
    };
  }, [pool.length, intervalMs]);

  if (pool.length === 0) {
    return null;
  }

  const active = pool[index];

  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#1a1a1a] md:aspect-[3/4]">
      {pool.map((frame, i) => {
        const isActive = i === index;
        return (
          <div
            key={frame.photo.full}
            aria-hidden={isActive ? undefined : true}
            // Crossfade with a touch of blur on the outgoing/incoming frame:
            // during the overlap both photos are softened, so the eye reads one
            // dissolving image instead of two distinct frames ghosting.
            className={`absolute inset-0 transition-[opacity,filter] duration-1000 ease-[var(--ease-in-out-strong)] ${
              isActive ? "opacity-100 blur-0" : "opacity-0 blur-[3px]"
            }`}
          >
            <Image
              src={frame.photo.full}
              alt=""
              fill
              priority={i === 0}
              placeholder="blur"
              blurDataURL={frame.photo.blur}
              className={`object-cover ${isActive ? "kenburns" : ""}`}
              sizes="(min-width: 768px) 40vw, 100vw"
            />
          </div>
        );
      })}

      {/* Caption + click-through to the frame's journal entry. The whole photo
          is the click target; the caption anchors the bottom of the frame. */}
      <Link
        aria-label={active.label ? `Journal — ${active.label}` : "Journal"}
        className="group absolute inset-0 z-10 flex flex-col justify-end"
        href={`/journal/${active.slug}`}
      >
        <div className="flex items-end justify-between gap-3 bg-gradient-to-t from-[#0a0a0a]/80 via-[#0a0a0a]/15 to-transparent p-4 pt-20">
          {active.label ? (
            <span className="font-sans text-xs uppercase tracking-[0.18em] text-[#f4ede1]/85 underline-offset-4 transition-colors group-hover:text-[#f4ede1] group-hover:underline group-hover:decoration-[#c8472b]">
              {active.label}
            </span>
          ) : (
            <span />
          )}

          {/* Progress ticks — current frame is a longer bar */}
          {pool.length > 1 && (
            <span className="flex shrink-0 gap-1.5 pb-1">
              {pool.map((frame, i) => (
                <span
                  key={frame.photo.full}
                  className={`h-1 rounded-full transition-[width,background-color] duration-300 ${
                    i === index ? "w-5 bg-[#f4ede1]" : "w-1 bg-[#f4ede1]/40"
                  }`}
                />
              ))}
            </span>
          )}
        </div>
      </Link>
    </div>
  );
}
