export interface JournalPost {
  slug: string;
  title: string;
  date: string;
  location: string;
  summary: string;
  body: string;
  photos?: string[];
  relatedTimeline?: string;
}

export const POSTS: JournalPost[] = [
  {
    slug: "shanghai-mu-2026",
    title: "MU Shanghai",
    date: "2026-05",
    location: "Shanghai",
    summary: "A month in Shanghai for muShanghai.",
    body: `A month at [muShanghai](https://mushanghai.xyz/) — builders-only unconference in Minhang. Weekly themes: AI → Biotech → Robotics → Culture.

Direct in from Venice. Hi Cozy near the Bund. Quick detour to a festival in Beijing mid-month.

Exit is SH → NYC, straight into ETHGlobal.`,
    photos: [
      "/photos/shanghai-mu-2026/01.jpg",
      "/photos/shanghai-mu-2026/02.jpg",
      "/photos/shanghai-mu-2026/03.jpg",
      "/photos/shanghai-mu-2026/04.jpg",
      "/photos/shanghai-mu-2026/05.jpg",
      "/photos/shanghai-mu-2026/06.jpg",
      "/photos/shanghai-mu-2026/07.jpg",
      "/photos/shanghai-mu-2026/08.jpg",
      "/photos/shanghai-mu-2026/09.jpg",
    ],
  },
];
