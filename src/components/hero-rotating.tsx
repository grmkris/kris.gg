"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { PhotoMeta } from "@/lib/photos";

interface Props {
  /** Pool of candidate cover photos. One is picked at random per mount. */
  covers: PhotoMeta[];
}

export function HeroRotating({ covers }: Props) {
  // Render first one server-side, then swap to random on client mount.
  const [photo, setPhoto] = useState<PhotoMeta | null>(covers[0] ?? null);

  useEffect(() => {
    if (covers.length <= 1) return;
    const i = Math.floor(Math.random() * covers.length);
    setPhoto(covers[i]);
  }, [covers]);

  if (!photo) return null;

  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#1a1a1a] md:aspect-[3/4]">
      <Image
        src={photo.full}
        alt=""
        fill
        priority
        placeholder="blur"
        blurDataURL={photo.blur}
        className="object-cover"
        sizes="(min-width: 768px) 40vw, 100vw"
      />
    </div>
  );
}
