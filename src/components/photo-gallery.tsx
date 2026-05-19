"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useState } from "react";
import type { PhotoMeta } from "@/lib/photos";

import "yet-another-react-lightbox/styles.css";

const Lightbox = dynamic(
  () => import("yet-another-react-lightbox").then((mod) => mod.default),
  { ssr: false }
);

export function PhotoGallery({ photos }: { photos: PhotoMeta[] }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  if (photos.length === 0) return null;

  return (
    <>
      <div className="columns-2 gap-3 md:columns-3">
        {photos.map((photo, i) => (
          <button
            type="button"
            key={photo.src}
            onClick={() => {
              setIndex(i);
              setOpen(true);
            }}
            className="mb-3 block w-full break-inside-avoid overflow-hidden rounded-sm border border-[#1a1a1a] bg-[#1a1a1a] transition-opacity hover:opacity-90 cursor-zoom-in"
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
      <Lightbox
        open={open}
        close={() => setOpen(false)}
        index={index}
        slides={photos.map((p) => ({
          src: p.full,
          width: p.width,
          height: p.height,
        }))}
        controller={{ closeOnBackdropClick: true }}
        styles={{
          container: { backgroundColor: "rgba(10, 10, 10, 0.96)" },
        }}
      />
    </>
  );
}
