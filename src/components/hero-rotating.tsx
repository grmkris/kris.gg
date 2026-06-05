"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import type { PhotoMeta } from "@/lib/photos";

interface Props {
  /** Pool of candidate cover photos to cycle through. */
  covers: PhotoMeta[];
  /** Milliseconds each frame stays before cross-fading to the next. */
  intervalMs?: number;
}

export function HeroRotating({ covers, intervalMs = 4800 }: Props) {
  // Cap the rotating pool so the hero doesn't pull a dozen full-size images.
  const pool = covers.slice(0, 8);
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

  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#1a1a1a] md:aspect-[3/4]">
      {pool.map((photo, i) => {
        const active = i === index;
        return (
          <div
            key={photo.full}
            aria-hidden={active ? undefined : true}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              active ? "opacity-100" : "opacity-0"
            }`}
          >
            <Image
              src={photo.full}
              alt=""
              fill
              priority={i === 0}
              placeholder="blur"
              blurDataURL={photo.blur}
              className={`object-cover ${active ? "kenburns" : ""}`}
              sizes="(min-width: 768px) 40vw, 100vw"
            />
          </div>
        );
      })}

      {/* Progress ticks — current frame is a longer bar */}
      {pool.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center gap-1.5 pb-4">
          {pool.map((photo, i) => (
            <span
              key={photo.full}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === index ? "w-5 bg-[#f4ede1]" : "w-1 bg-[#f4ede1]/30"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
