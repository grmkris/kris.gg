"use client";

import { useEffect, useState } from "react";

interface Props {
  years: string[];
}

export function YearRuler({ years }: Props) {
  const [activeYear, setActiveYear] = useState(years[0] ?? "");

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    for (const year of years) {
      const element = document.getElementById(`year-${year}`);
      if (!element) {
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
      observer.observe(element);
      observers.push(observer);
    }
    return () => observers.forEach((observer) => observer.disconnect());
  }, [years]);

  return (
    <nav aria-label="Journal years" className="public-year-ruler">
      {years.map((year) => (
        <a
          aria-current={year === activeYear ? "true" : undefined}
          className={year === activeYear ? "is-active" : undefined}
          href={`#year-${year}`}
          key={year}
        >
          {year}
        </a>
      ))}
    </nav>
  );
}
