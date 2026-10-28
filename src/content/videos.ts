import media from "@/content/videos.generated.json";

export const VIDEOS = {
  afterlight: {
    ...media.afterlight,
    category: "Music video",
    description:
      "An original electronic track written in Strudel, with AI vocals and a hand-painted animation style.",
    title: "Afterlight",
  },
  "cat-reviews-sidequest": {
    ...media["cat-reviews-sidequest"],
    category: "Character comedy",
    description:
      "My cat, reimagined as an AI character, has opinions about the agents working on Sidequest.",
    title: "A cat reviews Sidequest",
  },
  "why-bees-can-fly": {
    ...media["why-bees-can-fly"],
    category: "Science explainer",
    description:
      "A short explanation of insect flight, mixing AI macro imagery, animated diagrams, and narration.",
    title: "Why bees can fly",
  },
  "valencia-anime": {
    ...media["valencia-anime"],
    category: "Travel remix",
    description:
      "The same Valencia weekend, with real trip shots turning into their AI-painted twins to an original song.",
    title: "València, reimagined",
  },
  "valencia-trip": {
    ...media["valencia-trip"],
    category: "Travel film",
    description:
      "17–19 October 2026. Our own photos and clips, cut to music: city bikes, sunset, and the sea.",
    title: "A weekend in València",
  },
};

export type VideoId = keyof typeof VIDEOS;

export const FEATURED_VIDEOS = [
  "afterlight",
  "cat-reviews-sidequest",
  "why-bees-can-fly",
] as const satisfies readonly VideoId[];
