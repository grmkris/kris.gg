import  { type ReactNode } from "react";

import { codeToHtml } from "shiki";

const FENCE = /```(\w+)?\n([\s\S]*?)```/g;
const INLINE = /(\[[^\]]+\]\([^)]+\))|(`[^`]+`)/g;
const LINK = /^\[([^\]]+)\]\(([^)]+)\)$/;

function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  INLINE.lastIndex = 0;
  // biome-ignore lint/suspicious/noAssignInExpressions: tokenizer loop
  while ((m = INLINE.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(text.slice(last, m.index));
    }
    const tok = m[0];
    if (tok.startsWith("`")) {
      parts.push(
        <code
          className="rounded bg-[#1a1a1a] px-1.5 py-0.5 font-mono text-[0.85em] text-[#e8e8e8]"
          key={`i-${key}`}
        >
          {tok.slice(1, -1)}
        </code>
      );
    } else {
      const lm = LINK.exec(tok);
      if (lm) {
        const href = lm[2];
        const internal = href.startsWith("/");
        parts.push(
          <a
            className="text-[#f4ede1] underline decoration-[#525252] underline-offset-4 transition-colors hover:decoration-[#a3a3a3]"
            href={href}
            key={`i-${key}`}
            {...(internal
              ? {}
              : { rel: "noopener noreferrer", target: "_blank" })}
          >
            {lm[1]}
          </a>
        );
      }
    }
    key++;
    last = m.index + tok.length;
  }
  if (last < text.length) {
    parts.push(text.slice(last));
  }
  return parts;
}

interface Segment {
  type: "prose" | "code";
  lang?: string;
  text: string;
}

function splitSegments(body: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  FENCE.lastIndex = 0;
  // biome-ignore lint/suspicious/noAssignInExpressions: tokenizer loop
  while ((m = FENCE.exec(body)) !== null) {
    if (m.index > lastIndex) {
      segments.push({ text: body.slice(lastIndex, m.index), type: "prose" });
    }
    segments.push({
      lang: m[1] ?? "ts",
      text: m[2].replace(/\n$/, ""),
      type: "code",
    });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < body.length) {
    segments.push({ text: body.slice(lastIndex), type: "prose" });
  }
  return segments;
}

export async function renderNoteBody(body: string): Promise<ReactNode[]> {
  const segments = splitSegments(body);
  const out: ReactNode[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.type === "code") {
      const html = await codeToHtml(seg.text, {
        lang: seg.lang ?? "ts",
        theme: "vesper",
      });
      out.push(
        <div
          // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted build-time Shiki output
          dangerouslySetInnerHTML={{ __html: html }}
          className="my-7 overflow-x-auto rounded-md border border-[#1f1f1f] text-[0.82rem] leading-relaxed [&_pre]:p-5 [&_pre]:!bg-[#0d0d0d]"
          key={`seg-${i}`}
        />
      );
    } else {
      const paras = seg.text
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter(Boolean);
      for (let j = 0; j < paras.length; j++) {
        out.push(
          <p
            className="mt-5 font-display text-[1.0625rem] leading-[1.75] text-[#c4bdb1]"
            key={`seg-${i}-p-${j}`}
          >
            {renderInline(paras[j])}
          </p>
        );
      }
    }
  }
  return out;
}
