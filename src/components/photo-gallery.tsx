"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useState } from "react";

import type { PhotoMeta } from "@/lib/photos";

import "yet-another-react-lightbox/styles.css";

const Lightbox = dynamic(
  async () => import("yet-another-react-lightbox").then((mod) => mod.default),
  { ssr: false }
);

const FLASH_IN_MS = 180;
const FLASH_OUT_MS = 220;

// Per-photo permalink: the open photo lives in the URL path as
// `${basePath}/${photo.id}` (a stable content-hash id, so a shared link points
// at the same image even after the gallery is reordered, and the matching
// static route renders that photo with its own OG card). The URL is synced with
// history.replaceState — not the Next router — to avoid an RSC refetch / scroll
// reset on every lightbox step.
function writePath(basePath: string | undefined, id: string | null): void {
  if (!basePath || typeof window === "undefined") {
    return;
  }
  const target = id ? `${basePath}/${id}` : basePath;
  window.history.replaceState(null, "", `${target}${window.location.search}`);
}

export function PhotoGallery({
  photos,
  basePath,
  initialPhotoId,
}: {
  photos: PhotoMeta[];
  basePath?: string;
  initialPhotoId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [flashActive, setFlashActive] = useState(false);

  // Deep-link: if we arrived on a /journal/<slug>/<id> permalink, open the
  // lightbox straight to that photo (no color-flash intro).
  useEffect(() => {
    if (!initialPhotoId) {
      return;
    }
    const i = photos.findIndex((p) => p.id === initialPhotoId);
    if (i !== -1) {
      setIndex(i);
      setOpen(true);
    }
  }, [initialPhotoId, photos]);

  if (photos.length === 0) {
    return null;
  }

  function openAt(i: number) {
    const photo = photos[i];
    if (!photo) {
      return;
    }
    setIndex(i);
    writePath(basePath, photo.id);
    setFlashColor(photo.dominant);
    setFlashActive(true);
    // Brief color wash before the lightbox modal lands
    window.setTimeout(() => {
      setOpen(true);
    }, FLASH_IN_MS);
  }

  function handleClose() {
    setOpen(false);
    writePath(basePath, null);
    // After the modal closes, ease the color overlay back out
    window.setTimeout(() => {
      setFlashActive(false);
    }, 40);
    window.setTimeout(
      () => {
        setFlashColor(null);
      },
      40 + FLASH_OUT_MS + 50
    );
  }

  return (
    <>
      <div className="columns-2 gap-3 md:columns-3">
        {photos.map((photo, i) => (
          <button
            type="button"
            key={photo.src}
            onClick={() => {
              openAt(i);
            }}
            className="mb-3 block w-full cursor-zoom-in break-inside-avoid overflow-hidden rounded-sm border border-[#1a1a1a] bg-[#1a1a1a] transition-opacity hover:opacity-90"
          >
            <Image
              src={photo.mid}
              alt=""
              width={photo.width}
              height={photo.height}
              placeholder="blur"
              blurDataURL={photo.blur}
              className="h-auto w-full"
              sizes="(min-width: 768px) 33vw, 50vw"
            />
          </button>
        ))}
      </div>

      {/* Page-flash overlay — fades to the clicked photo's dominant color
          right before the lightbox modal opens. */}
      {flashColor && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-40 transition-opacity ease-out"
          style={{
            backgroundColor: flashColor,
            opacity: flashActive ? 1 : 0,
            transitionDuration: `${flashActive ? FLASH_IN_MS : FLASH_OUT_MS}ms`,
          }}
        />
      )}

      <Lightbox
        open={open}
        close={handleClose}
        index={index}
        on={{
          view: ({ index: i }) => {
            setIndex(i);
            const photo = photos[i];
            if (photo) {
              writePath(basePath, photo.id);
            }
          },
        }}
        slides={photos.map((p) => ({
          height: p.height,
          src: p.full,
          width: p.width,
        }))}
        controller={{ closeOnBackdropClick: true }}
        styles={{
          container: { backgroundColor: "rgba(10, 10, 10, 0.96)" },
        }}
      />
    </>
  );
}
