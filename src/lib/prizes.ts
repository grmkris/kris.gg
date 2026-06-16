/**
 * Parses a Trip's `prizes` string into its best placement, or returns null
 * when the prizes are pool/category-only with no numeric rank.
 *
 * Survey of all 17 prize strings in src/content/trips.ts informed the
 * supported patterns:
 *   - "{sponsor} {Winner|1st|2nd|3rd|4th}( Place)?"  → numeric rank, sponsor optional
 *   - "{1st|2nd|3rd|4th} Place"                      → numeric rank (no sponsor)
 *   - Anything else ("X Pool", "X Prize", "Best Public Goods", "5 prizes")
 *                                                    → ignored for the tag
 *
 * Best (lowest) rank wins. If 2+ tokens share the best rank, render as
 * "{n}× {RANK}" (e.g. "2× 2ND"). Otherwise just "{RANK}".
 */

const RANK_WORDS: Record<string, number> = {
  "1st": 1,
  "2nd": 2,
  "3rd": 3,
  "4th": 4,
  winner: 1,
};

const RANK_LABEL: Record<number, string> = {
  1: "1ST",
  2: "2ND",
  3: "3RD",
  4: "4TH",
};

interface Placement {
  display: string;
  rank: number;
}

function tokenRank(token: string): number | null {
  // Try sponsor + place pattern OR bare place pattern.
  // Use \b to anchor on word boundary so we don't match "1st" inside "21st".
  const m = /\b(Winner|1st|2nd|3rd|4th)\b/i.exec(token);
  if (!m) {
    return null;
  }
  return RANK_WORDS[m[1].toLowerCase()] ?? null;
}

export function parsePlacement(
  prizesStr: string | undefined
): Placement | null {
  if (!prizesStr) {
    return null;
  }

  const ranks = prizesStr
    .split(",")
    .map((t) => tokenRank(t.trim()))
    .filter((r): r is number => r !== null);

  if (ranks.length === 0) {
    return null;
  }

  const bestRank = Math.min(...ranks);
  const bestCount = ranks.filter((r) => r === bestRank).length;
  const baseLabel = RANK_LABEL[bestRank];
  if (!baseLabel) {
    return null;
  }

  return {
    display: bestCount > 1 ? `${bestCount}× ${baseLabel}` : baseLabel,
    rank: bestRank,
  };
}

export function showcaseLabel(url: string): string {
  if (url.includes("ethglobal.com")) {
    return "ETHGlobal";
  }
  if (url.includes("devfolio.co")) {
    return "Devfolio";
  }
  return "Showcase";
}
