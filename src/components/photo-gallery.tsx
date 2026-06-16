"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useState } from "react";

import  { type PhotoMeta } from "@/lib/photos";

import "yet-another-react-lightbox/styles.css";

const Lightbox = dynamic(
  async () => import("yet-another-react-lightbox").then((mod) => mod.default),
  { ssr: false }
);

const FLASH_IN_MS = 180;
const FLASH_OUT_MS = 220;

export function PhotoGallery({ photos }: { photos: PhotoMeta[] }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [flashActive, setFlashActive] = useState(false);

  if (photos.length === 0) {
    return null;
  }

  function openAt(i: number) {
    const photo = photos[i];
    if (!photo) {
      return;
    }
    setIndex(i);
    setFlashColor(photo.dominant);
    setFlashActive(true);
    // Brief color wash before the lightbox modal lands
    window.setTimeout(() => {
      setOpen(true);
    }, FLASH_IN_MS);
  }

  function handleClose() {
    setOpen(false);
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
