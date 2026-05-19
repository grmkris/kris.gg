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
      if (!el) continue;
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
      for (const obs of observers) obs.disconnect();
    };
  }, [years]);

  return (
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
  );
}
