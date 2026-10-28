"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import type { HeroFrame } from "@/lib/covers";

interface Props {
  frames: HeroFrame[];
  intervalMs?: number;
}

export function HeroRotating({ frames, intervalMs = 4800 }: Props) {
  const pool = frames.slice(0, 8);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [motionAllowed, setMotionAllowed] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    setMotionAllowed(!motion.matches);
    if (motion.matches) setPaused(true);
  }, []);

  useEffect(() => {
    if (pool.length <= 1 || paused) {
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % pool.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [pool.length, intervalMs, paused]);

  if (pool.length === 0) {
    return null;
  }
  const active = pool[index];
  const label = active.label.replace(" · ", ", ");
  const handleLeave = () => {
    if (motionAllowed) setPaused(false);
  };

  return (
    <figure className="journal-photo">
      <div
        className="journal-photo-stage"
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) handleLeave();
        }}
        onFocusCapture={() => setPaused(true)}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={handleLeave}
      >
        {pool.map((frame, i) => (
          <div
            className={`journal-photo-frame ${i === index ? "is-active" : ""}`}
            key={frame.photo.full}
            aria-hidden={i !== index}
          >
            <Image
              src={frame.photo.full}
              alt=""
              fill
              priority={i === 0}
              placeholder="blur"
              blurDataURL={frame.photo.blur}
              className="object-cover"
              sizes="(min-width: 960px) 40vw, 95vw"
            />
          </div>
        ))}
        <Link
          className="journal-photo-link"
          href={`/journal/${active.slug}`}
          aria-label={label ? `Journal, ${label}` : "Journal"}
        />
      </div>
      <figcaption className="journal-photo-caption">
        <Link className="public-link" href={`/journal/${active.slug}`}>
          {label || "Journal"}
        </Link>
        {pool.length > 1 ? (
          <button
            type="button"
            className="journal-photo-toggle"
            aria-pressed={paused}
            onClick={() => setPaused(!paused)}
          >
            {paused ? "Play photographs" : "Pause photographs"}
          </button>
        ) : null}
      </figcaption>
    </figure>
  );
}
