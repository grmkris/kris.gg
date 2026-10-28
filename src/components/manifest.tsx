import Image from "next/image";
import Link from "next/link";

import type { Trip } from "@/content/trips";
import { getCoverPhoto } from "@/lib/photos";
import type { PhotoMeta } from "@/lib/photos";
import { parsePlacement } from "@/lib/prizes";

interface Props {
  trips: Trip[];
}

const MONTH_NAMES: Record<string, string> = {
  "01": "January",
  "02": "February",
  "03": "March",
  "04": "April",
  "05": "May",
  "06": "June",
  "07": "July",
  "08": "August",
  "09": "September",
  "10": "October",
  "11": "November",
  "12": "December",
};

const placementText = (value: string): string =>
  value
    .replace("1ST", "1st")
    .replace("2ND", "2nd")
    .replace("3RD", "3rd")
    .replace("4TH", "4th");

function ManifestRow({ trip, cover }: { trip: Trip; cover: PhotoMeta | null }) {
  const month = MONTH_NAMES[trip.date.slice(5, 7)] ?? trip.date;
  const placement = parsePlacement(trip.prizes);
  const description =
    trip.project && trip.project !== trip.title
      ? `${trip.project}: ${trip.description}`
      : trip.description;

  return (
    <Link className="public-journal-row" href={`/journal/${trip.slug}`}>
      <time className="public-journal-date" dateTime={`${trip.date}-01`}>
        {month} {trip.date.slice(0, 4)}
      </time>
      <div className="public-journal-main">
        <h3>{trip.title}</h3>
        <p className="public-journal-location">{trip.location}</p>
        <p className="public-journal-description">{description}</p>
        <div className="public-journal-facts">
          <span>
            {trip.event ?? (trip.type === "project" ? "Side project" : "Trip")}
          </span>
          {placement && <span>{placementText(placement.display)}</span>}
        </div>
      </div>
      {cover && (
        <figure className="public-journal-thumb">
          <Image
            alt=""
            blurDataURL={cover.blur}
            fill
            loading="lazy"
            placeholder="blur"
            sizes="160px"
            src={cover.mid}
          />
        </figure>
      )}
    </Link>
  );
}

export function Manifest({ trips }: Props) {
  const years = [...new Set(trips.map((trip) => trip.date.slice(0, 4)))];

  return (
    <section className="public-journal-manifest">
      {years.map((year) => (
        <section className="public-journal-year" id={`year-${year}`} key={year}>
          <header className="public-journal-year-header">
            <h2>{year}</h2>
            <p>
              {trips.filter((trip) => trip.date.startsWith(year)).length}{" "}
              entries
            </p>
          </header>
          <div>
            {trips
              .filter((trip) => trip.date.startsWith(year))
              .map((trip) => (
                <ManifestRow
                  cover={getCoverPhoto(trip.slug)}
                  key={trip.slug}
                  trip={trip}
                />
              ))}
          </div>
        </section>
      ))}
    </section>
  );
}
