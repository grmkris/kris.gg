import { Manifest } from "@/components/manifest";
import { PublicFooter } from "@/components/public-footer";
import { YearRuler } from "@/components/year-ruler";
import { TRIPS } from "@/content/trips";

export const metadata = {
  description:
    "Hackathons, trips, and a well-stamped passport — Kristjan Grm's journal.",
  title: "Journal",
};

export default function JournalIndex() {
  const years = [...new Set(TRIPS.map((trip) => trip.date.slice(0, 4)))];

  return (
    <main className="public-page">
      <div className="public-container public-journal-page">
        <header className="public-grid public-journal-header">
          <div className="public-journal-header-copy">
            <h1 className="public-title">Journal</h1>
            <p className="public-lead">
              Hackathons, trips, and a well-stamped passport.
            </p>
          </div>
          <div className="public-journal-header-facts">
            <p className="public-meta">{TRIPS.length} entries</p>
            <p className="public-meta">
              {years.at(-1)} to {years[0]}
            </p>
          </div>
        </header>

        <YearRuler years={years} />
        <Manifest trips={TRIPS} />
      </div>
      <PublicFooter />
    </main>
  );
}
