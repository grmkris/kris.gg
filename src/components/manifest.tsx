import Image from "next/image";
import Link from "next/link";
import { FLAGS } from "@/content/flags";
import type { Trip } from "@/content/trips";
import { getCoverPhoto, type PhotoMeta } from "@/lib/photos";

interface Props {
  trips: Trip[];
}

const MONTH_NAMES: Record<string, string> = {
  "01": "JAN", "02": "FEB", "03": "MAR", "04": "APR",
  "05": "MAY", "06": "JUN", "07": "JUL", "08": "AUG",
  "09": "SEP", "10": "OCT", "11": "NOV", "12": "DEC",
};

function hasDetail(trip: Trip): boolean {
  return (
    (trip.body !== undefined && trip.body.length > 0) ||
    (trip.photos !== undefined && trip.photos.length > 0)
  );
}

function ManifestRow({ trip, cover }: { trip: Trip; cover: PhotoMeta | null }) {
  const month = MONTH_NAMES[trip.date.slice(5, 7)] ?? "";
  const flag = FLAGS[trip.location] ?? "🌍";
  const isHackathon = trip.event !== undefined;
  const detailable = hasDetail(trip);
  const showWon =
    trip.prizes !== undefined &&
    (trip.prizes.toLowerCase().includes("winner") ||
      /\b1st\b/i.test(trip.prizes));

  const rowContent = (
    <div className="group relative grid grid-cols-[40px_24px_1fr] items-baseline gap-x-4 border-t border-[#1a1a1a] py-4 transition-colors duration-300 tabular-nums hover:border-[#333] md:grid-cols-[40px_28px_120px_140px_1fr_auto]">
      {/* Month */}
      <span className="font-sans text-xs uppercase tracking-wider text-[#525252] transition-colors duration-300 group-hover:text-[#a3a3a3]">
        {month}
      </span>

      {/* Flag */}
      <span className="text-base leading-none">{flag}</span>

      {/* Location */}
      <span className="font-display text-base leading-snug text-[#f4ede1] md:text-[1.0625rem]">
        {trip.location}
      </span>

      {/* Event tag — hidden on mobile */}
      <span className="hidden font-sans text-xs uppercase tracking-wider text-[#737373] md:inline">
        {isHackathon
          ? trip.event
          : trip.type === "project"
            ? "Side project"
            : "Trip"}
      </span>

      {/* Description / project */}
      <span className="hidden font-display text-sm italic text-[#a3a3a3] md:inline">
        {trip.project !== undefined && trip.project !== trip.title ? (
          <>
            <span className="not-italic text-[#e8e8e8]">{trip.project}</span>
            <span className="mx-2 text-[#404040]">·</span>
            {trip.description}
          </>
        ) : (
          trip.description
        )}
      </span>

      {/* WON tag — 1st place only */}
      {showWon && (
        <span className="hidden font-sans text-[10px] uppercase tracking-[0.15em] text-[#c8472b] md:inline">
          WON
        </span>
      )}

      {/* Mobile-only description (collapsed under main row) */}
      <span className="col-span-3 font-display text-sm italic text-[#737373] md:hidden">
        {trip.description}
      </span>

      {/* Hover photo reveal — only when a cover exists; positioned in the
          right margin of the manifest container so it doesn't shift layout */}
      {cover && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-[-12rem] hidden h-28 w-40 -translate-y-1/2 overflow-hidden rounded-sm opacity-0 transition-all duration-500 ease-out group-hover:opacity-100 lg:block"
        >
          <Image
            src={cover.mid}
            alt=""
            fill
            placeholder="blur"
            blurDataURL={cover.blur}
            className="object-cover"
            sizes="160px"
          />
        </div>
      )}
    </div>
  );

  if (detailable) {
    return (
      <Link href={`/journal/${trip.slug}`} className="block">
        {rowContent}
      </Link>
    );
  }
  return rowContent;
}

export function Manifest({ trips }: Props) {
  const years = Array.from(new Set(trips.map((t) => t.date.slice(0, 4))));

  return (
    <section className="space-y-12">
      {years.map((year) => (
        <div key={year} id={`year-${year}`} className="scroll-mt-8">
          <div className="mb-2 flex items-baseline gap-4">
            <h3 className="font-display text-3xl font-light text-[#f4ede1]">
              {year}
            </h3>
            <div className="h-px flex-1 bg-[#1a1a1a]" />
          </div>
          <div>
            {trips
              .filter((t) => t.date.startsWith(year))
              .map((t) => (
                <ManifestRow
                  key={t.slug}
                  trip={t}
                  cover={getCoverPhoto(t.slug)}
                />
              ))}
          </div>
        </div>
      ))}
    </section>
  );
}
