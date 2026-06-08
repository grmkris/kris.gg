"use client";

import { useEffect, useState } from "react";

interface Props {
  years: string[];
}

export function YearRuler({ years }: Props) {
  const [activeYear, setActiveYear] = useState<string>(years[0] ?? "");

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    for (const year of years) {
      const el = document.getElementById(`year-${year}`);
      if (!el) {
        continue;
      }
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setActiveYear(year);
            }
          }
        },
        { rootMargin: "-30% 0px -60% 0px" }
      );
      observer.observe(el);
      observers.push(observer);
    }
    return () => {
      for (const obs of observers) {
        obs.disconnect();
      }
    };
  }, [years]);

  return (
    <>
      {/* Desktop — vertical right-edge scrubber */}
      <nav className="fixed top-1/2 right-6 z-30 hidden -translate-y-1/2 md:block">
        <ul className="flex flex-col items-end gap-3">
          {years.map((year) => {
            const isActive = year === activeYear;
            return (
              <li key={year}>
                <a
                  href={`#year-${year}`}
                  className={`flex items-center gap-3 font-sans text-xs tabular-nums transition-colors ${isActive ? "text-[#f4ede1]" : "text-[#404040] hover:text-[#737373]"}`}
                >
                  <span
                    className={`h-px transition-all ${isActive ? "w-6 bg-[#f4ede1]" : "w-2 bg-[#404040]"}`}
                  />
                  {year}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Mobile — sticky horizontal strip at the top while manifest is in view */}
      <nav className="sticky top-12 z-30 -mx-6 mb-6 border-y border-[#1a1a1a] bg-[#0a0a0a]/95 backdrop-blur-sm md:hidden">
        <ul className="flex items-center justify-center gap-1 px-6 py-3 font-sans text-xs tabular-nums">
          {years.map((year, i) => {
            const isActive = year === activeYear;
            return (
              <li key={year} className="flex items-center">
                {i > 0 && <span className="mx-1 text-[#404040]">·</span>}
                <a
                  href={`#year-${year}`}
                  className={`flex flex-col items-center gap-0.5 transition-colors ${isActive ? "text-[#f4ede1]" : "text-[#525252]"}`}
                >
                  <span>{year}</span>
                  <span
                    className={`h-px transition-all ${isActive ? "w-4 bg-[#f4ede1]" : "w-0 bg-transparent"}`}
                  />
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
