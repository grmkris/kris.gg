import "server-only";

/**
 * The two model calls. Both are **strictly optional to correctness**: the
 * pipeline produces a valid, routable result with `fallbackConstraints` alone,
 * so a missing key, a quota error or a malformed generation degrades rather than
 * fails. Nothing here throws.
 *
 * The model never draws a route. It only:
 *   1. adjusts constraints using the free-text note, and
 *   2. explains a route that ORS already computed, from real numbers.
 *
 * ## Schema bridge
 *
 * The AI SDK's `StandardSchema` type is `StandardSchemaV1 & StandardJSONSchemaV1`
 * — validation *and* JSON Schema. Effect exposes those through two separate
 * calls that each `Object.assign` into the same `~standard` key, so both are
 * required; one alone type-errors and throws at runtime.
 */

import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { Schema } from "effect";
import { formatDistance, formatDuration } from "@/lib/route/pace";
import { sanitizeConstraints } from "./constraints-fallback";
import {
  type Poi,
  RouteConstraints,
  type RouteCandidate,
  type RouteInputs,
} from "./schema";

/** Both halves of the Standard Schema contract the AI SDK requires. */
const AI_CONSTRAINTS = Schema.toStandardJSONSchemaV1(
  Schema.toStandardSchemaV1(RouteConstraints)
);

const Explanation = Schema.Struct({
  title: Schema.String.annotate({
    description:
      "A short, specific name for this route, at most 5 words. No quotes.",
  }),
  why: Schema.Array(Schema.String).annotate({
    description:
      "2-4 short bullets explaining why this route suits the request. Each under 15 words. Reference only the facts given — never invent a street, landmark or business.",
  }),
});

const AI_EXPLANATION = Schema.toStandardJSONSchemaV1(
  Schema.toStandardSchemaV1(Explanation)
);

const modelId = (): string =>
  process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

const hasKey = (): boolean => {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  return key !== undefined && key !== "";
};

/**
 * Refine constraints with the user's free-text note. Returns `fallback`
 * untouched when there is no note worth reading, no API key, or anything goes
 * wrong — the note is the only thing the model adds here.
 */
export const refineConstraints = async (
  inputs: RouteInputs,
  fallback: RouteConstraints
): Promise<RouteConstraints> => {
  const note = inputs.notes?.trim() ?? "";
  if (note === "" || !hasKey()) {
    return fallback;
  }

  try {
    const result = await generateText({
      maxRetries: 1,
      model: google(modelId()),
      output: Output.object({ schema: AI_CONSTRAINTS }),
      prompt: [
        "You are configuring a route-generation engine. You do NOT draw routes.",
        "Adjust the routing constraints below to honour the user's note.",
        "",
        `Activity: ${inputs.activity}`,
        `Requested distance: ${inputs.distanceKm} km`,
        `Vibe: ${inputs.mood}`,
        `User note: ${note}`,
        "",
        `Current constraints: ${JSON.stringify(fallback)}`,
        "",
        "Rules you must not break:",
        "- green and quiet apply ONLY to foot-* profiles. For cycling-* they must be null.",
        "- steepnessDifficulty applies ONLY to cycling-* profiles. For foot-* it must be null.",
        "- Keep lengthM as given; the user set the distance explicitly.",
        "- Change only what the note actually implies. Otherwise return the constraints unchanged.",
      ].join("\n"),
      temperature: 0,
    });

    // Sanitize regardless: the model is told the foot/cycling rule but cannot be
    // trusted with it, and one wrong field is a hard 400 from ORS.
    return sanitizeConstraints(result.output as RouteConstraints, inputs);
  } catch {
    return fallback;
  }
};

export type Explanation = {
  readonly title: string;
  readonly why: readonly string[];
};

/** Deterministic name, used when the model is unavailable. */
export const fallbackTitle = (
  inputs: RouteInputs,
  candidate: RouteCandidate
): string =>
  `${formatDistance(candidate.stats.distanceM)} ${inputs.mood} ${inputs.activity}`;

/**
 * Explain a route that already exists, grounded in its real statistics and the
 * POIs actually found near it. The prompt carries only facts, so the model has
 * nothing to hallucinate from.
 */
export const explainRoute = async (options: {
  readonly candidate: RouteCandidate;
  readonly durationS: number;
  readonly inputs: RouteInputs;
  readonly pois: readonly Poi[];
}): Promise<Explanation> => {
  const { candidate, durationS, inputs, pois } = options;
  const fallback: Explanation = {
    title: fallbackTitle(inputs, candidate),
    why: [],
  };

  if (!hasKey()) {
    return fallback;
  }

  const poiLines = pois
    .slice(0, 12)
    .map(
      (poi) =>
        `- ${poi.name ?? poi.category} (${poi.category}) at ${(poi.atMeters / 1000).toFixed(1)} km`
    )
    .join("\n");

  try {
    const result = await generateText({
      maxRetries: 1,
      model: google(modelId()),
      output: Output.object({ schema: AI_EXPLANATION }),
      prompt: [
        "Describe a route that has already been generated. Use ONLY the facts below.",
        "Never invent a street name, landmark, business or view that is not listed.",
        "",
        `The user asked for: a ${inputs.distanceKm} km ${inputs.mood} ${inputs.activity}.`,
        inputs.notes === undefined ? "" : `They added: ${inputs.notes}`,
        "",
        "What was generated:",
        `- Distance: ${formatDistance(candidate.stats.distanceM)}`,
        `- Estimated time: ${formatDuration(durationS)}`,
        `- Ascent: ${Math.round(candidate.stats.ascentM)} m`,
        `- It is a loop returning to the start.`,
        "",
        pois.length === 0
          ? "No points of interest were found near this route. Do not mention any."
          : `Points of interest actually found along it:\n${poiLines}`,
      ]
        .filter((line) => line !== "")
        .join("\n"),
      temperature: 0.4,
    });

    const output = result.output as Explanation;
    const title = output.title.trim();

    return {
      title: title === "" ? fallback.title : title,
      why: output.why.filter((line) => line.trim() !== ""),
    };
  } catch {
    return fallback;
  }
};
